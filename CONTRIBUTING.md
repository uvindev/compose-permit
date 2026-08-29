# Contributing

Parser cases and authority classifications are welcome.

1. Open an issue describing the Compose shape and expected review outcome. Remove credentials, private paths, image registry names, and internal service names.
2. Add a focused fixture in `tests/compose-permit.test.ts`.
3. Run `pnpm verify` and `pnpm audit --prod --audit-level=high`.
4. Submit one behavior change per pull request.

Do not commit production Compose files, `.env` files, secrets, tokens, certificates, or private registry coordinates.
