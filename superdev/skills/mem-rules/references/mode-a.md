# Mode A — uninitialized bootstrap (full reset, plan mode)

The router resolved `state: none` — build the library from scratch, in plan mode. Obey the rules-file contract (§A–§G in the SKILL body) for every rule.

1. **Resolve `rule_extensions` — BEFORE `EnterPlanMode`** (config writes must not happen mid-plan). `Read` `.superdev/config.yml`:
   - has a `rule_extensions:` key → reuse it.
   - key absent / file missing → run `scripts/scan_extensions.sh <project-path>` (extension histogram over tracked source files), pick the source-type globs that matter (e.g. `**/*.ts`, `**/*.sh`, `**/*.cs` — skip vendored / generated / lockfile extensions), and **append** a `rule_extensions:` list to `.superdev/config.yml` (create the file with a one-line header if missing).
2. **`EnterPlanMode`.**
3. **Scan conventions** — `scripts/scan_conventions.sh <signal-file …> -- <ext-glob …>`. Signal files (linter / formatter / CI / build config paths) before `--`; the resolved `rule_extensions` globs after `--`. The script also dumps `git log --oneline -20`, the CLAUDE.md inventory, and a depth-2–3 tree. Read 3–5 source + 2–3 test files per layer to confirm architecture / naming / error-handling / testing patterns.
4. **Plan the nested `.claude/rules/<domain>/<topic>.md` structure** — each rule with its narrowest `paths:` (§B), 10–25 lines (§C), specific, no duplication (§D), passing §G. Prefer a `<domain>/<topic>.md` layout mirroring the codebase's real architectural units. Common topics: architecture, code-style, database, testing, validation, styling — add / skip by what the codebase actually needs. Use `references/rule-template.md` for the concrete shape + worked examples.
5. **Write the plan** listing each rule file (path, `paths:` globs, content bullets). Rule files are written **after approval** — this skill plans the library; it does not write rule files in plan mode.
