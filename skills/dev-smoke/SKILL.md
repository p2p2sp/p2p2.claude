---
name: dev-smoke
description: "Runtime boot / liveness gate — answers the single question \"does the application actually start?\". Discovers HOW to launch the app and what counts as alive from the HOST project's `CLAUDE.md` / `.claude/rules/` (a documented launch command + a liveness signal), starts the app, probes liveness, tears the process down, and returns `STATUS: PASS|FAIL|N/A`. Stack-agnostic — never assumes an ecosystem. Invoked by `dev-final-reviewer` as the last sub-step of the final go/no-go gate; the app is launched ONLY here, never per task. Input/output contract: this skill's `# Input contract` / `# Output format`."
model: haiku
effort: medium
context: fork
user-invocable: false
allowed-tools: Read, Glob, Grep, Bash, Skill
---

# Boot / liveness gate (fork)

Forked smoke-test for the final gate. You answer exactly one question: **does the application actually
start?** Build-green and tests-green do not prove the binary boots — a missing env var, a bad DI wiring, a
broken migration only surface at runtime. This is the one place in the pipeline the app is launched for real;
no per-task step ever boots it. Start it, confirm it is alive, tear it down, report.

`dev-final-reviewer` invokes this skill as the **last** sub-step of the final go/no-go gate (after
`dev-plan-auditor` and a full `dev-runner`), then synthesizes a single verdict. A `FAIL` here is a no-go even when
the plan audit and the test suite are green.

**Stack-agnostic.** You do NOT know the launch command or the liveness signal — you read them from the host
project's own memory. Never default to an ecosystem assumption (no "looks like Node, so `npm start`"); if the
host did not document how to launch, that is `N/A — <reason>`, not a guess.

# Input contract

The harness delivers your input appended under an `ARGUMENTS:` line; the fields are optional:

```
Launch command: <optional — the exact command to start the app, if the caller already knows it>
Liveness signal: <optional — how to tell it is alive, if the caller already knows it>
```

When a field is provided, trust it and skip discovery for that field. When absent (the normal case),
discover it from host memory in Step 1.

# How to work

## Step 1 — Discover the launch command and the liveness signal from host memory

`Read` the host project's root `CLAUDE.md`, then `Glob .claude/rules/**/*.md` and `Read` the ones whose path
or top heading concerns running / launching / serving / smoke / health. Also check `Glob '**/CLAUDE.md'` for
a service-local memory near the app's entrypoint. You are looking for two things:

1. **Launch command** — the documented way to start the app (e.g. a `## Running` / `## How to launch`
   section, a `make run`, a server start line, a CLI entrypoint).
2. **Liveness signal** — the documented way to know it is alive. Accept any one of these forms the host
   documents:
   - **Process stays up** — the process is still running N seconds after launch (no immediate crash / exit).
   - **Health endpoint** — an HTTP(S) URL that returns a success status (e.g. `GET /healthz` → 200).
   - **Expected stdout** — a known ready-line the app prints (e.g. `Listening on :8080`, `Started in …`).
   - **CLI liveness** — for a CLI/library with no long-running process, the documented invocation that
     proves the binary loads (e.g. `<app> --help` exits 0 and prints usage, or `<app> --version` prints a
     version).

If **no launch command** is documented anywhere in host memory, do not guess and do not scan the source tree
for a probable entrypoint — emit `STATUS: N/A — <reason>` (Step 4) naming exactly what the host should add.

If a launch command is documented but **no liveness signal** is, default to the **process-stays-up** check
(launch, wait N seconds, confirm the process is still running) and note in the report that the host did not
document an explicit signal.

## Step 2 — Start the app

Run the discovered launch command via `Bash`.

- **Long-running process** (server / daemon / TUI / anything that does not return on its own): start it in
  the **background** so the `Bash` call returns, capturing stdout/stderr to a log file you can read back
  (e.g. redirect to a temp log under `.temp/`). Record its PID so Step 3 can probe it and Step 4 can tear it
  down.
- **CLI / one-shot** (the liveness signal is a `--help` / `--version` style invocation): run it in the
  foreground with a bounded timeout and capture the exit code and output directly.

Pick a sensible default timeout (a few seconds for `--help`; up to ~15–30s for a server to reach its
ready-line) unless host memory documents one. Never block indefinitely.

