---
name: vibe
description: Use when the user explicitly asks to skip the planning ceremony and have a small change made right away - signals such as "vibe", "just do it", "no plan", "no ceremony", "straight away", in whatever language they write, or the command /superdev:vibe. That list is illustrative, never exhaustive: what routes here is the explicit demand to drop the ceremony, not the word "now" or "fast" inside an ordinary change request. "vibe: change the button label to Save" enters this track; "add a CSV export now" goes to intent. It takes a small bug fix too, but only when the user asks for vibe explicitly. It never fires for a request the user wants designed, discussed, specified or planned, and never as a shortcut you choose for them.
argument-hint: [one-sentence change]
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, AskUserQuestion, Skill, ExitPlanMode, Bash(date:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)
disallowed-tools: Edit, NotebookEdit, WebFetch, WebSearch
user-invocable: true
---

# Vibe

One request, one subagent, one commit. No interview, no spec, no plan, no reviewer, no knowledge layer.

You resolve, guard, dispatch and commit. The change itself is made by `superdev:vibe-implementor` and by nothing else: this context reads no source file whole and edits none at all.

Every stop is an advisory finding, never a gate of your own: it goes to the user, their explicit choice wins over it, and the run continues only after `OVERRIDE: <stage> - <reason>` is written into the brief's `## Notes`. `<stage>` is one of `entry guard`, `size guard`, `failed checks`, `no verdict`, and nothing else is ever written on that line.

## Preflight

Plan mode active -> `ExitPlanMode` at once, before the first `Read`, `Grep`, `Glob` or `Bash` call below. This is an execution track: there is no plan to present and nothing to approve. That call presents no plan and asks for no approval, so pass the literal marker `superdev:routing-exit` as the OPENING of its `plan` argument (a one-line reason may follow it): the `ExitPlanMode` gate allows a call shaped that way and writes no approval sidecar. Without the marker an earlier plan of the same session standing at `VERDICT: FAIL` denies this call and the skill cannot start.

Then, before anything is read, written or dispatched, and writing no file:

1. `Agent` tool present in your tool pool? Its absence means the harness lost the tool, never that you may make the change in its place: STOP, report exactly these four lines, end the turn.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was implemented, written or committed in its place.
State: <run directory>, or "no brief written yet".
Fix: exit this session, restart with `claude --resume`, then run `/superdev:vibe <the same request>` again.
```

2. `git rev-parse --git-dir` non-zero -> STOP with the single line `vibe needs a git repository - nothing was changed.`; dispatch nothing, write nothing. The track commits and `## Stop`'s revert takes files back to HEAD: neither exists without a repository.
3. `git rev-parse --show-toplevel` -> `<root>`. Every path handed to an agent, a script or a skill below is absolute and joined from it, and `## Stop` measures every declared path against it.

## Reconnaissance

Read as little as it takes to know which files the request names and how the host proves them.

- `Grep` / `Glob` for the symbols, names and paths the request carries. Never `Read` a whole source file: that content belongs in the subagent's context, not in yours. `Read` here is for the host's memory files and for this skill's own templates.
- Host memory - the root `CLAUDE.md`, every child node it points at, every file under `.claude/rules/`. Assume nothing about the host's stack; two things come out of it:
  - **Checks** - the commands the memory declares for the area this request touches (build, test, lint, type-check, format), each copied verbatim. Never invent one, never widen a scoped command into the full suite, never substitute one you know from another project. None declared for that area -> the brief's `## Checks` is the single line `none - <what the memory does not declare>`, a complete run rather than a failure.
  - **Sensitive paths** - every path, directory or file class the memory describes, in any wording, as sensitive, protected, critical, security-relevant, generated, migration-bearing or requiring review before a change. No fixed marker and no dedicated section is required. None described -> the list is empty and that host is judged by the size thresholds alone.
