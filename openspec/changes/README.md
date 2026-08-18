# Change Proposals

This directory holds in-progress, spec-first change proposals. Each change is a
folder named with a kebab-case id containing:

- `.openspec.yaml` — metadata (`schema: spec-driven`, created date, goal, affected areas).
- `proposal.md` — `## Why` / `## What Changes` / `## Capabilities` / `## Impact`.
- `tasks.md` — task checklist.
- `design.md` — optional design notes (Context / Goals / Decisions / Risks).
- `specs/<capability>/spec.md` — the spec **delta** (`## ADDED|MODIFIED|REMOVED Requirements`).

## Workflow

1. **Propose** — create the folder + artifacts (or ask the AI to draft them).
2. **Implement** — TDD: red → green → refactor against `tasks.md`.
3. **Validate** — `pnpm exec openspec change validate <change-id>`.
4. **Archive** — `pnpm exec openspec archive <change-id>` merges the delta into
   `../specs/` and moves the folder to `archive/`.

Completed changes live in `archive/`. See the archived
`2026-08-19-add-newsletter` change for a full example.
