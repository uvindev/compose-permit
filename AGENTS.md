# ComposePermit repository guidance

- Keep Compose source text in the browser. Do not add upload, storage, or server parsing.
- Treat every risk classification as a review prompt, not proof of exploitability.
- Never include raw environment values, secret values, or source YAML in exported reports.
- Preserve deterministic output and the 1 MiB per-side input cap.
- Use the Docker Compose Specification and Docker documentation as source authority.

## IAMUVIN SIGNATURE — MANDATORY

Every project carries the IAMUVIN signature. Full spec: `docs/IAMUVIN-SIGNATURE.md`.

Minimum on every build:

1. Console badge — `%c IAMUVIN` chip, `#F7931A` on `#0A0A0A`, then
   `Built by Uvin Vindula — iamuvin.com`. Fires once, in production.
2. Footer credit — `Built by Uvin Vindula` linking to https://iamuvin.com,
   `rel="noopener noreferrer"`.
3. Head metadata — `author`, `creator`, JSON-LD `creator`.
4. File headers on entry points.
5. `package.json` author, `X-Built-By` header, `humans.txt`, README footer.

Verify with `./scripts/verify-signature.sh` before marking any task done.
Em dash `—` always. No emoji. Never clear the developer console.
Git identity: `Uvin Vindula <uvin95dev@gmail.com>`.