- Each sensitive path becomes one glob matching a repository-relative path (`*` crosses `/`; it is a shell glob, never a regex). A glob is kept only when it is a single line carrying no `'` and no `"`; anything else is dropped, named in one `## Done` status line, and the survivors still go to the guard.
- What leaves this section: the expected file list, the check commands, the surviving sensitive globs.

## Entry guard

The first stop, and the only one that never reaches `## Stop`. The request is a vibe when all five hold:

- its goal fits ONE sentence;
- reconnaissance named the files it touches;
- it adds no new module, component or service;
- it introduces no new contract between components - an API shape, a schema, a message, a stored format, a public signature something else consumes;
- none of the sensitive globs matches a file it would touch.

All five hold -> `## Brief`. Any one fails -> say in ONE sentence which one fails and why, offer `intent` with the same request as the alternative, and stop there: no `AskUserQuestion`, no brief, no subagent, no change in the repository.

The user answering that refusal with an explicit "vibe anyway", in whatever language, -> `## Brief`, carrying `OVERRIDE: entry guard - <the reason you just gave>` into its `## Notes`.

## Brief

One file, and the only file this skill ever writes.

1. `date +%Y%m%d-%H%M%S` once -> `<timestamp>`.
2. `<slug>` - the goal's words lowercased, every run of non-alphanumerics folded to a single `-`, cut at 40 characters.
3. `<run dir>` is `<root>/.temp/superdev/vibe/<timestamp>-<slug>/`. Nothing of this run is written anywhere else - never under `docs/.workflows/`, never in a plugin-named directory at the host root.
4. `Read` `${CLAUDE_SKILL_DIR}/references/brief-template.md` and `Write` `<run dir>/brief.md` exactly as it prescribes, from what `## Reconnaissance` and `## Entry guard` produced.

Every later append to this file - an answer under `## Decisions`, an `OVERRIDE:` line under `## Notes` - is a `Read` of the whole file followed by a `Write` of the whole file with the line added: `Edit` is disallowed here and `Write` truncates.

## Dispatch

One `Agent` call per vibe request, and one only.

- `subagent_type: superdev:vibe-implementor`. Pass no `model` and no `effort`: the agent's own frontmatter is its strength, and this track never overrides it.
- The prompt is exactly three labeled lines, every value an absolute path and never pasted content:

```
brief: <run dir>/brief.md
refs: <refs>
notes: <run dir>/notes.md
```

- `<refs>` is the output of one `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` call. Resolve it here; never hand on the unexpanded variable, which no agent can read as a path.
- Await it, then `## Verdict`.

## Verdict

Read the verdict line the agent returned, and nothing else it may have printed. Re-dispatch on the BLOCKED branch alone, once, and never finish the agent's work yourself.

- `VERDICT: PASS` -> `## Guard`.
- `VERDICT: FAIL` + `REASON: <line>` -> `## Stop` at stage `failed checks`, that `REASON:` line as the reason. The tree stays exactly as the agent left it: revert nothing here.
- `VERDICT: BLOCKED` + `REASON: <line>` -> `Read` `<run dir>/notes.md` and take every `DECISION: <what> - <why> - <options>` line off it. One `AskUserQuestion` per line, in file order, carrying that line's `<what>`, `<why>` and `<options>`: **answer it** (the user's own wording, verbatim) or **abort**.
  - Every line answered -> append each answer as one `- <answer>` bullet under the brief's `## Decisions` (whole-file rewrite), then re-dispatch the SAME `## Dispatch` call once, unchanged, and read its verdict here again. A second `VERDICT: BLOCKED` -> `## Stop` at stage `no verdict` with the second `REASON:` line as the reason.
  - **abort** on any line -> `## Stop` at stage `no verdict`, reason `decision aborted by the user`.
  - Not one `DECISION:` line in the notes -> nothing to answer and nothing to re-dispatch on: take the no-verdict branch below.
