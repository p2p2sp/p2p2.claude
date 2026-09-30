# Final review - slice 1 (T1, T2, T3)

Byte identity of the six scripts, four skill files and five agents against 3f6d87c9 holds under the relocation map; modes are right; `git grep superfix` outside docs/CLAUDE nodes is empty; the reached suites (tests/viber, tests/superui/check_node, tests/github/release, portability, orphan-tags) pass: 1159 pass, 2 OS skips.

## Blocking

None.

## Minor

1. `viber/skills/setup/assets/help.html:712-716` (EN) and `:719-723` (PL) - the install paragraph still says `node` is an optional tool used only for `/viber:setup`'s settings merge, and that without it the merge is skipped. With `/viber:code-auditor` now in viber, `node` (22.6 or newer) is also what the auditor needs to run at all (its `check_node.sh` preflight stops the run). The T2 coder note confirms it: "the install paragraph's list of optional tools were left as they are". The root `README.md:38` already names it correctly ("Node.js 22.6 or newer for `/viber:code-auditor`"). Fix: in both languages, name `node` 22.6 or newer as also needed by `/viber:code-auditor`, and say the auditor stops without it.

2. `viber/README.md:15-17` - the same stale statement: "Optional: `node`, for `/viber:setup`'s permissions merge ... Each step skips with a note when its tool is missing." `/viber:code-auditor` (row at `viber/README.md:35`, "Needs Node.js 22.6 or newer") does not skip with a note; it stops. Fix: add `/viber:code-auditor` to the `node` clause, with its 22.6 minimum, so the "skips with a note" sentence no longer covers it, or reword that sentence.

3. `.claude/rules/shell-script-header.md:15` - "`issue-facts.sh` and `post-comment.sh` moved to `viber/scripts/`, not `skills/triage/scripts/` anymore - that directory is empty." This is change-history prose, which the repo's present-state rule for `.claude/rules/` files forbids. T1 rewrote this same line and its notes say the sentence was "left untouched". Fix: delete that sentence. The list before it already names both scripts, and the paragraph describes present state without it.
