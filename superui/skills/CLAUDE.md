# superui/skills - the `pro-designer` skill body, references and scripts

This area holds `pro-designer/`: `SKILL.md`, its fifteen on-demand references under `references/` and its two bundled scripts under `scripts/`. The plugin shell (manifest, README, the Node minimum) belongs to `superui/CLAUDE.md`.

## Terms

- Surface mode: Persuade, Operate, Read or Experience, named from the requested surface (never the product) before any design decision; several rules apply only to new Persuade/Experience surfaces (concept brief, template test, screenshot QA).
- Design pass: the fixed eight-step order in `SKILL.md` (direction, layout, type, color, components, motion, flow psychology, QA), each step pointing at its reference.

## Relationships

- `SKILL.md` reaches every reference by `${CLAUDE_SKILL_DIR}/references/<file>.md`; nothing else loads them. A reference no line of `SKILL.md` names is unreachable.
- The scripts are called only from `SKILL.md`'s Final QA. `scripts/check_node.sh` has a twin at `viber/skills/code-auditor/scripts/check_node.sh`.
- Tested by `tests/superui/`: `check_contrast.unit.test.ts` (input validation, exit codes), `import-safety.unit.test.ts` (importing the script runs no CLI), `check_node.test.ts` (version matrix and parity with viber's copy, integration tier).

## Contracts

- Load order: the first action of every invocation reads `references/anti-slop.md` in full; it stays out of the Reference routing list because it is already loaded. Every other reference is read on demand, from the Design pass or the Reference routing list.
- Design-system precedence: a host's own token set, spec or brand guidelines override the skill's generic absolutes; the user's brief overrides its anti-generic warnings, except accessibility and anti-dark-pattern rules.
- `scripts/check_node.sh`: no args; prints exactly one line, `NODE_OK <cmd>` (`node` at 23.6 or newer, `node --experimental-strip-types` from 22.6 below 23.6) or `NODE_MISSING`; always exits 0.
- `scripts/check_contrast.ts`: `FG BG [TYPE] [FG BG [TYPE] ...]` or `--json <file>` of `{fg, bg, type?, label?}` records; colors `#rgb`, `#rrggbb`, `rgb(r,g,b)`; TYPE `normal` (AA 4.5, AAA 7), `large` (AA 3, AAA 4.5), `ui` (AA 3, no AAA). Exit 0 all pass, 1 a pair fails AA for its own type, 2 bad input or usage (no args, bad color, invalid record or type).
- `check_contrast.ts` exports `parseColor`, `contrastRatio` and `main`, and runs `main` only when executed directly, so tests import it safely.

## Commands

- `node --test tests/superui/check_contrast.unit.test.ts tests/superui/import-safety.unit.test.ts` (unit tier)
- `CI=true node --test tests/superui/check_node.test.ts` (integration tier)

## Change together

- `scripts/check_node.sh` and viber's copy stay identical except their header comments; `check_node.test.ts` fails on any output difference.
- The usage text of `check_contrast.ts` sits twice in the file (header comment and the `DOC` string); its TYPE thresholds and exit codes are restated in `SKILL.md` Final QA.
- A reference added, renamed or removed changes its line in `SKILL.md` Reference routing (and its Design pass step, if any).

## Traps

- `anti-slop.md` (about 18 KB) is read on every invocation: every byte added there is paid by every design task. Grow an on-demand reference instead where the rule fits one.
- In `--json` mode an unreadable file or invalid JSON is not caught: it exits 1 with a stack trace, the same code as an AA failure. Only a parsed record with a bad field exits 2.
- The output formatting helpers in `check_contrast.ts` (`pyStr`, `pyReprStr`, `pyFloatStr`) are deliberate: thresholds print as `3.0`, error messages quote input Python-style. Replacing them with native JS formatting changes the output.
