# HANDOFF compose-permit-12 — ComposePermit public open-source release

Agent: Codex (deep)
Status: PARTIAL
Date: 2026-08-29

## Scope

Card said: Select, build, verify, monetize, and publish the next useful public open-source project.
I changed: AGENTS.md, CONTRIBUTING.md, LICENSE, README.md, SECURITY.md, app/api/health/route.ts, app/error.tsx, app/globals.css, app/layout.tsx, app/not-found.tsx, app/page.tsx, components/intent-link.tsx, components/signature.tsx, components/workbench.tsx, docs/IAMUVIN-SIGNATURE.md, docs/OPPORTUNITY.md, docs/SHIP-CHECK.md, docs/SPEC.md, eslint.config.mjs, lib/analytics.ts, lib/compose/analyze.ts, lib/compose/parser.ts, lib/compose/report.ts, lib/schemas/compose.ts, lib/signature.ts, lib/types.ts, next-env.d.ts, next.config.ts, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, postcss.config.mjs, public/humans.txt, scripts/verify-signature.sh, tasks/HANDOFF-compose-permit-12.md, tasks/todo.md, tests/compose-permit.test.ts, tsconfig.json, vitest.config.ts

## What I did

- Built a browser-local Docker Compose authority diff reviewer — this keeps supplied YAML off a server and makes the trust-boundary evidence inspectable.
- Parsed one strict YAML document per side with duplicate-key, alias, NUL, character, and UTF-8 byte limits — Docker execution and interpolation stay outside the product boundary.
- Compared privilege, namespace, capability, device, mount, socket, port, file-read, config, secret, provider, and hardening changes — the report focuses on host authority instead of generic line changes.
- Added deterministic Markdown copy/download, clean and error states, responsive layout, security headers, metadata, analytics event names, and MIT community files — the repository is ready for public review without a checkout or source upload.
- Pinned `yaml` 2.8.3 after the audit identified GHSA-48c2-rrv3-qjmp in 2.8.1 — the repeat audit reports no known vulnerabilities.
- Applied the complete IAMUVIN signature canon and exact verifier — the repository gate ends with `SIGNED`.

## Verification

Command: `pnpm verify`
Output:

```
All matched files use Prettier code style!
Test Files  1 passed (1)
Tests  35 passed (35)
✓ Compiled successfully
Route (app)                                 Size  First Load JS
┌ ○ /                                    53.9 kB         156 kB
├ ○ /_not-found                            125 B         102 kB
└ ƒ /api/health                            125 B         102 kB
IAMUVIN SIGNATURE GATE
  PASS  attribution line
  PASS  hub URL
  PASS  runtime badge
  PASS  accent token
  PASS  head metadata
  PASS  build artifacts
  PASS  no anti-patterns
SIGNED
```

Result: PASS

Additional evidence: `pnpm audit --prod --audit-level=moderate` returned `No known vulnerabilities found`. The production browser returned 16 sample findings, zero findings for identical inputs, a bounded parse error without source echo, a 4,030-character copied Markdown review, zero console warnings or errors, 320 px client/scroll widths of 320/320, and no visible target below 44 px. Production HTTP checks returned 200, the documented security headers, the health boundary flags, and no `X-Powered-By` header.

## Assumptions I made

- Compose Specification YAML is the initial input contract; unresolved includes, interpolation, image contents, and daemon state remain operator review steps — Claude: confirm or correct.
- A hosted GitHub App for policy, exceptions, saved baselines, comments, and history is the paid layer at `[TARGET] $24 per organization/month` for 10 repositories — Claude: confirm or correct.
- Revenue and customer count are `[UNVERIFIED]` because no trusted payment or customer evidence was supplied — Claude: confirm or correct.

## What I did not do

- I did not deploy a live service, connect checkout, collect payment, contact users, or submit to an app marketplace.
- I did not resolve effective Compose models, read referenced files, inspect images, contact a registry, or execute Docker.
- Public GitHub creation, repository metadata, push, and CI verification remain before this handoff becomes DONE.

## Risk

Compose syntax and runtime resolution are broader than the bounded parser; unsupported Windows bind syntax or unresolved Compose features can produce false positives or negatives in `lib/compose/parser.ts` and `lib/compose/analyze.ts`.

## Open question

none
