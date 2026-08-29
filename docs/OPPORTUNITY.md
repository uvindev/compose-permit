# Opportunity record

Research date: 2026-08-29.

## Compared workflows

| Candidate     | Recurring review                                                                | Existing coverage                                                                           | Decision                                                                                         |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ComposePermit | Review whether a Compose pull request adds host authority before anyone runs it | Docker now documents Compose files as trusted code; existing scanners largely lint one file | Selected: narrow before/after authority register, local by default                               |
| CSPDelta      | Review whether a Content Security Policy becomes less restrictive               | Google CSP Evaluator reviews policies; `csp_toolkit` already exposes a policy diff          | Rejected: mature single-policy analysis and a direct diff competitor                             |
| SBOM Delta    | Review package, license, and integrity changes across release SBOMs             | CycloneDX CLI, SBOMDiff, sbomlyze, and other tools already compare BOMs                     | Rejected: crowded with mature CLI and CI products                                                |
| RBAC Permit   | Review Kubernetes Role and Binding privilege expansion                          | Kubernetes has semantic reconcile commands and several RBAC inspection tools                | Deferred: useful, but broader object normalization and aggregation rules increase v0.1 ambiguity |

## Evidence

- Docker’s [Compose trust model](https://docs.docker.com/compose/trust-model/) says a Compose file can control host interaction and should be reviewed before `up` or `create`.
- Docker lists `privileged`, capabilities, namespaces, devices, mounts, file references, includes, extends, and providers among authority-bearing fields.
- Docker’s [Engine security guide](https://docs.docker.com/engine/security/) explains that host directory sharing and daemon control carry host-level consequences.
- Docker’s [runtime guide](https://docs.docker.com/engine/containers/run/) says privileged mode grants all capabilities and broad host-device access.
- Docker recommends [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/) instead of environment variables for sensitive values.
- Snyk’s [current plans](https://snyk.io/plans/) show a paid market for repository and IaC security workflows; the listed Team plan starts at $25 per contributing developer. ComposePermit’s `[TARGET]` price is a hypothesis, not a market result.

## Product boundary

ComposePermit parses two bounded YAML documents locally, extracts authority-bearing service fields, compares their normalized state, and exports a review record. It does not resolve includes or extends, interpolate variables, read referenced files, call Docker, inspect images, or certify safety.

## Paid boundary

The MIT-licensed browser reviewer stays complete. A hosted GitHub App would sell organization policy, pull-request comments, approved exceptions, repository baselines, retained history, and searchable evidence.
