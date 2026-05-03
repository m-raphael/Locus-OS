# docs/backlog/ · vault staging

The authoritative Locus-OS backlog lives in the external Obsidian vault
at `~/Documents/Obsidian Vault/Backlog/Locus/` (per the project
`CLAUDE.md`). This directory exists **only** as a staging area when the
vault is not reachable from the machine where rows are drafted.

Workflow:

1. Draft new rows here as `<phase>.csv` matching the vault's column
   schema: `Epic, Task ID, Task Name, Spec, Acceptance Criteria, API,
   DB, Frontend, Priority, Phase`.
2. On the next sync, copy the rows into the vault's
   `02-Backlog.md` / sprint files and delete (or empty) the staging
   CSV.
3. Never sprint from the files in this folder — always read from the
   vault. These are *draft material*, not the source of truth.
