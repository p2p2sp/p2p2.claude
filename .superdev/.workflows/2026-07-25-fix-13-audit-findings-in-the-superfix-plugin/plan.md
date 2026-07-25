# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Fix 13 audit findings in the superfix plugin"

---
<!-- HEADER -->

## Goal
The `superfix` code-auditor runs end to end on macOS/BSD tooling, and every stage either produces a
correct artifact or fails loudly: the sweep discovers all candidate files, the gate reports every file
that cleared it, path identity survives the scout round trip, the detective's verification recipe is
collision-safe, and Phase 5 dispatches a real, contract-bearing `critic` agent.

## Context
A prioritized audit of `superfix/` (11 files, 6 hotspots, all investigated) returned 13 execution-verified
findings; 4 of 6 detective reports were replayed by an independent critic on a clean worktree. The headline
defect kills the plugin outright on macOS - `collect_signals.sh` feeds a newline-bearing value into `awk -v`,
which BSD awk rejects, so Phase 1 emits zero signals and exits 2. Behind it sit two silent-output defects in
the gate (`rank.ts` collapses both threshold flags into one, and `--top N` deletes gate-clearing files from
the report), a path-anchor drift that broke the scores/signals join live during the audit, an unsafe global
`git worktree` recipe that already leaked a 17 MB orphan, and a Phase 5 that dispatches an agent which has
never existed. The audit ran in a gitignored `.temp/` scratch workspace that has since been removed, so every
finding it produced is restated in this plan's criteria and every task builds its own fixtures. This repo
ships markdown / JSON / shell / TS as source with no build, test or lint step, so verification is by
executing the scripts against those fixtures and by reading the contract files against each other.

## Acceptance criteria
1. `collect_signals.sh` runs to completion against a multi-extension git repo on macOS/BSD awk: exit 0 and one JSON line per swept file.
2. Files whose paths git quotes under default `core.quotePath=true` (non-ASCII bytes) appear in the sweep output, and their extensions appear in the `sweep extensions:` stderr line.
3. An unreadable tracked file makes the sweep warn on stderr and continue; an unborn HEAD makes it exit non-zero with one explanatory message and no partial output. Neither truncates the stream silently.
4. Under `--with-dependents` a dotfile such as `.gitignore` does not receive a near-maximal `dependents` count.
5. `collect_signals.sh --with-dependents` works with either positional argument omitted, exactly as the script header documents.
6. `--min-impact` and `--min-opportunity` each gate their own axis: `--min-impact 5 --min-opportunity 3` excludes an impact-4 file, and `--min-impact 2 --min-opportunity 3` does not admit an opportunity-2 file.
7. Every file that clears the gate appears in `hotlist.json` and `hotlist.md`; the members of `counts` sum to `counts.scored`, and `--top N` caps dispatch, not the record.
8. `rank.ts` writes a stderr warning naming each scores path that matched no signals row.
9. `agents/scout.md` declares no write-capable tool; its output section states that `path` must be echoed byte-identically from the signal line; and its JSON-only rule sits in `## Hard rules` with the return route stated as the final message.
10. The clean-checkout recipe in `agents/detective.md` uses a caller-supplied unique path, carries no `--force`, includes recovery guidance for the stale-registration and orphaned-directory states, and is textually identical to the copy in `references/synthesis.md`; the detective declares no `Edit` tool and carries a hard rule against writing inside the target tree.
11. `agents/critic.md` exists, is listed in `.claude-plugin/plugin.json` `agents[]` and not in `skills[]`, has a verdict schema in `references/synthesis.md` covering every verdict value it can return, and is named in both `superfix/CLAUDE.md` and the root `CLAUDE.md`.
12. `SKILL.md` Phase 0 records the resolved target root; Phase 2 hands the scout the signal-line path as the single source of truth; Phase 4 resolves a hotspot path against that root before dispatch; Phase 3 passes `--run-id` and `--job`; Phase 5 dispatches `superfix:critic`.
13. `references/scoring.md` documents the `counts` object, the overflow bucket, the two independent minimums, the 50-row cap on the skipped table, and the 1..5 clamping of out-of-range scores.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - fix(superfix): make candidate discovery portable and quote-safe in collect_signals.sh
- Covers: criteria #1, #2, #5
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (header usage comment, the `for arg in "$@"` flag scan, the `kept_exts` pass-1 pipeline, the pass-2 `awk` candidate filter)

