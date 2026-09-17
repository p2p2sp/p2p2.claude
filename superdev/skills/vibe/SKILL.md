---
name: vibe
description: >-
  Use when the user explicitly asks to skip the planning ceremony and have a small change made right away - signals such as "vibe", "od ręki", "just do it", "bez planu", "no plan", or the command /superdev:vibe. That list is illustrative, never exhaustive: what routes here is the explicit demand to drop the ceremony, not the word "now" or "fast" inside an ordinary change request. "vibe: zmień etykietę przycisku na Zapisz" enters this track; "dodaj teraz eksport do CSV" goes to intent. It takes a small bug fix too, but only when the user asks for vibe explicitly. It never fires for a request the user wants designed, discussed, specified or planned, and never as a shortcut you choose for them.
argument-hint: [one-sentence change]
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, AskUserQuestion, Skill, ExitPlanMode, Bash(date:*)
disallowed-tools: Edit, NotebookEdit, WebFetch, WebSearch
user-invocable: true
---

# Vibe

One request, one subagent, one commit. No interview, no spec, no plan, no reviewer, no knowledge layer.

You resolve, guard, dispatch and commit. The change itself is made by `superdev:vibe-implementor` and by
nothing else: this context reads no source file whole and edits none at all.

The guard is an advisor, never a gate. Every stop below puts the finding to the user and every explicit
choice of theirs wins over it, recorded as an `OVERRIDE:` line in the brief before the run goes on.

## Plan mode

Plan mode active -> run `ExitPlanMode` at once, before the first `Read`, `Grep`, `Glob` or `Bash` call of
`## Preflight`. This is an execution track: there is no plan to present and nothing here to approve.

## Preflight

Both checks run before anything is read, written or dispatched, and neither writes a file.

1. `Agent` tool present in your tool pool? Every change on this track is made by
   `superdev:vibe-implementor` through it. Its absence means the harness lost the tool, never that you may
   make the change in its place: STOP at once, report exactly these four lines, and end the turn.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was implemented, written or committed in its place.
State: <run directory>, or "no brief written yet".
Fix: exit this session, restart with `claude --resume`, then run `/superdev:vibe <the same request>` again.
```

2. `git rev-parse --git-dir` - a non-zero exit -> STOP with the single line
   `vibe needs a git repository - nothing was changed.`; dispatch nothing and write nothing. The track
   commits, and `## Stop`'s revert takes files back to HEAD: neither exists without a repository.
3. `git rev-parse --show-toplevel` - keep its value as `<root>`. Every path handed to an agent, a script
   or a skill below is absolute and joined from it, and `## Stop` measures every declared path against it.

## Reconnaissance

Read as little as it takes to know which files the request names and how the host proves them.

- `Grep` / `Glob` for the symbols, names and paths the request carries. Never `Read` a whole source file:
  that content belongs in the subagent's context, not in yours. `Read` here is for the host's memory files
  and for this skill's own brief template.
- Host memory - the root `CLAUDE.md`, every child node it points at, and every file under
  `.claude/rules/`. Two things come out of it, and nothing about the host's stack is assumed anywhere:
  - **Checks** - the commands the memory declares for the area this request touches (build, test, lint,
    type-check, format). Copy each verbatim; never invent one, never widen a scoped command into the full
    suite, never substitute a command you know from another project. The memory declares none for that
    area -> the brief's `## Checks` is the single line `none - <what the memory does not declare>`. That
    is a complete run, not a failure.
  - **Sensitive paths** - every path, directory or file class the memory describes, in any wording at all,
    as sensitive, protected, critical, security-relevant, generated, migration-bearing or requiring review
    before a change. No fixed marker and no dedicated section is required. A memory describing none leaves
    this list empty, and that host is judged by the size thresholds alone.
- Each sensitive path becomes one glob, written to match a repository-relative path (`*` crosses `/`; it
  is a shell glob, never a regex). A glob is kept only when it is a single line carrying no `'` and no
  `"`; anything else is dropped, named in one `## Done` status line, and the surviving globs still go to
  the guard.
- What leaves this section: the expected file list, the check commands, the surviving sensitive globs.

## Entry guard

The first stop, and the only one that never reaches `## Stop`. The request is a vibe when all five hold:

- its goal fits ONE sentence;
- reconnaissance named the files it touches;
- it adds no new module, component or service;
- it introduces no new contract between components - an API shape, a schema, a message, a stored format, a
  public signature something else consumes;
- none of the sensitive globs matches a file it would touch.

All five hold -> `## Brief`. Any one fails -> say in ONE sentence which one fails and why, offer `intent`
with the same request as the alternative, and stop there: no `AskUserQuestion`, no brief, no subagent, no
change in the repository.

The user answering that refusal with an explicit "vibe anyway" / "mimo to vibe" -> go on to `## Brief` and
carry `OVERRIDE: entry guard - <the reason you just gave>` into the brief's `## Notes`. Their explicit
choice outranks this stop; that line is the record of it.