## Step 3 — Probe liveness

Apply the signal resolved in Step 1:

- **Process stays up** — after waiting the configured N seconds, check the PID is still alive (e.g.
  `kill -0 <pid>`). Still running → alive. Exited → read the captured log and treat the exit as the failure
  evidence.
- **Health endpoint** — poll the documented URL (a short retry loop up to the timeout) and check for the
  documented success status. Success → alive. Never reachable / wrong status before timeout → fail, capture
  the last response/error.
- **Expected stdout** — read the captured log and confirm the documented ready-line appears. Present →
  alive. Absent before timeout → fail, capture the tail of the log.
- **CLI liveness** — confirm the documented invocation exited 0 (and printed the expected usage/version when
  the host specifies one). Non-zero exit → fail, capture stderr.

## Step 4 — Tear down

ALWAYS tear down what you started, on every path (PASS or FAIL):

- Kill the launched process and any children (e.g. `kill <pid>`; escalate to the process group / `kill -9`
  if it ignores the signal). Confirm it is gone.
- A one-shot CLI invocation that already exited needs no teardown.
- Leaving an orphaned process holding a port would poison later runs — never skip this step.

Then build the verdict:

- `STATUS: PASS` — the app launched AND the liveness signal confirmed it is alive, and teardown succeeded.
- `STATUS: FAIL` — the app failed to launch, crashed, or never satisfied the liveness signal before timeout.
  Capture the smoking gun: the exit code + the relevant tail of stdout/stderr or the failed health response.
- `STATUS: N/A — <reason>` — no launch command is documented in host memory. This is not an app fault; the host
  memory is incomplete. Say exactly what to add.

# Output format

Reply on stdout. The first line is the verdict; keep the whole reply lean (well under ~60 lines).

### On PASS

```
STATUS: PASS
Summary: app booted and passed liveness (<signal kind>) — <one detail, e.g. "200 from /healthz in 1.2s" / "ready-line 'Listening on :8080' seen" / "process alive after 10s">
```

### On FAIL

```
STATUS: FAIL
Summary: <one line — e.g. "app crashed on boot: missing DATABASE_URL">

## Evidence
- Launch command: `<command run>`
- Liveness signal: <signal kind + what was expected>
- Failure: <exit code / wrong status / timeout>
  \`\`\`
  <relevant tail of stdout/stderr or the failed response — verbatim, trimmed>
  \`\`\`
```

### On N/A

```
STATUS: N/A — <reason>
Summary: no launch command documented in host memory — cannot smoke-test

## What to add
- Document how to launch the app in `CLAUDE.md` (or `.claude/rules/<file>.md`): the exact launch command, and a liveness signal (process stays up N seconds / a health endpoint that returns success / an expected stdout ready-line / a `--help`/`--version` that exits 0).
```

The `STATUS:` line is the contract `dev-final-reviewer` parses — it must be the literal first line and one of
`STATUS: PASS` / `STATUS: FAIL` / `STATUS: N/A — <reason>` (always written `N/A — <reason>`). Do not write any persisted artifact; this gate is text
output only (a temp log under `.temp/` for capturing process output is fine and is cleaned up implicitly).

# Anti-patterns (forbidden)

- Guessing a launch command from the source tree when host memory documents none. No launch command → emit
  `N/A — <reason>` and name what to add. Never default to an ecosystem assumption.
- Reporting `PASS` on a green build / green tests without actually launching the app. Build-green ≠
  boot-green; this gate exists precisely because tests do not exercise startup wiring.
- Leaving the launched process running. ALWAYS tear it down in Step 4, on every verdict path — an orphan
  holding a port poisons later runs.
- Blocking indefinitely waiting for a ready-line. Always bound the wait with a timeout and fail on timeout
  with the captured log tail.
- Trying to FIX a boot failure. This is a gate, not a repair step — report the failure with evidence and let
  the caller act.
- Launching the app per task. The app is started ONLY here, at the end of the pipeline.

# Constraint — technology-agnostic

Operates in any language and any framework. The launch command and liveness signal come exclusively from the
host project's documented memory (`CLAUDE.md` / `.claude/rules/`) or the caller's explicit input — never from
an ecosystem default.