### Test Commands
*Build*
- none - the repo ships source with no build step (root `CLAUDE.md`: "there is no build / test / lint at any level")

*Tests*
- `mkdir -p /tmp/sfx-t1 && cd /tmp/sfx-t1 && git init -q . && printf 'a\n' > readme.md && printf 'b\n' > café.py && printf 'c\n' > 日本語.md && git add -A && git -c user.email=t@t -c user.name=t commit -qm init` followed by `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh 30 /tmp/sfx-t1` - expect exit 0, stderr `sweep extensions: md py`, and 3 JSON lines including `café.py` and `日本語.md`
- `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh --with-dependents` run with `/tmp/sfx-t1` as the working directory - expect exit 0 and a `dependents` value other than `-1` on every line
- `bash /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/collect_signals.sh 90 /Users/dario/Projects/p2p2.claude` - expect exit 0 and a non-empty JSONL stream

### Approach
1. Replace the `awk -v exts="$kept_exts"` assignment with an environment hand-off: export the list as an environment variable on the `awk` invocation and read it inside `BEGIN` via `ENVIRON`, keeping the existing `split`/`keep[]` membership logic unchanged. The value must never reach a `-v` assignment - macOS system awk aborts on a newline inside one.
2. Add `-c core.quotePath=false` to both `git ls-files` invocations - the pass-1 extension harvest and the pass-2 candidate list - so quoted, C-escaped paths never enter either pipeline. Both call sites must carry it, or the stderr coverage line and the swept set disagree.
3. Rewrite the `for arg in "$@"` flag scan into a loop that removes `--with-dependents` from the positional stream before `WINDOW_DAYS` and `ROOT` are bound, making the header's `[window_days] [repo_root] [--with-dependents]` contract true.
4. Update the header comment block to describe the environment hand-off and the quote-safe listing, so the script's stated I/O contract still matches its behaviour.

### Edge cases
- A repo whose every file of one extension has a non-ASCII name: that extension must still appear in `kept_exts` and in the stderr coverage line.
- Paths containing spaces, and extensionless files (scripts, `Makefile`): both must survive the pipeline unchanged.
- An empty `kept_exts` (a repo of only extensionless files) must not turn the `awk` filter into a match-nothing or match-everything pass.
- Out of scope, and to be stated as such in the header: a path containing a literal newline still breaks the line-based pipeline. `core.quotePath=false` does not address it, and no observed repo has one.

### Contracts
Consumes: the tracked file list from `git ls-files`. Produces: unchanged JSONL shape `{"path","churn","fix_commits","recency_days","loc","dependents"}` on stdout, plus one `sweep extensions: …` line on stderr.

### DoD
All three Test Commands behave as described on macOS with system awk.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - fix(superfix): stop the per-file signal loop from truncating or mis-scoring
- Covers: criteria #3, #4
- TDD: none

### Dependencies
- Task 1 - blocks: same file; Task 1 rewrites the loop's input pipeline, so this task builds on it

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (the per-file `while` loop: the `churn`, `fix_commits`, `last_ct` and `loc` probes, and the `--with-dependents` `stem` block)

### Test Commands
*Build*
- none - see Task 1