- No `VERDICT:` line at all, or a result reporting the run ended early on an API error, a spend limit, a session limit or an HTTP 429 (today's harness phrasing is a `failed` task notification reading `Agent terminated early due to an API error: You've hit your ... limit` - match on the meaning, not that wording) -> the delta is measured anyway, then put to the user:
  - `<run dir>/notes.md` exists -> run `## Guard` for its counters, then `## Stop` at stage `no verdict`, reason `implementor returned no verdict`, whatever that guard's `RESULT:` line said.
  - It does not exist -> make no guard call at all, `## Stop` at stage `no verdict`, reason `implementor returned no verdict - counters unmeasured`.

## Guard

`"${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh" <run dir>/notes.md` plus one `--sensitive '<glob>'` argument per surviving glob: one glob per argument, each inside its own single quotes, never joined into one argument and never left unquoted.

Its `files:`, `new:` and `lines:` lines are the counters `## Done` prints; its `dropped:` and `sensitive:` lines are context for the user; its last line is the verdict. Its thresholds are fixed for every host - there is nothing here to configure.

- `RESULT: OK` -> `## Commit`.
- `RESULT: OVER - <reason>` -> `## Stop` at stage `size guard`, that `<reason>` as the reason.
- `RESULT: ERROR - <reason>` -> `## Stop` at stage `size guard`, that `<reason>` as the reason. Nothing is committed on an error, and the guard is never re-run against a different notes file to get past it.

## Stop

Reached from `## Verdict`, `## Guard` or `## Commit` with a `<stage>` and a `<reason>`: `Read` `${CLAUDE_SKILL_DIR}/references/stop.md` and run it. It owns the three options (approve, revert, go to intent) and how a declared path is reduced and taken back to HEAD.

## Commit

`"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<goal sentence>" --notes <run dir>/notes.md` - the goal sentence exactly as the brief carries it, as one quoted argument, never interpolated into any other command. One commit, on the current branch: never branch, never switch, never tag, never push. The script stages the declared set only and drops everything under `.temp/`, so `brief.md` and `notes.md` never land in the commit.

- `commit: <sha>` as the last stdout line -> keep that SHA for `## Done`.
- exit 2 with `undeclared: <path>` lines -> one `AskUserQuestion` quoting those paths: **remove or stash them** (the user clears them, then re-run the same command), **include the named ones** (re-run it with one `--path <path>` per path the user named), or **abort**. Never stage anything yourself.
- `Nothing to commit.` or `Not a git repository - skipping commit.` -> no SHA; say so in `## Done`.
- exit 1 (missing message, unknown argument) -> `## Stop` with the script's stderr line as the reason and no `<stage>`. A second exit 1 ends the run at `## Done`.

## Done

Two or three status lines and nothing else - no diff, no recap of the change, no next-step advice:

- the commit SHA, or the outcome instead of one: `nothing to commit`, `committed after override`, `reverted`, `left in the tree, handed to intent`, or the stop that ended the run;
- the guard's counters as `files: <n> new: <n> lines: <n>`, or `counters unmeasured` when no guard call was made;
- `<run dir>`, plus every path skipped when reverting and every sensitive glob dropped at `## Reconnaissance`.

No writer runs on this track: no memory, no rules, no changelog, no QA document, no review fork. The commit and these lines are the whole output.

## Rules

- Never create or edit a host source file from this context. `Edit` is disallowed, `Write` is for `brief.md` alone, and the only other change this skill makes to the tree is `## Stop`'s revert of paths this run itself declared.
- Never read the full content of a file the subagent edits. Reconnaissance is `Grep` and `Glob`; the file content is the agent's context, not yours.
- Every handoff is labeled paths - the `Agent` prompt, the `intent` argument text - never pasted file content, and never a bare path with no label.
- Name nothing by a bare number: a file by its path, a check by its command, a stop by its stage, a finding by the guard's own reason.
- The only questions this track ever asks are the `## Stop` options, the `DECISION:` questions of `## Verdict` and the undeclared-change question of `## Commit`.
- `simpledebug`'s tracing discipline is not run here, not even when the request is a bug fix: vibe does what the user asked for, and which track a fix takes is the user's call, not yours.
