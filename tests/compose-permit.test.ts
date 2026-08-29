import { describe, expect, it } from "vitest";
import { compareComposeEvidence } from "@/lib/compose/analyze";
import { parseComposeSource } from "@/lib/compose/parser";
import { buildMarkdownReview } from "@/lib/compose/report";
import { MAX_COMPOSE_BYTES } from "@/lib/schemas/compose";

const minimal = `services:
  web:
    image: example/web:1
`;

function evidence(source: string) {
  const result = parseComposeSource(source, "candidate");
  expect(result.issues).toEqual([]);
  expect(result.evidence).not.toBeNull();
  return result.evidence!;
}

function compare(baseline: string, candidate: string) {
  return compareComposeEvidence(evidence(baseline), evidence(candidate));
}

describe("Compose parser", () => {
  it("parses a minimal Compose service", () => {
    const result = parseComposeSource(minimal, "baseline");
    expect(Object.keys(result.evidence?.services ?? {})).toEqual(["web"]);
  });

  it("rejects an empty document with its side", () => {
    const result = parseComposeSource("", "baseline");
    expect(result.issues).toEqual([
      { side: "baseline", message: "Paste or load a Compose document." },
    ]);
  });

  it("rejects a document beyond the character limit", () => {
    const result = parseComposeSource(
      "x".repeat(MAX_COMPOSE_BYTES + 1),
      "candidate",
    );
    expect(result.issues[0]?.message).toContain("1 MiB character limit");
  });

  it("rejects a multibyte document beyond the byte limit", () => {
    const source = `${minimal}\n# ${"界".repeat(360_000)}`;
    expect(source.length).toBeLessThan(MAX_COMPOSE_BYTES);
    const result = parseComposeSource(source, "candidate");
    expect(result.issues[0]?.message).toContain("1 MiB byte limit");
  });

  it("rejects a NUL byte", () => {
    const result = parseComposeSource(`${minimal}\0`, "candidate");
    expect(result.issues[0]?.message).toContain("NUL byte");
  });

  it("rejects multiple YAML documents", () => {
    const result = parseComposeSource(
      `${minimal}\n---\n${minimal}`,
      "candidate",
    );
    expect(result.issues[0]?.message).toBe(
      "Provide exactly one YAML document per side.",
    );
  });

  it("rejects duplicate mapping keys without echoing source", () => {
    const result = parseComposeSource(
      `services:\n  web:\n    image: one\n    image: private-value\n`,
      "candidate",
    );
    expect(result.issues[0]?.message).toMatch(
      /^YAML parsing failed near line \d+\.$/,
    );
    expect(result.issues[0]?.message).not.toContain("private-value");
  });

  it("rejects malformed YAML without echoing source", () => {
    const result = parseComposeSource(
      `services:\n  web: [private-value`,
      "candidate",
    );
    expect(result.issues[0]?.message).toContain("YAML parsing failed");
    expect(result.issues[0]?.message).not.toContain("private-value");
  });

  it("requires a non-empty services mapping", () => {
    const result = parseComposeSource("name: demo\n", "candidate");
    expect(result.issues[0]?.message).toBe("No services mapping was found.");
  });

  it("limits YAML alias expansion", () => {
    const aliases = Array.from(
      { length: 30 },
      (_, index) => `  service_${index}: *service`,
    ).join("\n");
    const result = parseComposeSource(
      `template: &service\n  image: alpine\nservices:\n${aliases}\n`,
      "candidate",
    );
    expect(result.issues[0]?.message).toBe(
      "YAML alias expansion exceeds the safe limit.",
    );
  });

  it("normalizes short mounts and public ports", () => {
    const parsed = evidence(`services:
  web:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - data:/data
    ports:
      - "8080:80"
      - "127.0.0.1:9090:90"
`);
    expect(
      parsed.services.web.mounts.map((mount) => [mount.kind, mount.readOnly]),
    ).toEqual([
      ["docker-socket", true],
      ["named-volume", false],
    ]);
    expect(parsed.services.web.ports.map((port) => port.publicHost)).toEqual([
      false,
      true,
    ]);
  });

  it("recognizes long-syntax relative bind mounts", () => {
    const parsed = evidence(`services:
  web:
    volumes:
      - type: bind
        source: source-code
        target: /app
        read_only: true
`);
    expect(parsed.services.web.mounts[0]).toMatchObject({
      kind: "relative-bind",
      readOnly: true,
    });
  });

  it("does not retain environment values in normalized evidence", () => {
    const parsed = evidence(`services:
  web:
    environment:
      PRIVATE_TOKEN: should-not-survive
    env_file: .env.production
`);
    expect(JSON.stringify(parsed)).not.toContain("should-not-survive");
    expect(parsed.services.web.fileReads).toEqual(["env_file:.env.production"]);
  });

  it("normalizes provider and runtime-hardening fields", () => {
    const parsed = evidence(`services:
  worker:
    provider:
      type: worker-provider
    user: "1001:1001"
    read_only: true
    security_opt:
      - no-new-privileges=true
`);
    expect(parsed.services.worker).toMatchObject({
      provider: true,
      explicitUser: "1001:1001",
      readOnlyRoot: true,
      noNewPrivileges: true,
    });
  });
});