*Tests*
- `mkdir -p /tmp/sfx-t2 && cd /tmp/sfx-t2 && git init -q . && printf 'x\n' > a.md && printf 'y\n' > b.md && git add -A && git -c user.email=t@t -c user.name=t commit -qm init && chmod 000 b.md` followed by the sweep - expect exit 0, a stderr warning naming `b.md`, and a record for `a.md`
- `mkdir -p /tmp/sfx-t2b && cd /tmp/sfx-t2b && git init -q . && printf 'x\n' > a.md && git add -A` (staged, never committed) followed by the sweep - expect a non-zero exit, one explanatory stderr message, and empty stdout
- `mkdir -p /tmp/sfx-t2c && cd /tmp/sfx-t2c && git init -q . && printf 'ig\n' > .gitignore && for i in 1 2 3; do printf 'z\n' > "src$i"; done && git add -A && git -c user.email=t@t -c user.name=t commit -qm init` followed by the sweep with `--with-dependents` - expect `.gitignore` to report `dependents` of `-1` or `0`, never `3`

### Approach
1. Guard each per-file probe (`churn`, `fix_commits`, `last_ct`, `loc`) so a failure on one file emits a stderr warning naming that file and `continue`s to the next, instead of letting `set -euo pipefail` abort the stream mid-write.
2. Detect an unborn HEAD before the loop starts (`git rev-parse --verify -q HEAD`) and exit non-zero with one message - a repo with no commits has no churn, fix or recency data, so a sweep of it would be meaningless rather than merely incomplete.
3. In the `--with-dependents` block, compute `stem` so a leading-dot basename yields the basename itself rather than the empty string, and skip the `git grep` probe entirely when `stem` is empty, leaving `dependents` at `-1`.
4. Extend the header comment's signal descriptions to state the new per-file failure behaviour, the unborn-HEAD exit, and the dotfile rule.

### Edge cases
- A file with no trailing newline keeps its existing `loc` behaviour; the new guards must not change it.
- A tracked-but-deleted path: the existing `[ -f "$f" ] || continue` must still short-circuit before the probes.
- `git grep` returning no match must keep yielding `0`, not abort under `pipefail`.

### Contracts
Unchanged JSONL shape. New: at most one stderr warning line per skipped file, and a documented non-zero exit for the unborn-HEAD case.

### DoD
All three Test Commands behave as described, and a sweep of `/Users/dario/Projects/p2p2.claude` still emits one record per tracked source file at exit 0.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - fix(superfix): make the rank.ts gate report honestly
- Covers: criteria #6, #7, #8
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank.ts (`quadrant`, `main`, `USAGE`, `HELP`)

### Test Commands
*Build*
- none - `rank.ts` is executed directly by Node's native type stripping. Run `sh /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/check_node.sh` first: it must print `NODE_OK node`, which is the form the commands below use. If it prints `NODE_OK node --experimental-strip-types`, use that form in place of `node` below. If it prints `NODE_MISSING`, stop - this task cannot be verified without a supported Node.

