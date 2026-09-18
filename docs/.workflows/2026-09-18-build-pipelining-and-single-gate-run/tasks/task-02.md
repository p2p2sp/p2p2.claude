
## Task 2 - Write run-gate.sh and its test
- TDD: none
- Kind: code
- Model: opus
- Covers: `Dowód maszynowy na każdym checkpoincie` (#6), `Komenda bramy raz na rundę` (#9)

### Dependencies
none - the script's own contract is self-contained

### Files
- add - superdev/scripts/run-gate.sh
- add - tests/superdev/run-gate.test.ts

### Task Checks
- tests/superdev/run-gate.test.ts - node --test tests/superdev/run-gate.test.ts

### Approach
1. Write `superdev/scripts/run-gate.sh` with `#!/usr/bin/env bash`, mode `100755`, and a header comment carrying its full I/O contract in English, in the shape `commit-task.sh` uses. Signature: `run-gate.sh <workdir> <stage> <out-file>`, `<stage>` one of `checkpoint`, `final`, `re-review:<closing-stage>`. Leave `set -e` out and argue that in the header the way `run.sh` does: a failing gate command is this script's ordinary result, not its own error, so an exiting shell would destroy the very block it exists to write.
2. Read `<workdir>/plan.md`, take the `## Gate commands` block above the first `<!-- TASK -->` marker, and select subsections by stage: `checkpoint` takes `#### Build` and `#### Tests`, `final` takes all three, `re-review:<closing-stage>` takes the set of the stage it names.
3. Run each selected command through the sibling runner resolved from the script's own location (`skills/executor/scripts/run.sh` under the plugin root), one invocation per command, feeding `command:`, `expect-exit: 0` and `timeout: 1800` on stdin. That timeout is a fixed constant of this script, stated in its header comment as the generous bound a deterministic caller can set without judging a host's suite; the runner's own default of 600 is too short for a slow one.
4. A subsection reading `none - <reason>` is not run and carries that reason.
5. Write `<out-file>` whole: first line `# <closing stage> review` (`checkpoint` or `final`), then a `## Gates` section with one line per subsection in the report skeleton's shape `<subsection> - <result> - <wall time>`, then one `### <subsection>` detail block per command carrying every line the runner printed for it, verbatim and in its order - `RESULT`, `STATUS`, `EXIT`, `DURATION`, `LOG`, `LINES` and, when the runner printed one, `TAIL`; on the runner's pre-launch error path that is the shorter `RESULT`, `STATUS`, `REASON` triple instead. Nothing is filtered: a reviewer's evidence rules read `TAIL` and `LOG` off this block.
6. Print to stdout one `<subsection>: <result>` line per subsection run, then `GATES: <out-file>` and finally `RED: yes` when any command came back anything other than `RESULT: SUCCESS`, `RED: no` otherwise. Exit 0 whatever the commands returned; a command's outcome is data on the `RED:` line, never the script's status.
7. Write `tests/superdev/run-gate.test.ts` against the harness of `tests/CLAUDE.md`: `withTempDir` plus a fixture plan, `runScript` for execution, `slash()` for every printed path. Cover the stage-to-subsection selection, a `none - <reason>` subsection, a green run and a red run.

### Failure modes
- when `<workdir>/plan.md` is absent or holds no `## Gate commands` block -> response print nothing on stdout at all, no `GATES:` and no `RED:` line, and exit 1, so an empty stdout can never be misread as a green round, log the reason on stderr, test the missing-plan case in `tests/superdev/run-gate.test.ts`
- when a required argument is missing -> response print the usage line on stderr and exit 1, log that same line, test the no-argument case in `tests/superdev/run-gate.test.ts`
- when `<stage>` is outside its accepted set -> response print the usage line naming that set on stderr and exit 1, running no command and writing no file, log that same line, test the invalid-stage case in `tests/superdev/run-gate.test.ts`
- when `<out-file>` cannot be written -> response exit 2 with the reason on stderr and no stdout block, log that reason, test the unwritable-directory case in `tests/superdev/run-gate.test.ts`
- when the sibling runner cannot be resolved from the script's own location -> response exit 2 with the resolved path on stderr, log that path, test none - the path is fixed inside the plugin tree and a test would assert a constant
- when the runner itself exits 2 on its pre-launch error path for one command -> response keep going with the remaining commands, carry that command's `RESULT` / `STATUS` / `REASON` triple into the block and count it as red on the `RED:` line, since a command that never launched is a result about the round rather than a fault of this script, log that triple, test the pre-launch-error case in `tests/superdev/run-gate.test.ts`

### Contracts
- `<stage>` accepted set, closed: exactly `checkpoint`, `final`, or `re-review:` followed by `checkpoint` or `final`; every other value exits 1 with the usage line - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)
- `<out-file>` is used verbatim as given and the script derives no name of its own, so a caller passing a `re-review:` stage still names the file itself - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)
- stdout shape, the orchestrator's whole reading: on exit 0, `<subsection>: <result>` lines, then `GATES: <path>`, then `RED: yes|no` as the last line; on any non-zero exit, nothing on stdout at all - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)

### DoD
`run-gate.sh` runs a stage's gate set once, writes the round's gate block and prints `RED:` as its last line; `node --test tests/superdev/run-gate.test.ts` is green.


### Covered criteria
6. Dowód maszynowy na każdym checkpoincie - Każdy checkpoint niesie maszynowy dowód, że budowa
   i testy z planu przechodzą, niezależnie od tego, czy cokolwiek w oknie zostało zgłoszone.
9. Komenda bramy raz na rundę - Każda komenda bramy danego etapu wykonuje się w tej rundzie
   dokładnie raz, choćby jej wynik czytało wielu oceniających.