## Brief

One file, and the only file this skill ever writes.

1. `date +%Y%m%d-%H%M%S` once -> `<timestamp>`.
2. `<slug>` - the goal's words lowercased, every run of non-alphanumerics folded to a single `-`, joined
   by `-`, cut at 40 characters.
3. `<run dir>` is `<root>/.temp/superdev/vibe/<timestamp>-<slug>/`. Nothing of this run is written
   anywhere else - never under `docs/.workflows/`, never in a plugin-named directory at the host root.
4. `Read` `references/brief-template.md` (relative to this skill's own directory) and `Write`
   `<run dir>/brief.md` exactly as it prescribes: `Goal:` the request in one sentence, `## Files` the
   expected file list, `## Checks` the host's commands or `none - <reason>`, `## Sensitive` the surviving
   globs or `none`, `## Decisions` `none`, `## Notes` the `OVERRIDE:` line when the entry guard was
   overridden and `none` otherwise.

Every later append to this file - an answer under `## Decisions`, an `OVERRIDE:` line under `## Notes` -
is a `Read` of the whole file followed by a `Write` of the whole file with the line added: `Edit` is
disallowed here and `Write` truncates.

## Dispatch

One `Agent` call per vibe request, and one only.

- `subagent_type: superdev:vibe-implementor`. Pass no `model` and no `effort` parameter: the agent's own
  frontmatter is its strength, and this track never overrides it.
- The prompt is exactly three labeled lines, every value an absolute path and never pasted content:

```
brief: <run dir>/brief.md
refs: <refs>
notes: <run dir>/notes.md
```

- `<refs>` is the output of one `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` call. Resolve it here;
  never hand on the unexpanded variable, which no agent can read as a path.
- Await it, then `## Verdict`.

## Verdict

Read the verdict line the agent returned, and nothing else it may have printed.

- `VERDICT: PASS` -> `## Guard`.
- `VERDICT: FAIL` + `REASON: <line>` -> `## Stop` at stage `failed checks`, that `REASON:` line as the
  reason. The tree stays exactly as the agent left it: revert nothing here.
- `VERDICT: BLOCKED` + `REASON: <line>` -> `Read` `<run dir>/notes.md` and take every
  `DECISION: <what> - <why> - <options>` line off it. One `AskUserQuestion` per line, in file order,
  carrying that line's `<what>`, `<why>` and `<options>`: **answer it** (the user's own wording, taken
  verbatim) or **abort**.
  - Every line answered -> append each answer as one `- <answer>` bullet under the brief's `## Decisions`
    (whole-file rewrite, see `## Brief`), then re-dispatch the SAME `## Dispatch` call once, unchanged,
    and read its verdict here again. A second `VERDICT: BLOCKED` -> `## Stop` at stage `no verdict` with
    the second `REASON:` line as the reason.
  - **abort** on any line -> `## Stop` at stage `no verdict`, reason `decision aborted by the user`.
  - Not one `DECISION:` line in the notes -> there is no stop to answer and nothing to re-dispatch on:
    take the no-verdict branch below.
- No `VERDICT:` line at all, or a result reporting the run ended early on an API error, a spend limit, a
  session limit or an HTTP 429 (today's harness phrasing is a `failed` task notification reading
  `Agent terminated early due to an API error: You've hit your ... limit`; treat that wording as one
  example and match on the meaning) -> the delta is measured anyway, then put to the user:
  - `<run dir>/notes.md` exists -> run `## Guard` for its counters, then `## Stop` at stage `no verdict`
    with the reason `implementor returned no verdict`, whatever that guard's `RESULT:` line said.
  - It does not exist -> make no guard call at all and go straight to `## Stop` at stage `no verdict` with
    the reason `implementor returned no verdict - counters unmeasured`.

Re-dispatch on the BLOCKED branch alone, once, and never finish the agent's work yourself.

## Guard

`bash "${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh" <run dir>/notes.md` plus one `--sensitive '<glob>'`
argument per surviving glob: one glob per argument, each inside its own single quotes, never joined into
one argument and never left unquoted.

Its `files:`, `new:` and `lines:` lines are the counters `## Done` prints; its `dropped:` and `sensitive:`
lines are context for the user; its last line is the verdict.

- `RESULT: OK` -> `## Commit`.
- `RESULT: OVER - <reason>` -> `## Stop` at stage `size guard`, that `<reason>` as the reason.
- `RESULT: ERROR - <reason>` -> `## Stop` at stage `size guard`, that `<reason>` as the reason. Nothing is
  committed on an error, and the guard is never re-run against a different notes file to get past it.

The guard advises and never gates: `OVER` is a finding to put to the user, never a refusal of your own,
and its thresholds are fixed for every host - there is nothing here to configure.

