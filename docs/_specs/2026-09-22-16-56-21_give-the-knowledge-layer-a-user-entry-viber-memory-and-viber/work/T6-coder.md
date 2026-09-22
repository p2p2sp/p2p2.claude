- Mirrored `memory-auditor.md`'s frontmatter fields and body order (role sentence, Input, two
  direction sections, Findings file, Output); `refs` was added to Input since C4, unlike the
  memory counterpart, needs a gate document (`rule-admission.md`) read before any `MISS`.
- The gate applies to `MISS` lines in BOTH directions, not just the propose one: a verify-direction
  rule can be silent on a convention its own matched files show, and that candidate is admitted or
  silently dropped the same way as a propose-direction one (DoD.1).
- Frozen-file handling (basename starting `_`) is stated as three explicit verbs, never opened as
  `target`, never scored, never proposed over, per DoD.2.
- `viber/.claude-plugin/plugin.json` still has no `rules-auditor.md` (and no `memory-auditor.md`)
  entry in `agents[]`; T9 owns that registration (its Files list carries `plugin.json` and its
  Verification checks for eleven agent entries), so T6 left it untouched.
