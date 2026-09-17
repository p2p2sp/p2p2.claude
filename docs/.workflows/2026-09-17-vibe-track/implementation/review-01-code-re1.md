# re-review review

## Gates
- Build - none - the plugin ships markdown, JSON and bash only; there is no build step in this repo
- Tests - pass - 7s
- Integration - pass - 56s

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | Blocked notes declare nothing | ADDRESSED | superdev/agents/vibe-implementor.md:120 |
| I2 | Touched parser duplicated | ADDRESSED | superdev/scripts/lib_touched.sh:1 |

I1 - step 4 now writes on every verdict and names what each one carries; `BLOCKED` carries the
`DECISION:` lines plus one `touched:` line per file already changed, and a re-dispatch on the same notes
path declares the whole run rather than its second pass. Step 1's stop bullet points at the same rule
(`:73`), so the two halves of the agent no longer contradict each other, and the consumers that needed
it are reached: `SKILL.md:149` runs the guard off those lines and `SKILL.md:195` reverts off them.

I2 - `trim`, `normalise_path` and the `touched:` cut live once, in `superdev/scripts/lib_touched.sh`,
sourced by `vibe-guard.sh:84` and `commit-task.sh:75`; neither file keeps a private copy, each keeps its
own `add_declared` policy, and `tests/superdev/lib_touched.test.ts` binds them on both levels - the
structural check at `:208` and, more to the point, the live parity case at `:262` that runs one notes
file of awkward declarations through both scripts in one repository and asserts the guard's counted set
equals the commit's staged set.

## Debt

- M2 - Guard fails open on a missing library - superdev/scripts/vibe-guard.sh:84 - the new `source` is
  the one precondition this script does not check. Under `set -u` a failed source is not fatal:
  `touched_paths` and `normalise_path` become command-not-found, the declared set stays empty and the
  run prints `files: 0 / new: 0 / lines: 0` and `RESULT: OK` with exit 0 (probed), so `## Guard` goes
  straight to `## Commit` with the size thresholds and the sensitive-path check both silently disarmed -
  while every other bad precondition here (`notes file not found`, `not a git repository`,
  `invalid --sensitive value`) returns `RESULT: ERROR`. `commit-task.sh` fails closed on the same
  dependency because `set -e` aborts the source. Two files shipped side by side in one plugin dir make
  this near-unreachable, which is why it is Minor; the fix is one line -
  `source ... || fail "shared parser not found"`.

## Notes
- `superdev/skills/vibe/SKILL.md:196` still names `commit-task.sh` and `vibe-guard.sh` as the two scripts
  whose reduction the revert matches. Still true, since both reduce through the library, but the pointer
  now skips the file that actually owns the rule.

## Assessment
Both Important findings are fixed at the level they were raised - the BLOCKED branch now declares the
tree it leaves behind, and the two scripts read one parser bound by a live parity test - and the fix
introduces no Critical or Important of its own.

VERDICT: PASS
