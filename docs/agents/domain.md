# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Layout

Single-context repo.

Expected files when domain docs exist:

- `CONTEXT.md` at the repo root
- `docs/adr/` for architectural decision records

If these files do not exist, proceed silently. The domain-modeling flows can create them lazily when needed.

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