## Stop

Reached from `## Verdict`, `## Guard` or `## Commit`, each carrying a `<stage>` and a `<reason>`. Nothing
is committed automatically and nothing is reverted before the user has answered.

One `AskUserQuestion`, exactly three options, the `<reason>` stated in the question text and each option's
own outcome in its label:

1. **approve** - commit it anyway. Append `OVERRIDE: <stage> - <reason>` under the brief's `## Notes`
   (whole-file rewrite), then `## Commit`.
2. **revert** - take every declared path back to HEAD, per `### The declared paths` below. Its description
   warns in its own words that any edit made to those same files before this run and never committed goes
   with it; a file this run did not declare is left exactly as it is.
3. **go to intent** - leave the diff exactly as it stands, commit nothing, and invoke the `intent` Skill
   with an argument text carrying the goal sentence, the absolute `brief.md` path and the declared path
   list, so the interview starts with the work already in the tree in front of it.

`<stage>` is one of `entry guard`, `size guard`, `failed checks`, `no verdict`; nothing else is ever
written on an `OVERRIDE:` line.

### The declared paths

Both the revert option and the intent handoff work off the `touched: <value>` lines of
`<run dir>/notes.md`, reduced exactly as `commit-task.sh` and `vibe-guard.sh` reduce them, so all three
read one notes file the same way: cut `<value>` at the first ` - ` or ` (`, whichever comes first; turn
every `\` into `/`; an absolute path inside `<root>` becomes relative to `<root>`. A value that cuts to
nothing declares nothing.

A reduced path that resolves outside `<root>` or still carries a `..` segment is never handed to
`git checkout` and never deleted: skip it and name it in a `## Done` status line. Per surviving path:

- tracked (`git ls-files --error-unmatch -- <path>` succeeds) -> `git checkout -- <path>`;
- untracked but present as a file -> delete it;
- neither tracked nor present -> skip it and name it in a `## Done` status line.

## Commit

`bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<goal sentence>" --notes <run dir>/notes.md` - the
goal sentence exactly as the brief carries it, as one quoted argument, never interpolated into any other
command. One commit, on the current branch: never branch, never switch, never tag, never push. The script
stages the declared set only and drops everything under `.temp/`, so `brief.md` and `notes.md` never land
in the commit.

- `commit: <sha>` as the last stdout line -> keep that SHA for `## Done`.
- exit 2 with `undeclared: <path>` lines -> one `AskUserQuestion` quoting those paths: **remove or stash
  them** (the user clears them, then re-run the same command), **include the named ones** (re-run it with
  one `--path <path>` per path the user named), or **abort**. Never stage anything yourself.
- `Nothing to commit.` or `Not a git repository - skipping commit.` -> no SHA; say so in `## Done`.
- exit 1 (missing message, unknown argument) -> `## Stop` with the script's stderr line as the reason and
  no `<stage>`: no guard verdict is being overridden here, so its **approve** option writes no `OVERRIDE:`
  line and re-runs this same command once instead. A second exit 1 ends the run at `## Done`.

## Done

Two or three status lines and nothing else - no diff, no recap of the change, no next-step advice:

- the commit SHA, or the outcome instead of one: `nothing to commit`, `committed after override`,
  `reverted`, `left in the tree, handed to intent`, or the stop that ended the run;
- the guard's counters as `files: <n> new: <n> lines: <n>`, or `counters unmeasured` when no guard call
  was made;
- `<run dir>`, plus every path skipped at `### The declared paths` and every sensitive glob dropped at
  `## Reconnaissance`.

No writer runs on this track: no memory, no rules, no changelog, no QA document, and no review fork. The
commit and these lines are the whole output.

## Rules

- Never create or edit a host source file from this context. `Edit` is disallowed, `Write` is for
  `brief.md` alone, and the only other change this skill makes to the tree is `## Stop`'s revert of paths
  this run itself declared.
- Never read the full content of a file the subagent edits. Reconnaissance is `Grep` and `Glob`; the file
  content is the agent's context, not yours.
- Every handoff is labeled paths - the `Agent` prompt, the `intent` argument text - never pasted file
  content, and never a bare path with no label.
- Name nothing by a bare number: a file by its path, a check by its command, a stop by its stage, a
  finding by the guard's own reason.
- Every stop is advisory. The user's explicit choice wins over it at the entry guard exactly as at the
  size guard, and every override is recorded as an `OVERRIDE: <stage> - <reason>` line in the brief before
  the run continues.
- No interview question, no spec, no plan, no reviewer. The only questions this track ever asks are the
  `## Stop` options, the `DECISION:` questions of `## Verdict` and the undeclared-change question of
  `## Commit`.
- `simpledebug`'s tracing discipline is not run here, not even when the request is a bug fix: vibe does
  what the user asked for, and which track a fix takes is the user's call, not yours.
