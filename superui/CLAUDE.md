# superui - `pro-designer`, the design/frontend advisory skill

One model-invoked skill, `skills/pro-designer/`: a `SKILL.md` router, fifteen
`references/*.md` (fourteen on demand, `anti-slop.md` always) and two bundled scripts. No agents, no hooks, no preloads. It stays advisory: it
reasons about a host's own design system and never overwrites it.

## Skill structure

- `references/anti-slop.md` is the one reference loaded unconditionally, as the FIRST action of
  every invocation, before any reasoning. It is deliberately absent from `# Reference routing`;
  every other reference is routed on demand from there. Other references point back to it by name
  (a bare `(anti-slop.md)` pointer or "anti-slop.md, already loaded") and never restate its
  catalog of tells.
- A new reference needs a routing line in `SKILL.md`, or the skill never reads it. `SKILL.md` names
  every reference as `${CLAUDE_SKILL_DIR}/references/<file>.md`, the form substituted at load;
  inside a reference that variable is not substituted, so references name each other by bare
  filename and point at `SKILL.md` sections by heading (the contrast script run included).
- The skill forbids em/en dashes in everything it outputs (UI copy, code, reports), not only in
  this repo's files.

## Bundled scripts

- The contrast check runs in two steps: `sh "${CLAUDE_SKILL_DIR}/scripts/check_node.sh"` resolves
  the Node command, then `<resolved cmd> "${CLAUDE_SKILL_DIR}/scripts/check_contrast.ts" ...`.
  Both go through an interpreter (`sh`, `node`), pre-approved by `Bash(sh:*), Bash(node:*)` in
  `allowed-tools`, not the direct-invocation `${CLAUDE_PLUGIN_ROOT}` pattern. So
  `check_contrast.ts` is 100644 and `check_node.sh` is `#!/bin/sh` (100755). Changing either call
  form means changing `allowed-tools` in the same edit.
- `check_node.sh` prints exactly one line and always exits 0: `NODE_OK node` (>= 23.6),
  `NODE_OK node --experimental-strip-types` (22.6 to < 23.6), or `NODE_MISSING`. On
  `NODE_MISSING` the skill skips the contrast check with a note (Node >= 22.6 required), never
  halts.
- `viber/skills/code-auditor/scripts/check_node.sh` is a copy that must behave identically;
  only the header comment may differ. `tests/superui/check_node.test.ts` fails on any divergence,
  so edit both together.
- `check_contrast.ts` exit codes: 0 all pass, 1 any pair below AA for ITS OWN type
  (`normal` 4.5, `large` 3, `ui` 3, no AAA tier for `ui`), 2 bad input or usage (no args,
  dangling color, out-of-range `rgb()`, a `--json` record missing/non-string `fg`/`bg`, unknown
  type). Trap: an unreadable or unparsable `--json` FILE is deliberately uncaught and exits 1,
  the same code as a contrast failure. `SKILL.md` restates these codes; keep it in step.
- Its printed lines mimic Python `str`/`repr`/float formatting through the `py*` helpers
  (`3.0`, `'#abc'`, `True`, `None`). Keep them when editing, or the output format shifts.
- Its `main()` runs only behind the `import.meta.url` guard; `parseColor`, `contrastRatio` and
  `main` are exports the tests import. `tests/superui/import-safety.unit.test.ts` fails if importing
  runs the CLI.
