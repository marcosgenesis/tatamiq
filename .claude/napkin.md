# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-07-17] Issue work usually expects focused verification, not repo-wide sweeps**
   Do instead: run the narrowest API/web tests and typechecks that cover the touched behavior, then expand only if failures suggest wider fallout.

## Shell & Command Reliability
1. **[2026-07-17] `rg` is not guaranteed in this workspace runtime**
   Do instead: fall back to `find`, `grep -R`, and targeted `sed` reads without assuming ripgrep exists.

2. **[2026-07-17] Orca runtime calls can be unavailable from a worker shell**
   Do instead: treat `orca worktree set` updates as best-effort and continue the code task unless Orca state itself is the blocking deliverable.

## Domain Behavior Guardrails
1. **[2026-07-17] Academy-facing UI should use project vocabulary exactly**
   Do instead: prefer `Academia`, `Responsável da Academia`, and `Configuração Inicial da Academia` over generic `organization` or `owner` wording in user-visible strings.
