
## Task 5 - Read the handed gate block in the three build reviewers
- TDD: none
- Kind: text
- Model: opus
- Covers: `Sprawdzenie nie wstrzymuje następnego zadania` (#1), `Ocena checkpointu tylko gdy jest powód` (#7), `Wynik bramy w raporcie każdego oceniającego` (#10), `Reguła bramy wspólna dla obu ciężarów biegu` (#11)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `gates:` label these agents read

### Files
- modify - superdev/agents/superbuild-reviewer-change.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/superbuild-reviewer-spec.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/simplebuild-reviewer.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/CLAUDE.md (`## Entry points`, `## Contracts & invariants`)
- modify - superdev/README.md (the build reviewers' dispatch label lists, the `executor` row, and every sentence naming who runs the gate block)

### Task Checks
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-change.md
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-spec.md
- grep -n 'run no gate command' superdev/agents/simplebuild-reviewer.md
- grep -n 'gates:' superdev/agents/CLAUDE.md superdev/README.md

### Approach
1. `Model: opus` because this task propagates one vocabulary change across five files whose wordings differ, and each restatement has to stay true to the contract Task 1 fixed rather than to the sentence it replaces.
2. In each of the three reviewer agents, replace the `runner` entry of `## Input` with a `gates` entry - required, the block the orchestrator's own gate run wrote for this round - extend the `prior` entry so it covers a round closed with no reviewer dispatch, whose gate block arrives here carrying no finding IDs, and add `gates` to the `## Contract` input-error line that today names `stage`, `since` and `prior`. In each frontmatter `description:`, replace whatever wording that agent uses to claim it runs the plan's gate commands for its stage before reading any code - the three phrase it differently - with the reading of the handed block.
3. In each of the three reviewer agents, rewrite the `## Gates` section's first paragraph: the first working step at every stage is to read the block on `gates`, one entry per command the orchestrator already ran, and to record one line per subsection in the report's gates section; state in each that you run no gate command yourself; the contract's `## Gates` still decides which subsections the stage covers and owns every BLOCKED condition.
4. In each, keep the `superdev:executor` analysis-mode paragraph unchanged in substance but source its input from the handed block's `LOG`, `EXIT` and `DURATION` lines rather than from a run of the reviewer's own, and keep raw `Bash` reserved for git, file inspection and probes under `.temp/`.
5. In `superbuild-reviewer-change.md` and `superbuild-reviewer-spec.md`, replace the concurrency paragraph: neither dimension runs a gate command any more, so both record the same handed block and nothing is shared between their runs.
6. In `simplebuild-reviewer.md`, replace the single-reviewer sentence with the same handed-block wording.
7. In `superdev/agents/CLAUDE.md`, replace the `runner:` half of the label sentence under `## Contracts & invariants` with `gates:`, record in `## Entry points` that the per-task reviewer judges the commit ranges handed on `range:` and is dispatched beside the next task's implementor where the index allows it, restate the code dimension's checkpoint sentence as a round that runs its agent only on one of the three stated conditions, and drop the clause of the final-pair paragraph saying the two dimensions share the working tree their gate commands run against - neither runs one any more.
8. In `superdev/README.md`, replace `runner:` with `gates:` in every build reviewer's dispatch label list, and rewrite every sentence that today says a review round or a reviewer runs the plan's `## Gate commands` block - the `executor` row included - so the catalog page names the orchestrator as the runner and the reviewers as readers, while keeping the `executor` fork on `RESULT: DEVIATION` exactly as it stands. Rewrite two further sentences against the new order: the one saying a task goes from the implementor's `VERDICT: PASS` straight to commit, which now holds for every task rather than only a `Review: none` one, and the `superbuild-reviewer-change` row's description of the checkpoint after every fifth committed task, which now runs its agent conditionally - the `simplebuild-reviewer` row keeps its unconditional wording, because that track's checkpoint stays unconditional.

### Failure modes
- when the handed block carries no entry for a subsection the stage covers -> response record that subsection's line as missing and return `VERDICT: BLOCKED` with a `### Needs decision` bullet naming it, log that bullet, test none - agent prose
- when `gates` is absent or unreadable -> response return line 1 `VERDICT: FAIL` and line 2 `REASON: missing input gates`, writing no report, log that return line, test none - agent prose

### Contracts
none - this task consumes the `gates:` contract Task 1 defines and introduces none of its own

### DoD
All three build reviewers read their round's gate results from `gates` and run no gate command, and `superdev/agents/CLAUDE.md` and `superdev/README.md` both record `gates:` in place of `runner:`.


### Covered criteria
1. Sprawdzenie nie wstrzymuje następnego zadania - Sprawdzenie ukończonego zadania biegnie
   równocześnie z pracą nad następnym, gdy następne nie korzysta z wyniku sprawdzanego ani nie
   sięga do tych samych plików.
7. Ocena checkpointu tylko gdy jest powód - Ocena checkpointu odbywa się wyłącznie wtedy, gdy
   któraś komenda bramy odbiegła od oczekiwania, któreś zadanie w oknie zostało zgłoszone jako
   wadliwe albo któreś zadanie w oknie nie podlegało sprawdzeniu.
10. Wynik bramy w raporcie każdego oceniającego - Wynik tego jednego uruchomienia jest widoczny
    w raporcie każdego oceniającego z tej rundy.
11. Reguła bramy wspólna dla obu ciężarów biegu - Zasada pojedynczego uruchomienia obowiązuje
    w biegu lżejszym tak samo jak w cięższym.