*Tests*
- build the fixture pair once: `mkdir -p /tmp/sfx-t3`, then write to `/tmp/sfx-t3/signals.jsonl` the three lines `{"path":"a.ts","churn":90,"fix_commits":3,"recency_days":0,"loc":16,"dependents":2}`, `{"path":"b.ts","churn":8,"fix_commits":3,"recency_days":0,"loc":128,"dependents":1}`, `{"path":"c.ts","churn":3,"fix_commits":1,"recency_days":0,"loc":73,"dependents":2}`; and to `/tmp/sfx-t3/scores.jsonl` the three lines `{"path":"a.ts","impact":4,"opportunity":4,"impact_reason":"i","opportunity_reason":"o"}`, `{"path":"b.ts","impact":4,"opportunity":4,"impact_reason":"i","opportunity_reason":"o"}`, `{"path":"c.ts","impact":3,"opportunity":2,"impact_reason":"i","opportunity_reason":"o"}`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 5 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/a.json --out-md /tmp/sfx-t3/a.md` - expect `a.ts` and `b.ts` (impact 4) absent from `hotspots`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 2 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/b.json --out-md /tmp/sfx-t3/b.md` - expect `c.ts` (opportunity 2) absent from `hotspots`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/c.json --out-md /tmp/sfx-t3/c.md` - regression on the tie-break: expect `a.ts` (churn 90) ranked above `b.ts` (churn 8) at equal 4x4, and `c.ts` in `skipped` with quadrant `already-fine`
- write 26 score lines to `/tmp/sfx-t3/many.jsonl` of which 25 clear a 3/3 gate, then `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/many.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/d.json --out-md /tmp/sfx-t3/d.md` (no `--signals`) - expect no gate-clearing path missing from the union of the output arrays, and the `counts` members to sum to `counts.scored`
- copy `/tmp/sfx-t3/scores.jsonl` to `/tmp/sfx-t3/drift.jsonl` with `a.ts` renamed to `sub/a.ts`, then `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/drift.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/e.json --out-md /tmp/sfx-t3/e.md` - expect a stderr line naming `sub/a.ts`

### Approach
1. Change `quadrant(impact, opportunity, t)` to `quadrant(impact, opportunity, minImpact, minOpportunity)`, comparing each axis against its own minimum, and delete the `Math.min(args.minImpact, args.minOpportunity)` collapse in `main`. Replace the emitted `threshold` scalar with `min_impact` and `min_opportunity` keys, and drop `threshold` entirely - a single scalar cannot carry two independent axes.
2. Reword the `hotlist.md` summary line that currently prints `threshold ${t}` so it reports both minimums, since the scalar it read no longer exists.
3. In `main`, stop defining `skipped` as `quadrant !== "HOTSPOT"`. Partition the ranked rows so every row lands in exactly one bucket: `hotspots` (gate-clearing, capped by `--top`), `overflow` (gate-clearing beyond the cap), and `skipped` (did not clear the gate). Emit all three in `hotlist.json`, extend `counts` with an `overflow` member so `hotspots + overflow + skipped === scored`, and render the overflow rows in `hotlist.md` under their own labelled section between the hotspot table and the skipped details block.
4. In the merge loop in `main`, emit a stderr warning in the existing `warn: …` phrasing used by `loadJsonl` when a scores record's `path` has no entry in `sigByPath` and `--signals` was supplied.
5. Update `USAGE` and `HELP` so the flag descriptions state that the two minimums are independent and that `--top` caps dispatch rather than the record.

### Edge cases
- `--top` larger than the hotspot count, `--top 0`, and a negative `--top` must not throw, and `counts` must still sum to `scored`.
- `--signals` omitted entirely: no unjoined-path warnings at all, since there is nothing to join against.
- Existing behaviour that must NOT change: the tie-break order (score desc, impact desc, churn desc), the four quadrant strings, the 1..5 clamping, the 50-row cap on the skipped table, and exit-2-with-usage on bad arguments.

### Contracts
`hotlist.json` replaces `threshold` with `min_impact` / `min_opportunity`, gains an `overflow` array, and gains a `counts.overflow` member; the `counts` members sum to `counts.scored`. `quadrant()` takes two thresholds. `hotlist.md` gains one labelled overflow section and a summary line naming both minimums.

### DoD
All six Test Commands behave as described, including the tie-break regression.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - fix(superfix): make the scout read-only and pin its path key
- Covers: criteria #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/scout.md (frontmatter `tools:`, `## Output - strict, one line, JSON only, no prose`, `## Hard rules`)

### Test Commands
*Build*
- none - agent prompts ship as markdown

*Tests*
- `grep -n '^tools:' superfix/agents/scout.md` - expect `Read, Grep, Glob` with no `Write` and no `Bash`
- `grep -n 'verbatim' superfix/agents/scout.md` - expect the path-key rule present in the output section
- `sed -n '/## Hard rules/,$p' superfix/agents/scout.md | grep -n 'no prose'` - expect the output-format rule to appear inside `## Hard rules`
- `grep -c 'appends your line' superfix/agents/scout.md` - expect the printed count to be `0`

