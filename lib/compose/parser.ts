/**
 * @project  ComposePermit — github.com/uvindev/compose-permit
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import { parseAllDocuments } from "yaml";
import { ZodError } from "zod";
import { MAX_COMPOSE_BYTES, composeTextSchema } from "@/lib/schemas/compose";
import type {
  ComposeEvidence,
  MountEvidence,
  MountKind,
  ParseResult,
  PortEvidence,
  ServiceEvidence,
} from "@/lib/types";

const SOCKET_NAMES = [
  "docker.sock",
  "containerd.sock",
  "crio.sock",
  "podman.sock",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function strings(value: unknown): string[] {
  return list(value)
    .filter(
      (entry): entry is string | number =>
        typeof entry === "string" || typeof entry === "number",
    )
    .map(String)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
}

function referenceNames(value: unknown): string[] {
  return list(value)
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (isRecord(entry) && typeof entry.source === "string")
        return entry.source;
      return null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .sort();
}

function sourceKind(
  source: string,
  target: string,
  forcedBind = false,
): MountKind {
  const joined = `${source} ${target}`.toLowerCase();
  if (joined.includes("docker.sock")) return "docker-socket";
  if (SOCKET_NAMES.some((name) => joined.includes(name)))
    return "runtime-socket";
  if (
    source === "/" ||
    source === "/var" ||
    source === "/run" ||
    source === "/var/run"
  ) {
    return "host-root";
  }
  if (source.startsWith("/")) return "absolute-bind";
  if (source.startsWith(".") || source.startsWith("~")) return "relative-bind";
  if (forcedBind) return "relative-bind";
  if (source) return "named-volume";
  return "anonymous";
}

function parseMount(entry: unknown, index: number): MountEvidence | null {
  if (typeof entry === "string") {
    const parts = entry.split(":");
    const source = parts.length > 1 ? parts[0] : "";
    const target = parts.length > 1 ? parts[1] : parts[0];
    const mode = parts.slice(2).join(":");
    return {
      key: `short:${source}:${target}`,
      kind: sourceKind(source, target),
      readOnly: mode.split(",").includes("ro"),
    };
  }

  if (!isRecord(entry)) return null;
  const source = typeof entry.source === "string" ? entry.source : "";
  const target = typeof entry.target === "string" ? entry.target : "";
  const type =
    typeof entry.type === "string"
      ? entry.type
      : source
        ? "volume"
        : "anonymous";
  const readOnly = entry.read_only === true;
  const key = `long:${type}:${source}:${target}`;
  return {
    key: key || `mount:${index}`,
    kind: sourceKind(source, target, type === "bind"),
    readOnly,
  };
}

function normalizeHostIp(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPublicHost(hostIp: string): boolean {
  return (
    hostIp === "" ||
    hostIp === "0.0.0.0" ||
    hostIp === "::" ||
    hostIp === "[::]"
  );
}

function parsePort(entry: unknown, index: number): PortEvidence | null {
  if (typeof entry === "number") {
    const port = String(entry);
    return {
      key: `container:${port}`,
      published: "not published",
      target: port,
      protocol: "tcp",
      publicHost: false,
    };
  }

  if (typeof entry === "string") {
    const [address, protocol = "tcp"] = entry.split("/");
    const parts = address.split(":");
    if (parts.length === 1) {
      return {
        key: `container:${entry}`,
        published: "not published",
        target: parts[0],
        protocol,
        publicHost: false,
      };
    }
    const target = parts.at(-1) ?? "unknown";
    const published = parts.at(-2) ?? "unknown";
    const hostIp =
      parts.length > 2
        ? parts
            .slice(0, -2)
            .join(":")
            .replace(/^\[|\]$/g, "")
        : "";
    return {
      key: `short:${entry}`,
      published,
      target,
      protocol,
      publicHost: isPublicHost(hostIp),
    };
  }

  if (!isRecord(entry)) return null;
  const published =
    entry.published === undefined ? "not published" : String(entry.published);
  const target = entry.target === undefined ? "unknown" : String(entry.target);
  const protocol = typeof entry.protocol === "string" ? entry.protocol : "tcp";
  const hostIp = normalizeHostIp(entry.host_ip);
  return {
    key: `long:${hostIp}:${published}:${target}:${protocol}:${index}`,
    published,
    target,
    protocol,
    publicHost: published !== "not published" && isPublicHost(hostIp),
  };
}

function securityOptions(value: unknown): string[] {
  return strings(value).map((entry) => entry.toLowerCase().replace(/=/g, ":"));
}

function serviceFileReads(service: Record<string, unknown>): string[] {
  const reads: string[] = [];
  if (service.env_file !== undefined)
    reads.push(
      ...strings(service.env_file).map((entry) => `env_file:${entry}`),
    );
  if (service.extends !== undefined) {
    const value = service.extends;
    if (typeof value === "string") reads.push(`extends:${value}`);
    if (isRecord(value) && typeof value.file === "string")
      reads.push(`extends:${value.file}`);
  }
  if (service.build !== undefined) {
    const build = service.build;
    if (typeof build === "string") reads.push(`build:${build}`);
    if (isRecord(build) && typeof build.context === "string")
      reads.push(`build:${build.context}`);
  }
  return reads.sort();
}

function normalizeService(name: string, value: unknown): ServiceEvidence {
  const service = isRecord(value) ? value : {};
  const mounts = list(service.volumes)
    .map(parseMount)
    .filter((entry): entry is MountEvidence => entry !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
  const ports = list(service.ports)
    .map(parsePort)
    .filter((entry): entry is PortEvidence => entry !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
  const options = securityOptions(service.security_opt);
  const networkMode =
    typeof service.network_mode === "string"
      ? service.network_mode.toLowerCase()
      : "";
  const pid = typeof service.pid === "string" ? service.pid.toLowerCase() : "";
  const ipc = typeof service.ipc === "string" ? service.ipc.toLowerCase() : "";

  return {
    name,
    privileged: service.privileged === true,
    hostNetwork: networkMode === "host",
    hostPid: pid === "host",
    hostIpc: ipc === "host",
    provider:
      isRecord(service.provider) && typeof service.provider.type === "string",
    capabilitiesAdded: strings(service.cap_add).map((entry) =>
      entry.toUpperCase(),
    ),
    capabilitiesDropped: strings(service.cap_drop).map((entry) =>
      entry.toUpperCase(),
    ),
    devices: strings(service.devices),
    mounts,
    ports,
    explicitUser:
      typeof service.user === "string" || typeof service.user === "number"
        ? String(service.user).trim()
        : null,
    readOnlyRoot: service.read_only === true,
    noNewPrivileges: options.some(
      (entry) => entry === "no-new-privileges:true",
    ),
    fileReads: serviceFileReads(service),
    secretGrants: referenceNames(service.secrets),
    configGrants: referenceNames(service.configs),
  };
}

function topLevelFileReads(root: Record<string, unknown>): string[] {
  const reads: string[] = [];
  for (const sectionName of ["secrets", "configs"] as const) {
    const section = root[sectionName];
    if (!isRecord(section)) continue;
    for (const [name, definition] of Object.entries(section)) {
      if (isRecord(definition) && typeof definition.file === "string") {
        reads.push(`${sectionName}:${name}:${definition.file}`);
      }
    }
  }
  return reads.sort();
}

function includeReferences(value: unknown): string[] {
  return list(value)
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (isRecord(entry) && typeof entry.path === "string") return entry.path;
      return null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .sort();
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function parseComposeSource(
  source: string,
  side: "baseline" | "candidate",
): ParseResult {
  try {
    composeTextSchema.parse(source);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message
        : "The Compose document is invalid.";
    return {
      evidence: null,
      issues: [
        { side, message: message ?? "The Compose document is invalid." },
      ],
    };
  }

  if (byteLength(source) > MAX_COMPOSE_BYTES) {
    return {
      evidence: null,
      issues: [
        { side, message: "The Compose document exceeds the 1 MiB byte limit." },
      ],
    };
  }
  if (source.includes("\0")) {
    return {
      evidence: null,
      issues: [{ side, message: "The Compose document contains a NUL byte." }],
    };
  }

  const documents = parseAllDocuments(source, {
    strict: true,
    uniqueKeys: true,
    version: "1.2",
  });
  if (documents.length !== 1) {
    return {
      evidence: null,
      issues: [
        { side, message: "Provide exactly one YAML document per side." },
      ],
    };
  }

  const document = documents[0];
  if (document.errors.length > 0) {
    const line = document.errors[0]?.linePos?.[0]?.line;
    return {
      evidence: null,
      issues: [
        {
          side,
          message: line
            ? `YAML parsing failed near line ${line}.`
            : "YAML parsing failed.",
        },
      ],
    };
  }

  let root: unknown;
  try {
    root = document.toJS({ maxAliasCount: 25 });
  } catch {
    return {
      evidence: null,
      issues: [
        { side, message: "YAML alias expansion exceeds the safe limit." },
      ],
    };
  }

  if (!isRecord(root)) {
    return {
      evidence: null,
      issues: [
        { side, message: "The Compose document must be a YAML mapping." },
      ],
    };
  }
  if (!isRecord(root.services) || Object.keys(root.services).length === 0) {
    return {
      evidence: null,
      issues: [{ side, message: "No services mapping was found." }],
    };
  }

  const services = Object.fromEntries(
    Object.entries(root.services)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, service]) => [name, normalizeService(name, service)]),
  );
  const evidence: ComposeEvidence = {
    services,
    includes: includeReferences(root.include),
    projectFileReads: topLevelFileReads(root),
  };
  return { evidence, issues: [] };
}