describe("authority comparison", () => {
  it("reports privileged mode as high expanded authority", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    image: example/web:1\n    privileged: true\n`,
    );
    expect(result.findings[0]).toMatchObject({
      rule: "privileged",
      severity: "high",
      direction: "expanded",
    });
  });

  it("reports privileged removal as reduced authority", () => {
    const result = compare(
      `services:\n  web:\n    privileged: true\n`,
      minimal,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ rule: "privileged", direction: "reduced" }),
    );
  });

  it("reports host namespace changes", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    network_mode: host\n    pid: host\n    ipc: host\n`,
    );
    expect(
      result.findings
        .filter((item) => item.severity === "high")
        .map((item) => item.rule),
    ).toEqual(["host-ipc", "host-network", "host-pid"]);
  });

  it("grades elevated capabilities above ordinary capabilities", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    cap_add: [NET_BIND_SERVICE, SYS_ADMIN]\n`,
    );
    expect(
      result.findings.find((item) => item.rule === "cap-add:SYS_ADMIN")
        ?.severity,
    ).toBe("high");
    expect(
      result.findings.find((item) => item.rule === "cap-add:NET_BIND_SERVICE")
        ?.severity,
    ).toBe("medium");
  });

  it("reports removal of cap_drop ALL as high expansion", () => {
    const result = compare(`services:\n  web:\n    cap_drop: [ALL]\n`, minimal);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "cap-drop-removed",
        severity: "high",
        direction: "expanded",
      }),
    );
  });

  it("reports added and removed devices", () => {
    const expanded = compare(
      minimal,
      `services:\n  web:\n    devices: [/dev/kvm:/dev/kvm]\n`,
    );
    const reduced = compare(
      `services:\n  web:\n    devices: [/dev/kvm:/dev/kvm]\n`,
      minimal,
    );
    expect(expanded.findings).toContainEqual(
      expect.objectContaining({ rule: "devices-added", severity: "high" }),
    );
    expect(reduced.findings).toContainEqual(
      expect.objectContaining({
        rule: "devices-removed",
        direction: "reduced",
      }),
    );
  });

  it("treats a read-only Docker socket mount as high authority", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    volumes: [/var/run/docker.sock:/var/run/docker.sock:ro]\n`,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "mount-added:docker-socket",
        severity: "high",
        after: "read-only mount",
      }),
    );
  });

  it("reports broad host and ordinary bind mounts separately", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    volumes: [/:/host:ro, ./src:/app:ro]\n`,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "mount-added:host-root",
        severity: "high",
      }),
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "mount-added:relative-bind",
        severity: "medium",
      }),
    );
  });

  it("reports an existing bind mount becoming writable", () => {
    const baseline = `services:\n  web:\n    volumes: [./src:/app:ro]\n`;
    const candidate = `services:\n  web:\n    volumes: [./src:/app:rw]\n`;
    const result = compare(baseline, candidate);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "mount-write:relative-bind",
        direction: "expanded",
      }),
    );
  });

  it("reports only newly public port bindings", () => {
    const result = compare(
      `services:\n  web:\n    ports: ["127.0.0.1:8080:80"]\n`,
      `services:\n  web:\n    ports: ["127.0.0.1:8080:80", "9090:90"]\n`,
    );
    const portFindings = result.findings.filter((item) =>
      item.rule.startsWith("public-port"),
    );
    expect(portFindings).toHaveLength(1);
    expect(portFindings[0]?.after).toBe("public 9090/tcp");
  });

  it("reports removal of an explicit non-root user", () => {
    const result = compare(
      `services:\n  web:\n    user: "1000:1000"\n`,
      minimal,
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "non-root-removed",
        direction: "expanded",
      }),
    );
  });

  it("reports root filesystem and no-new-privileges changes", () => {
    const baseline = `services:\n  web:\n    read_only: true\n    security_opt: [no-new-privileges:true]\n`;
    const result = compare(baseline, minimal);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "read-only-root",
        direction: "expanded",
      }),
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "no-new-privileges",
        direction: "expanded",
      }),
    );
  });

  it("reports added file-reading surfaces without exposing paths in details", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    env_file: .private.env\n    build: ./internal/source\n`,
    );
    const item = result.findings.find(
      (finding) => finding.rule === "file-reads-added",
    );
    expect(item?.detail).not.toContain(".private.env");
    expect(item?.detail).not.toContain("internal/source");
  });

  it("reports service secret and config grants", () => {
    const result = compare(
      minimal,
      `services:\n  web:\n    secrets: [token]\n    configs: [app-config]\n`,
    );
    expect(result.findings.map((item) => item.rule)).toEqual(
      expect.arrayContaining(["secret-grants-added", "config-grants-added"]),
    );
  });

  it("reports project includes and file-backed material", () => {
    const result = compare(
      minimal,
      `include: [./private.compose.yaml]\nservices:\n  web:\n    image: example/web:1\nsecrets:\n  token:\n    file: ./token.txt\n`,
    );
    expect(result.findings.map((item) => item.rule)).toEqual(
      expect.arrayContaining(["include-added", "project-file-read-added"]),
    );
    expect(JSON.stringify(result.findings)).not.toContain(
      "private.compose.yaml",
    );
    expect(JSON.stringify(result.findings)).not.toContain("token.txt");
  });

  it("does not invent hardening regressions when a service is removed", () => {
    const baseline = `services:\n  worker:\n    read_only: true\n    security_opt: [no-new-privileges:true]\n`;
    const result = compare(baseline, minimal);
    const workerFindings = result.findings.filter(
      (item) => item.service === "worker",
    );
    expect(workerFindings).toHaveLength(1);
    expect(workerFindings[0]?.rule).toBe("service-removed");
  });

  it("sorts findings deterministically by severity and rule", () => {
    const candidate = `services:\n  web:\n    privileged: true\n    network_mode: host\n    ports: ["8080:80"]\n`;
    const first = compare(minimal, candidate);
    const second = compare(minimal, candidate);
    expect(first).toEqual(second);
    expect(first.findings.map((item) => item.severity)).toEqual([
      "high",
      "high",
      "medium",
    ]);
  });

  it("returns a clean state for identical evidence", () => {
    const result = compare(minimal, minimal);
    expect(result.findings).toEqual([]);
    expect(result.summary).toMatchObject({
      changedServices: 0,
      expanded: 0,
      reduced: 0,
      high: 0,
    });
  });
});

describe("Markdown review", () => {
  it("renders the clean state and source-tool boundary", () => {
    const markdown = buildMarkdownReview(compare(minimal, minimal));
    expect(markdown).toContain(
      "No reviewed Compose authority changes were found.",
    );
    expect(markdown).toContain("docker compose config");
  });

  it("renders findings without source YAML or environment values", () => {
    const candidate = `services:\n  private_service:\n    privileged: true\n    environment:\n      PRIVATE_TOKEN: never-export-this\n`;
    const markdown = buildMarkdownReview(compare(minimal, candidate));
    expect(markdown).toContain("Privileged mode was enabled");
    expect(markdown).not.toContain("never-export-this");
    expect(markdown).not.toContain("PRIVATE_TOKEN");
    expect(markdown).not.toContain("services:\n  private_service");
  });

  it("escapes table separators in service names", () => {
    const result = compare(
      minimal,
      `services:\n  "worker|host":\n    privileged: true\n`,
    );
    expect(buildMarkdownReview(result)).toContain("worker\\|host");
  });
});