### Approach
1. Narrow the frontmatter to `tools: Read, Grep, Glob`, removing the write-capable and shell tools that contradict the body's read-only rule.
2. In the output section, state that `path` MUST be echoed byte-identically from the signal line the scout was given, that it is the join key against `signals.jsonl`, and that it must never be a path the scout resolved itself.
3. Move the "one line, JSON only, no prose, no preamble, no markdown" rule into `## Hard rules` as its final entry, so it is the last instruction the model reads.
4. Replace the sentence stating that the orchestrator appends the line to `scores.jsonl` with an explicit "return the line(s) in your final message; write nothing", and broaden the cost brake so it covers any deep analysis rather than only exploit reasoning.

### Edge cases
- A scout that cannot open the file it was given must still emit the 1/1 "unreadable" verdict, using the given path string unchanged.
- Batch mode (several paths in one call) must keep one JSON line per file.

### Contracts
Scout output stays `{"path","impact","opportunity","impact_reason","opportunity_reason"}`, with `path` now defined as the verbatim signal-line path and the return route fixed to the final message.

### DoD
All four Test Commands pass, and `agents/scout.md` contains no instruction implying that the scout writes a file.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - fix(superfix): make the detective's clean-checkout recipe collision-safe
- Covers: criteria #10
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (frontmatter `tools:`, `## Inputs you are given`, `## Method`, `## Hard rules`)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)`)

### Test Commands
*Build*
- none - agent prompts and references ship as markdown

*Tests*
- `grep -n 'worktree' superfix/agents/detective.md superfix/skills/code-auditor/references/synthesis.md` - expect no `--force` in either recipe and the same placeholder name in both
- `grep -n 'prune\|already registered\|not a working tree' superfix/agents/detective.md` - expect recovery guidance for both stale states
- `grep -n '^tools:' superfix/agents/detective.md` - expect no `Edit`
- `sed -n '/## Hard rules/,$p' superfix/agents/detective.md | grep -n 'inside the target'` - expect the no-write rule present
- in a scratch repo, run `git worktree add /tmp/sfx-t5-a HEAD` twice - confirm the recovery line documented in the recipe clears the second failure

### Approach
1. Add an explicit entry to `## Inputs you are given`: a unique verification-worktree path supplied by the caller, and state that the detective must not invent one.
2. Rewrite the `## Method` step-3 recipe to use that supplied path, remove `--force` from the removal line, and add the two recovery cases with the command that clears each - stale registration (`missing but already registered worktree`, cleared by `git worktree prune`) and orphaned directory (`already exists` plus `not a working tree`, cleared by removing the directory).
3. Note in the recipe that the worktree contains the whole repository, so an audited subtree sits under it at the target's own relative path.
4. Replace the recipe in `references/synthesis.md` with that exact text and placeholder so the two copies cannot drift again.
5. Remove `Edit` from the frontmatter `tools:` - the detective's only legitimate write is its report, which `Write` covers - and add a hard rule forbidding any write inside the target tree, since all detectives share one working tree and one stray edit poisons every sibling's reads.

### Edge cases
- A detective that reaches a finding without needing a worktree must not be forced to create one.
- The cleanup line must be safe to run when the worktree was never created.

### Contracts
`detective.md` gains one required input: the verification-worktree path. Supplying it is `SKILL.md` Phase 4's job, covered in Task 7.

### DoD
All five Test Commands pass, and the two recipes are textually identical.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superfix): add the critic agent and its verdict schema
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 5 - blocks: both tasks edit `references/synthesis.md`; the recipe rewrite lands first

