# ComposePermit specification

## Input

- One baseline and one candidate Compose Specification YAML document.
- Maximum 1 MiB per side.
- Exactly one YAML document per side.
- A top-level `services` mapping with at least one service.
- YAML aliases are capped during conversion.

## Normalized evidence

For each service, retain only fields needed to classify authority changes: privilege flags, namespace modes, devices, capabilities, security options, user, read-only state, mounts, published ports, file references, provider configuration, and referenced configs or secrets. Do not retain environment values in the review model.

## Finding families

- privilege and namespace expansion
- control socket and host filesystem exposure
- device and capability expansion
- public port exposure
- runtime-hardening reduction
- host file-reading surface changes
- external host-binary provider changes
- hardening changes that reduce authority

Findings are deterministic and sorted by severity, direction, service, and rule identifier.

## Output

- changed-service count
- expanded and reduced authority counts
- high-severity count
- ordered finding register
- Markdown review with no source YAML or environment values

## Limits

ComposePermit does not compute Docker’s fully merged model. An `include`, `extends`, `env_file`, config file, secret file, or provider is reported as a review boundary because the referenced content is deliberately not read.

## Analytics

Event names only. No Compose text or finding detail enters event properties.

- `workbench_viewed`
- `compose_compared`
- `review_exported`
- `pricing_intent`
- `feedback_intent`
