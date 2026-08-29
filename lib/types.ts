export type Severity = "high" | "medium" | "low";
export type Direction = "expanded" | "reduced" | "changed";

export type MountKind =
  | "docker-socket"
  | "runtime-socket"
  | "host-root"
  | "absolute-bind"
  | "relative-bind"
  | "named-volume"
  | "anonymous";

export interface MountEvidence {
  key: string;
  kind: MountKind;
  readOnly: boolean;
}

export interface PortEvidence {
  key: string;
  published: string;
  target: string;
  protocol: string;
  publicHost: boolean;
}

export interface ServiceEvidence {
  name: string;
  privileged: boolean;
  hostNetwork: boolean;
  hostPid: boolean;
  hostIpc: boolean;
  provider: boolean;
  capabilitiesAdded: string[];
  capabilitiesDropped: string[];
  devices: string[];
  mounts: MountEvidence[];
  ports: PortEvidence[];
  explicitUser: string | null;
  readOnlyRoot: boolean;
  noNewPrivileges: boolean;
  fileReads: string[];
  secretGrants: string[];
  configGrants: string[];
}

export interface ComposeEvidence {
  services: Record<string, ServiceEvidence>;
  includes: string[];
  projectFileReads: string[];
}

export interface ParseIssue {
  side: "baseline" | "candidate";
  message: string;
}

export interface ParseResult {
  evidence: ComposeEvidence | null;
  issues: ParseIssue[];
}

export interface Finding {
  id: string;
  rule: string;
  severity: Severity;
  direction: Direction;
  service: string;
  title: string;
  detail: string;
  before: string;
  after: string;
  recommendation: string;
}

export interface ComparisonSummary {
  baselineServices: number;
  candidateServices: number;
  changedServices: number;
  expanded: number;
  reduced: number;
  high: number;
}

export interface ComparisonResult {
  findings: Finding[];
  summary: ComparisonSummary;
}