### Files
- add - superfix/agents/critic.md (new agent prompt)
- modify - superfix/.claude-plugin/plugin.json (`agents`)
- modify - superfix/skills/code-auditor/references/synthesis.md (new verdict-schema section)
- modify - superfix/CLAUDE.md (`## Layout (superfix internals)`, `## Components (qualified superfix:<name>)`)
- modify - CLAUDE.md (the self-documentation invariant line naming superfix's `scout` / `detective`)

### Test Commands
*Build*
- none - agents and manifests ship as source

*Tests*
- `node -e "const m=JSON.parse(require('fs').readFileSync('superfix/.claude-plugin/plugin.json','utf8')); if(!m.agents.includes('./agents/critic.md')) throw new Error('missing from agents[]'); if(JSON.stringify(m.skills).includes('critic')) throw new Error('leaked into skills[]')"` - expect exit 0
- `grep -n 'critic' superfix/CLAUDE.md CLAUDE.md` - expect the agent named in both orientation files
- `grep -n 'VERIFIED\|REFUTED\|PARTIALLY VERIFIED\|INCONCLUSIVE' superfix/skills/code-auditor/references/synthesis.md` - expect all four verdict values in the schema
- `grep -n '^tools:\|^model:\|^name:' superfix/agents/critic.md` - expect `name: critic`, `model: opus`, and `tools: Read, Grep, Glob, Bash`

### Approach
1. Write `agents/critic.md` with `name: critic`, `model: opus`, a routing-guard `description:` in the house style used by `scout.md` and `detective.md` ("Invoked only by the code-auditor skill, never directly"), and `tools: Read, Grep, Glob, Bash`. Its body takes one claim plus the report path, replays it on a fresh worktree at the caller-supplied path using the recipe Task 5 fixed, and returns a tagged verdict in its final message.
2. State its inputs (the claim, the report path, `job.md`, the verification-worktree path) and its output as hard rules: one `VERDICT: VERIFIED | REFUTED | PARTIALLY VERIFIED | INCONCLUSIVE` line, the command run, the observed output, and a severity judgement. `INCONCLUSIVE` is the required value when no oracle can settle the claim. Forbid writing any file, including the report path it was given.
3. Add `"./agents/critic.md"` to `agents[]` in `superfix/.claude-plugin/plugin.json`.
4. Add a verdict-schema section to `references/synthesis.md` defining that tagged shape and how the orchestrator folds each of the four values into `findings.md`: VERIFIED keeps the finding as filed, PARTIALLY VERIFIED keeps only the sub-claims that survived and lowers the severity, REFUTED drops the finding, INCONCLUSIVE keeps it with confidence lowered and the missing oracle named.
5. Update `superfix/CLAUDE.md`'s layout tree and component inventory to list three agents, and update the root `CLAUDE.md` line enumerating superfix's agents, per the repo's self-documentation invariant.

### Edge cases
- A claim with no available oracle resolves to `INCONCLUSIVE`, never to an invented verdict.
- The critic must appear in `agents[]` only - agents and skills are disjoint catalogs.

### Contracts
New agent `superfix:critic`, dispatched via the Agent tool with `subagent_type: superfix:critic`. Its verdict is a tagged final message, not a file, so parallel critics have no shared-write hazard.

### DoD
All four Test Commands pass, and `plugin.json` `agents[]`, the `agents/` directory listing, and both `CLAUDE.md` files agree on exactly three agents.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - fix(superfix): close the SKILL.md phase contracts
- Covers: criteria #12
- TDD: none

### Dependencies
- Task 3 - blocks: Phase 3 documents rank.ts's flags and output semantics
- Task 4 - blocks: Phase 2 must match the scout's pinned path key
- Task 5 - blocks: Phase 4 must supply the verification-worktree path the detective now requires
- Task 6 - blocks: Phase 5 dispatches `superfix:critic`, which must exist first

### Files
- modify - superfix/skills/code-auditor/SKILL.md (`### Phase 0 - Frame`, `### Phase 2 - Score (fan out the scouts, cheap model)`, `### Phase 3 - Gate (drop the noise, build the hotlist)`, `### Phase 4 - Dispatch detectives (frontier model, top-N only)`, `### Phase 5 - Synthesize (verify, dedupe, score, rank)`, `## Subagents this skill drives`)

### Test Commands
*Build*
- none - skills ship as markdown

*Tests*
- `grep -n 'run-id\|--job' superfix/skills/code-auditor/SKILL.md` - expect both flags in the Phase 3 command block
- `grep -n 'superfix:critic' superfix/skills/code-auditor/SKILL.md` - expect hits in both Phase 5 and `## Subagents this skill drives`
- `grep -rn 'verify-only' superfix/` - expect no hits
- run the Phase 3 command block from `SKILL.md` against the `/tmp/sfx-t3` fixtures built in Task 3 (rebuild them from Task 3's fixture bullet if the directory is absent), substituting a real run id and the four fixture paths for the `.temp/code-reviewer/<run-id>/…` placeholders the block hard-codes - expect the generated `hotlist.md` title to carry that run id rather than `# HOTLIST - run`

### Approach
1. In Phase 0, add a step that resolves the target repo path to an absolute root and records it in `job.md`, stating that every later phase addresses files relative to that root.
2. In Phase 2, replace "the file path, the matching signal line" with a single instruction: hand the scout the signal line, and require the returned `path` to be that exact string.
3. In Phase 3, add `--run-id <run-id> --job <job>` to the command block and describe the overflow bucket Task 3 introduces alongside the existing hotlist description.
4. In Phase 4, require the hotspot path to be resolved against the recorded target root before dispatch, and add a unique verification-worktree path to the list of what each detective is given.
5. Rewrite Phase 5 to dispatch `superfix:critic` via the Agent tool with `subagent_type: superfix:critic`, naming what the critic receives and where its verdict goes, and delete the "verify-only mode" wording. Update `## Subagents this skill drives` to list all three agents.

### Edge cases
- A target root equal to the current working directory: the resolution step must be a no-op, never a duplicated prefix.
- Auditing a subdirectory of a larger repo - the case that produced the finding - must work end to end.

### Contracts
`job.md` gains a recorded absolute target-root field. Phase 4 gains a per-detective worktree path. Phase 5 gains a named verifier, a defined input set, and a verdict destination.

### DoD
All four Test Commands pass, and no phase references an agent or a flag that does not exist.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - docs(superfix): align scoring.md with what rank.ts emits
- Covers: criteria #13
- TDD: none

### Dependencies
- Task 3 - blocks: the schema documents the output shape Task 3 changes

### Files
- modify - superfix/skills/code-auditor/references/scoring.md (`## Hotlist schema (hotlist.json)`, `## Tie-breaking & caps`)

### Test Commands
*Build*
- none - references ship as markdown

*Tests*
- `grep -n 'counts' superfix/skills/code-auditor/references/scoring.md` - expect the object documented with its sum invariant
- `grep -n 'overflow' superfix/skills/code-auditor/references/scoring.md` - expect the bucket documented
- `grep -n 'min_impact\|min_opportunity' superfix/skills/code-auditor/references/scoring.md` - expect the two independent minimums documented in place of `threshold`
- `grep -n '50\|clamp' superfix/skills/code-auditor/references/scoring.md` - expect both the skipped-table cap and the 1..5 clamping documented
- regenerate a hotlist from the `/tmp/sfx-t3` fixtures (rebuild them from Task 3's fixture bullet if the directory is absent) using the absolute-path `rank.ts` invocation from Task 3, and compare the documented schema key by key against the emitted `hotlist.json` - expect no key present in one and absent from the other

### Approach
1. Replace `threshold` with `min_impact` / `min_opportunity` in the documented `hotlist.json` schema, and add the `overflow` array and the `counts` object, stating the invariant that the `counts` members sum to `scored`.
2. Document that `hotlist.md` renders at most 50 skipped rows and that scores outside 1..5 are clamped rather than rejected.
3. Rewrite the `--top N` paragraph in `## Tie-breaking & caps` so it describes capping dispatch while keeping the full gate-clearing record, matching Task 3's behaviour.
4. Note that `run_id` and `job` are populated from the `--run-id` / `--job` flags that Phase 3 now passes.

### Edge cases
- The 1-5 rubric table in this file is hand-copied into `job.md` by Phase 0. Leave that table byte-identical so the copy-paste contract does not drift.

### Contracts
Documentation only - no runtime behaviour changes.

### DoD
All five Test Commands pass, and every key emitted by `rank.ts` appears in the documented schema.

<!-- /TASK -->
