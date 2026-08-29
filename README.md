# ComposePermit

ComposePermit compares two Docker Compose files and isolates changes that can move authority from a container to its host. It runs in the browser. Supplied YAML is not uploaded, stored, interpolated, or executed.

## What it reviews

- privileged mode, host PID or network namespaces, and added devices
- added Linux capabilities and removed capability drops
- Docker, containerd, CRI-O, and Podman socket mounts
- new bind mounts, writable mount changes, and whole-host mounts
- newly public host ports
- user, read-only filesystem, and `no-new-privileges` changes
- file-reading surfaces such as `env_file`, `include`, `extends`, configs, and secrets
- external service providers that execute host binaries

ComposePermit reports textual authority changes. It does not render the fully resolved Compose model, inspect referenced files, pull images, contact Docker, or establish whether a configuration is safe to run.

## Who pays

The complete local reviewer is open source under the MIT License. The commercial hypothesis is a hosted GitHub App for pull-request comments, organization policy, approved exceptions, repository baselines, and review history.

Team price hypothesis: `[TARGET] $24 per organization/month` for the first 10 repositories. No checkout is connected in version 0.1.

## Local setup

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`, paste a merge-base and candidate Compose file, then compare them.

## Verification

```bash
pnpm verify
pnpm audit --prod --audit-level=high
bash ./scripts/verify-signature.sh
```

## Source authority

- [Docker Compose trust model](https://docs.docker.com/compose/trust-model/)
- [Compose Specification](https://github.com/compose-spec/compose-spec/blob/main/spec.md)
- [Docker Engine security](https://docs.docker.com/engine/security/)
- [Docker runtime privilege and capabilities](https://docs.docker.com/engine/containers/run/)
- [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

The parser targets Compose Specification YAML. A clean report does not replace `docker compose config`, image review, runtime policy, or host hardening.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues through [SECURITY.md](SECURITY.md), not a public issue.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
