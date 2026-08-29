/**
 * @project  ComposePermit — github.com/uvindev/compose-permit
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type {
  ComparisonResult,
  ComposeEvidence,
  Direction,
  Finding,
  MountEvidence,
  ServiceEvidence,
  Severity,
} from "@/lib/types";

const ELEVATED_CAPABILITIES = new Set([
  "ALL",
  "SYS_ADMIN",
  "SYS_MODULE",
  "SYS_PTRACE",
  "NET_ADMIN",
  "DAC_READ_SEARCH",
  "DAC_OVERRIDE",
]);

const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const directionRank: Record<Direction, number> = {
  expanded: 0,
  changed: 1,
  reduced: 2,
};

function difference(after: string[], before: string[]): string[] {
  const baseline = new Set(before);
  return after.filter((entry) => !baseline.has(entry));
}

function addedByKey<T extends { key: string }>(after: T[], before: T[]): T[] {
  const baseline = new Set(before.map((entry) => entry.key));
  return after.filter((entry) => !baseline.has(entry.key));
}

function finding(
  service: string,
  rule: string,
  severity: Severity,
  direction: Direction,
  title: string,
  detail: string,
  before: string,
  after: string,
  recommendation: string,
): Finding {
  return {
    id: `${service}:${rule}:${direction}`,
    service,
    rule,
    severity,
    direction,
    title,
    detail,
    before,
    after,
    recommendation,
  };
}

function mountLabel(mount: MountEvidence): string {
  const labels: Record<MountEvidence["kind"], string> = {
    "docker-socket": "Docker control socket",
    "runtime-socket": "container runtime socket",
    "host-root": "broad host directory",
    "absolute-bind": "absolute host bind",
    "relative-bind": "relative host bind",
    "named-volume": "named volume",
    anonymous: "anonymous volume",
  };
  return labels[mount.kind];
}

function compareBoolean(
  findings: Finding[],
  service: string,
  rule: string,
  before: boolean,
  after: boolean,
  severity: Severity,
  title: string,
  detail: string,
  recommendation: string,
) {
  if (before === after) return;
  findings.push(
    finding(
      service,
      rule,
      after ? severity : "low",
      after ? "expanded" : "reduced",
      after ? title : `${title} removed`,
      after ? detail : `The candidate removes this authority from ${service}.`,
      before ? "enabled" : "disabled",
      after ? "enabled" : "disabled",
      after
        ? recommendation
        : "Confirm the service still operates with the reduced authority.",
    ),
  );
}

function compareService(
  before: ServiceEvidence,
  after: ServiceEvidence,
): Finding[] {
  const findings: Finding[] = [];
  compareBoolean(
    findings,
    after.name,
    "privileged",
    before.privileged,
    after.privileged,
    "high",
    "Privileged mode was enabled",
    "Docker gives the service broad host-device and capability access.",
    "Require a documented host-level need and test a narrower capability or device grant.",
  );
  compareBoolean(
    findings,
    after.name,
    "host-network",
    before.hostNetwork,
    after.hostNetwork,
    "high",
    "Host network namespace was enabled",
    "The service now shares the host network stack.",
    "Confirm that bridge networking and explicit published ports cannot satisfy the requirement.",
  );
  compareBoolean(
    findings,
    after.name,
    "host-pid",
    before.hostPid,
    after.hostPid,
    "high",
    "Host PID namespace was enabled",
    "The service can observe host processes and loses PID isolation.",
    "Require an explicit operational reason and restrict the image and runtime profile.",
  );
  compareBoolean(
    findings,
    after.name,
    "host-ipc",
    before.hostIpc,
    after.hostIpc,
    "high",
    "Host IPC namespace was enabled",
    "The service now shares host inter-process communication resources.",
    "Confirm the exact IPC dependency and whether a private shareable namespace is sufficient.",
  );
  compareBoolean(
    findings,
    after.name,
    "provider",
    before.provider,
    after.provider,
    "high",
    "External service provider was added",
    "Compose may execute the configured provider binary directly on the host.",
    "Review the provider binary, arguments, installation source, and operator trust before running Compose.",
  );

  const addedCaps = difference(
    after.capabilitiesAdded,
    before.capabilitiesAdded,
  );
  const removedCaps = difference(
    before.capabilitiesAdded,
    after.capabilitiesAdded,
  );
  for (const capability of addedCaps) {
    findings.push(
      finding(
        after.name,
        `cap-add:${capability}`,
        ELEVATED_CAPABILITIES.has(capability) ? "high" : "medium",
        "expanded",
        `${capability} capability was added`,
        "The service receives a Linux capability outside Docker's selected defaults.",
        "not granted",
        "granted",
        "Verify the syscall-level need and add only the narrowest capability required.",
      ),
    );
  }
  if (removedCaps.length > 0) {
    findings.push(
      finding(
        after.name,
        "cap-add-removed",
        "low",
        "reduced",
        `${removedCaps.length} added capability grant${removedCaps.length === 1 ? "" : "s"} removed`,
        "The candidate reduces explicit capability grants.",
        `${before.capabilitiesAdded.length} grants`,
        `${after.capabilitiesAdded.length} grants`,
        "Confirm the service still operates with the smaller capability set.",
      ),
    );
  }

  const removedDrops = difference(
    before.capabilitiesDropped,
    after.capabilitiesDropped,
  );
  const addedDrops = difference(
    after.capabilitiesDropped,
    before.capabilitiesDropped,
  );
  if (removedDrops.length > 0) {
    findings.push(
      finding(
        after.name,
        "cap-drop-removed",
        removedDrops.includes("ALL") ? "high" : "medium",
        "expanded",
        `${removedDrops.length} capability drop${removedDrops.length === 1 ? "" : "s"} removed`,
        "The candidate restores capabilities that the baseline explicitly dropped.",
        `${before.capabilitiesDropped.length} drops`,
        `${after.capabilitiesDropped.length} drops`,
        "Match each removed drop to a documented runtime requirement.",
      ),
    );
  }
  if (addedDrops.length > 0) {
    findings.push(
      finding(
        after.name,
        "cap-drop-added",
        "low",
        "reduced",
        `${addedDrops.length} capability drop${addedDrops.length === 1 ? "" : "s"} added`,
        "The candidate removes more Linux capabilities from the service.",
        `${before.capabilitiesDropped.length} drops`,
        `${after.capabilitiesDropped.length} drops`,
        "Confirm startup and health checks still pass under the tighter capability set.",
      ),
    );
  }

  const addedDevices = difference(after.devices, before.devices);
  const removedDevices = difference(before.devices, after.devices);
  if (addedDevices.length > 0) {
    findings.push(
      finding(
        after.name,
        "devices-added",
        "high",
        "expanded",
        `${addedDevices.length} host device grant${addedDevices.length === 1 ? "" : "s"} added`,
        "The service receives direct access to additional host devices.",
        `${before.devices.length} devices`,
        `${after.devices.length} devices`,
        "Review device permissions and confirm that no narrower interface is available.",
      ),
    );
  }
  if (removedDevices.length > 0) {
    findings.push(
      finding(
        after.name,
        "devices-removed",
        "low",
        "reduced",
        `${removedDevices.length} host device grant${removedDevices.length === 1 ? "" : "s"} removed`,
        "The candidate reduces direct host-device access.",
        `${before.devices.length} devices`,
        `${after.devices.length} devices`,
        "Confirm the reduced device set covers the intended workload.",
      ),
    );
  }

  const addedMounts = addedByKey(after.mounts, before.mounts);
  const removedMounts = addedByKey(before.mounts, after.mounts);
  for (const mount of addedMounts) {
    const control =
      mount.kind === "docker-socket" || mount.kind === "runtime-socket";
    const broad = mount.kind === "host-root";
    const bind =
      mount.kind === "absolute-bind" || mount.kind === "relative-bind";
    if (!control && !broad && !bind) continue;
    findings.push(
      finding(
        after.name,
        `mount-added:${mount.kind}`,
        control || broad ? "high" : "medium",
        "expanded",
        `${mountLabel(mount)} was mounted`,
        control
          ? "A container with socket access can control workloads managed by that runtime. Read-only inode mode does not make the API read-only."
          : broad
            ? "The service receives a broad view of host files and runtime sockets."
            : "The service receives a new host filesystem path.",
        "not mounted",
        mount.readOnly ? "read-only mount" : "writable mount",
        control
          ? "Remove the control socket or place a narrowly authorized proxy between the service and runtime."
          : "Restrict the source path, target, and write mode to the smallest required surface.",
      ),
    );
  }
  const removedRiskyMounts = removedMounts.filter(
    (mount) => !["named-volume", "anonymous"].includes(mount.kind),
  );
  if (removedRiskyMounts.length > 0) {
    findings.push(
      finding(
        after.name,
        "mounts-removed",
        "low",
        "reduced",
        `${removedRiskyMounts.length} host-facing mount${removedRiskyMounts.length === 1 ? "" : "s"} removed`,
        "The candidate reduces service access to host paths or runtime sockets.",
        `${before.mounts.length} mounts`,
        `${after.mounts.length} mounts`,
        "Confirm the service no longer needs the removed host data.",
      ),
    );
  }
  for (const candidateMount of after.mounts) {
    const baselineMount = before.mounts.find(
      (mount) => mount.key === candidateMount.key,
    );
    if (baselineMount?.readOnly && !candidateMount.readOnly) {
      findings.push(
        finding(
          after.name,
          `mount-write:${candidateMount.kind}`,
          candidateMount.kind.includes("socket") ||
            candidateMount.kind === "host-root"
            ? "high"
            : "medium",
          "expanded",
          `${mountLabel(candidateMount)} became writable`,
          "The candidate removes the mount's read-only constraint.",
          "read-only",
          "writable",
          "Keep the mount read-only unless the write path and rollback behavior are documented.",
        ),
      );
    }
  }

  const addedPublicPorts = addedByKey(after.ports, before.ports).filter(
    (port) => port.publicHost,
  );
  for (const port of addedPublicPorts) {
    findings.push(
      finding(
        after.name,
        `public-port:${port.published}:${port.protocol}`,
        "medium",
        "expanded",
        `Host port ${port.published}/${port.protocol} became public`,
        `The candidate publishes container port ${port.target} on all host interfaces.`,
        "not publicly published",
        `public ${port.published}/${port.protocol}`,
        "Bind to a specific trusted interface or place the service behind the intended ingress control.",
      ),
    );
  }

  const baselineNonRoot =
    before.explicitUser !== null &&
    !["0", "root", "0:0", "root:root"].includes(before.explicitUser);
  const candidateRoot =
    after.explicitUser !== null &&
    ["0", "root", "0:0", "root:root"].includes(after.explicitUser);
  if (baselineNonRoot && (candidateRoot || after.explicitUser === null)) {
    findings.push(
      finding(
        after.name,
        "non-root-removed",
        "medium",
        "expanded",
        "Explicit non-root user was removed",
        "The candidate no longer pins this service to the baseline non-root identity.",
        "explicit non-root",
        candidateRoot ? "explicit root" : "image default",
        "Retain the non-root user or verify the image's effective USER and document why root is required.",
      ),
    );
  }
  if (!baselineNonRoot && after.explicitUser !== null && !candidateRoot) {
    findings.push(
      finding(
        after.name,
        "non-root-added",
        "low",
        "reduced",
        "Explicit non-root user was added",
        "The candidate pins the service to a non-root identity.",
        before.explicitUser === null ? "image default" : "explicit root",
        "explicit non-root",
        "Confirm mounted path ownership and startup behavior under the selected identity.",
      ),
    );
  }

  if (before.readOnlyRoot !== after.readOnlyRoot) {
    findings.push(
      finding(
        after.name,
        "read-only-root",
        after.readOnlyRoot ? "low" : "medium",
        after.readOnlyRoot ? "reduced" : "expanded",
        after.readOnlyRoot
          ? "Read-only root filesystem was enabled"
          : "Read-only root filesystem was removed",
        after.readOnlyRoot
          ? "The candidate prevents writes to the container root filesystem."
          : "The candidate restores writes to the container root filesystem.",
        before.readOnlyRoot ? "read-only" : "writable",
        after.readOnlyRoot ? "read-only" : "writable",
        after.readOnlyRoot
          ? "Confirm required writable paths use explicit volumes or tmpfs mounts."
          : "Restore read-only mode or document each path that requires container filesystem writes.",
      ),
    );
  }
  if (before.noNewPrivileges !== after.noNewPrivileges) {
    findings.push(
      finding(
        after.name,
        "no-new-privileges",
        after.noNewPrivileges ? "low" : "medium",
        after.noNewPrivileges ? "reduced" : "expanded",
        after.noNewPrivileges
          ? "No-new-privileges was enabled"
          : "No-new-privileges was removed",
        after.noNewPrivileges
          ? "The candidate blocks processes from gaining additional privileges through exec."
          : "The candidate removes the explicit privilege-escalation constraint.",
        before.noNewPrivileges ? "enabled" : "disabled",
        after.noNewPrivileges ? "enabled" : "disabled",
        after.noNewPrivileges
          ? "Confirm the service still starts under the tighter security option."
          : "Restore no-new-privileges or document the exact escalation mechanism the service needs.",
      ),
    );
  }

  const addedReads = difference(after.fileReads, before.fileReads);
  const removedReads = difference(before.fileReads, after.fileReads);
  if (addedReads.length > 0) {
    findings.push(
      finding(
        after.name,
        "file-reads-added",
        "medium",
        "expanded",
        `${addedReads.length} host file-reading surface${addedReads.length === 1 ? "" : "s"} added`,
        "Compose will resolve additional env files, build contexts, or extends files outside this review.",
        `${before.fileReads.length} references`,
        `${after.fileReads.length} references`,
        "Inspect every referenced file and run docker compose config before create or up.",
      ),
    );
  }
  if (removedReads.length > 0) {
    findings.push(
      finding(
        after.name,
        "file-reads-removed",
        "low",
        "reduced",
        `${removedReads.length} host file-reading surface${removedReads.length === 1 ? "" : "s"} removed`,
        "The candidate asks Compose to resolve fewer host files for this service.",
        `${before.fileReads.length} references`,
        `${after.fileReads.length} references`,
        "Confirm the service still receives every required non-secret setting.",
      ),
    );
  }

  for (const [rule, beforeList, afterList, label] of [
    ["secret-grants", before.secretGrants, after.secretGrants, "secret"],
    ["config-grants", before.configGrants, after.configGrants, "config"],
  ] as const) {
    const added = difference(afterList, beforeList);
    const removed = difference(beforeList, afterList);
    if (added.length > 0) {
      findings.push(
        finding(
          after.name,
          `${rule}-added`,
          "medium",
          "expanded",
          `${added.length} ${label} grant${added.length === 1 ? "" : "s"} added`,
          `The candidate exposes additional ${label} material to this service.`,
          `${beforeList.length} grants`,
          `${afterList.length} grants`,
          `Confirm each ${label} is required by this service and has the intended file permissions.`,
        ),
      );
    }
    if (removed.length > 0) {
      findings.push(
        finding(
          after.name,
          `${rule}-removed`,
          "low",
          "reduced",
          `${removed.length} ${label} grant${removed.length === 1 ? "" : "s"} removed`,
          `The candidate exposes fewer ${label} references to this service.`,
          `${beforeList.length} grants`,
          `${afterList.length} grants`,
          `Confirm the service no longer reads the removed ${label}.`,
        ),
      );
    }
  }

  return findings;
}

function emptyService(name: string): ServiceEvidence {
  return {
    name,
    privileged: false,
    hostNetwork: false,
    hostPid: false,
    hostIpc: false,
    provider: false,
    capabilitiesAdded: [],
    capabilitiesDropped: [],
    devices: [],
    mounts: [],
    ports: [],
    explicitUser: null,
    readOnlyRoot: false,
    noNewPrivileges: false,
    fileReads: [],
    secretGrants: [],
    configGrants: [],
  };
}

function compareProject(
  before: ComposeEvidence,
  after: ComposeEvidence,
): Finding[] {
  const findings: Finding[] = [];
  const addedIncludes = difference(after.includes, before.includes);
  const removedIncludes = difference(before.includes, after.includes);
  const addedFileReads = difference(
    after.projectFileReads,
    before.projectFileReads,
  );
  const removedFileReads = difference(
    before.projectFileReads,
    after.projectFileReads,
  );

  if (addedIncludes.length > 0) {
    findings.push(
      finding(
        "project",
        "include-added",
        "medium",
        "expanded",
        `${addedIncludes.length} Compose include${addedIncludes.length === 1 ? "" : "s"} added`,
        "The candidate imports additional Compose models that this local comparison does not resolve.",
        `${before.includes.length} includes`,
        `${after.includes.length} includes`,
        "Inspect the included files and review docker compose config output before execution.",
      ),
    );
  }
  if (removedIncludes.length > 0) {
    findings.push(
      finding(
        "project",
        "include-removed",
        "low",
        "reduced",
        `${removedIncludes.length} Compose include${removedIncludes.length === 1 ? "" : "s"} removed`,
        "The candidate imports fewer Compose models.",
        `${before.includes.length} includes`,
        `${after.includes.length} includes`,
        "Confirm no required service or policy remains only in the removed include.",
      ),
    );
  }
  if (addedFileReads.length > 0) {
    findings.push(
      finding(
        "project",
        "project-file-read-added",
        "medium",
        "expanded",
        `${addedFileReads.length} file-backed config or secret${addedFileReads.length === 1 ? "" : "s"} added`,
        "Compose will read additional host files when resolving project configs or secrets.",
        `${before.projectFileReads.length} file reads`,
        `${after.projectFileReads.length} file reads`,
        "Inspect the referenced files, ownership, permissions, and intended service grants.",
      ),
    );
  }
  if (removedFileReads.length > 0) {
    findings.push(
      finding(
        "project",
        "project-file-read-removed",
        "low",
        "reduced",
        `${removedFileReads.length} file-backed config or secret${removedFileReads.length === 1 ? "" : "s"} removed`,
        "Compose will read fewer host files while resolving this project.",
        `${before.projectFileReads.length} file reads`,
        `${after.projectFileReads.length} file reads`,
        "Confirm the removed material is no longer required by any service.",
      ),
    );
  }
  return findings;
}

export function compareComposeEvidence(
  baseline: ComposeEvidence,
  candidate: ComposeEvidence,
): ComparisonResult {
  const serviceNames = [
    ...new Set([
      ...Object.keys(baseline.services),
      ...Object.keys(candidate.services),
    ]),
  ].sort();
  const findings = compareProject(baseline, candidate);
  const changedServices = new Set<string>();

  for (const name of serviceNames) {
    const before = baseline.services[name] ?? emptyService(name);
    const after = candidate.services[name] ?? emptyService(name);
    if (!baseline.services[name]) {
      findings.push(
        finding(
          name,
          "service-added",
          "low",
          "changed",
          "Service was added",
          "The candidate introduces a new service definition.",
          "not present",
          "present",
          "Review the image, build context, network reachability, mounts, and runtime authority.",
        ),
      );
    }
    if (!candidate.services[name]) {
      findings.push(
        finding(
          name,
          "service-removed",
          "low",
          "reduced",
          "Service was removed",
          "The candidate removes a service and its declared authority.",
          "present",
          "not present",
          "Confirm no dependent service or operational task still requires it.",
        ),
      );
      changedServices.add(name);
      continue;
    }
    const serviceFindings = compareService(before, after);
    if (
      serviceFindings.length > 0 ||
      !baseline.services[name] ||
      !candidate.services[name]
    )
      changedServices.add(name);
    findings.push(...serviceFindings);
  }

  findings.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      directionRank[a.direction] - directionRank[b.direction] ||
      a.service.localeCompare(b.service) ||
      a.rule.localeCompare(b.rule),
  );

  return {
    findings,
    summary: {
      baselineServices: Object.keys(baseline.services).length,
      candidateServices: Object.keys(candidate.services).length,
      changedServices:
        changedServices.size +
        (findings.some((entry) => entry.service === "project") ? 1 : 0),
      expanded: findings.filter((entry) => entry.direction === "expanded")
        .length,
      reduced: findings.filter((entry) => entry.direction === "reduced").length,
      high: findings.filter((entry) => entry.severity === "high").length,
    },
  };
}
