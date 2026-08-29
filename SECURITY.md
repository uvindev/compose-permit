# Security policy

ComposePermit does not upload or execute supplied Compose text. Parsing and comparison happen in the browser.

Report a vulnerability with GitHub private vulnerability reporting when available. Otherwise email `uvin95dev@gmail.com` with the repository name, affected version, reproduction, and impact. Do not include live credentials or private Compose files.

Supported version: the latest commit on `main`.

## Product boundary

- No Docker socket or daemon connection.
- No image pulls or registry requests.
- No variable interpolation or referenced-file reads.
- No persistence of source YAML.
- No claim that a clean report proves runtime safety.
