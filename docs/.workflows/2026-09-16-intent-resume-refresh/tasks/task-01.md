
## Task 1 - feat(superdev): refresh resumed intents with a delta since their date
- Covers: criteria #1, #2
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none - first task

### Files
- add - superdev/skills/intent/references/refresh-template.md
- modify - superdev/skills/intent/SKILL.md (## Resume from a file, ## Refresh on resume, ## Synthesis)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/portability.test.ts` - expected: all tests pass (its `!` preload sweep reads every SKILL.md, so the edited `intent/SKILL.md` is in scope)

### Approach
1. Write `superdev/skills/intent/references/refresh-template.md` in the shape of the sibling `intent-template.md`: a `## Content rules` section plus a fenced `## Template`. Template preamble `# Refresh: <intent title>`, `Date:`, `Intent:` (repo-relative path of the refreshed file), `Baseline:` (that file's own `Date:` value). Body sections in this order: `## Since the baseline`, `## Delivered state`, `## Other movement`, `## Impact on decisions` - each `- <...>` bullets or the single bullet `none`. Content rules: write it in the interview's language; repo-relative paths only; never copy a changelog entry wholesale, one line per finding; `## Impact on decisions` names the intent's decision numbers and nothing else.
2. In `superdev/skills/intent/SKILL.md` add a new section `## Refresh on resume` between `## Resume from a file` and `## Explore first`, carrying the whole step: read the resumed file's `Date:` line, then decide whether there is anything to compare - anything present under `docs/changelog/` newer than that date, any sibling phase directory under the resumed file's `phases/` parent, or any commit since that date.
3. In that section, for the non-empty case dispatch two `Explore` agents in parallel in one batch. History agent: grep `docs/changelog/README.md` and the entry filenames for dates after `Baseline:`, open the matches, follow their `ADR:` links, and independently `Grep docs/adr/`; for a file under a `phases/` segment also open the entries of this run's earlier phases. Code agent: verify every `Delivers:` claim named in `## Constraints` and every other `## Constraints` bullet against the repo, and run `git log --since=<Baseline> --oneline` itself to find movement the changelog does not record.
4. In that section, for the empty case skip both agents and go straight to the write.
5. End the section by reading `references/refresh-template.md` and `Write`ing `<directory of the resumed file>/refresh.md` exactly as it prescribes, then rewire the first bullet of `## Resume from a file` so the presentation of `## Decisions` happens after this step and names the decisions that `## Impact on decisions` flags.
6. In `## Synthesis`, after the `Write` of `intent.md` on a fresh run, `Write` the same-shaped `refresh.md` next to it, filled from what `## Explore first` already found (`## Since the baseline` from the history agent, `## Delivered state` and `## Other movement` as `none - fresh run`, `## Impact on decisions` as `none - written with this intent`), so no exit from this skill reaches the handoff without the file Task 2's gate requires. A greenfield request that skipped exploration altogether writes every section as `none`, the same shape as the empty resume case.

### Failure modes
- when the resumed intent carries no line matching `^Date: \d{4}-\d{2}-\d{2}` -> response: treat the baseline as unknown, run both agents without `--since` and over the whole `docs/changelog/` index, log `Baseline: unknown` in `refresh.md`, test: resume an `intent.md` with its `Date:` line deleted and confirm `refresh.md` is written with `Baseline: unknown`
- when `docs/changelog/` and `docs/adr/` are both absent -> response: the history agent is not dispatched at all, log `## Since the baseline` as the single bullet `none`, test: resume an intent in a repo without either directory and confirm the section reads `none` and no history agent ran
- when the host is not a git repository or has no commits -> response: the code agent skips `git log` and verifies `Delivers:` and `## Constraints` by Read/Grep/Glob only, log `## Other movement` as the single bullet `none`, test: resume an intent in a directory that is not a git repository and confirm `refresh.md` is still written
- when an `Explore` agent returns nothing usable -> response: write the section it owned as the single bullet `none` and never block the write of `refresh.md`, log that section as `none`, test: resume an intent and confirm `refresh.md` exists with every mandatory section present even when a section is empty

### Contracts
- `refresh.md` file contract: path `<directory of the resumed intent file>/refresh.md`; preamble `# Refresh:`, `Date:`, `Intent:`, `Baseline:`; mandatory sections `## Since the baseline`, `## Delivered state`, `## Other movement`, `## Impact on decisions`; the empty case is the same file with every section reading `none` and `## Impact on decisions` reading `none - no change since <Baseline>`. Consumed by Task 2.
- `<Baseline>` is the `Date:` value read out of the resumed intent file and is the only value this task feeds into a shell command (`git log --since=<Baseline> --oneline`); validation rule: it is used only when it matches `^\d{4}-\d{2}-\d{2}$` exactly, otherwise the command runs without `--since`.
- `refresh.md` is written on every path that writes an `intent.md` - the resume branch and the fresh `## Synthesis` write alike - never conditionally. That invariant is the precondition Task 2's gate relies on, and it is what keeps a fresh interview from being bounced back into `intent` by its own gate.

### DoD
`superdev/skills/intent/references/refresh-template.md` exists; `superdev/skills/intent/SKILL.md` carries `## Refresh on resume` whose last step writes `refresh.md` in both the empty and non-empty case, and its `## Synthesis` writes `refresh.md` beside every freshly written `intent.md`; `node --test tests/portability.test.ts` green.


### Covered criteria
1. Każdy zapis `intent.md` przez skill `intent`, świeży i wznowiony, kończy się zapisanym obok plikiem `refresh.md`, także gdy nie ma czego porównać - wtedy plik jawnie stwierdza brak zmian od `Date:`. Żadna ścieżka wyjścia z `intent` nie prowadzi do handoffu bez tego pliku.
2. Niepusty `refresh.md` zapisany przy wznowieniu niesie deltę od `Date:` intentu z trzech źródeł: wpisów `docs/changelog/` wraz z ich ADR-ami, weryfikacji deklaracji `Delivers:` oraz `## Constraints` wobec repo, i listy tematów z `git log --since`.
