
## Task 4 - Set the planner rules that keep endpoint contracts, user-visible text, mid-operation failures and whole-repository commands where they belong
- TDD: none
- Model: opus
- Effort: high
- Covers: `Nowy endpoint ma kontrakt` (#15), `Tekst dla użytkownika ma właściciela` (#16), `Awaria w połowie operacji ma decyzję` (#17), `Cały projekt tylko w bramce końcowej` (#18)

### Dependencies
- none

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule` range, `## Blocking classes` B18-B21, `## Advisory (NOTES)` range, `## Author self-check`)
- modify - superdev/skills/superplan/SKILL.md (**Gate commands** bullets, the `Then write each task's sections so the checklist's Blocking classes B9-B14 have nothing to flag:` list, **Task Checks** `narrowest scope` criterion, `### Self-Review` range)
- modify - superdev/skills/simpleplan/SKILL.md (the same four places)
- modify - superdev/skills/superplan-reviewer/SKILL.md (the `FINDINGS - Blocking only` bucket line's `B1-B17` range)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (the same bucket line)
- modify - superdev/skills/superplan/templates/plan.md (`## Gate commands`, `### Failure modes` and `### Contracts` placeholders)
- modify - superdev/skills/simpleplan/templates/plan.md (the same placeholders)

### Task Checks
- grep -n "B18\|B19\|B20\|B21" superdev/references/plan-review-checklist.md
- grep -n "B9-B14 and B18-B21" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md
- grep -n "B1-B21" superdev/skills/superplan-reviewer/SKILL.md superdev/skills/simpleplan-reviewer/SKILL.md superdev/references/plan-review-checklist.md
- grep -c "copy:" superdev/skills/superplan/templates/plan.md
- grep -n "whole repository" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md

### Approach
1. In the checklist, append four Blocking classes after B17: B18 `New endpoint with no contract` - a task whose `### Approach` adds an HTTP endpoint, route or handler and whose `### Contracts` carries no request shape, response shape and status codes for it; settled by reading `### Approach` against `### Contracts`. B19 `User-visible text with no owner` - a task whose `### Approach` or `### Files` produces text a person reads (a message, a screen, an error message, a text resource) and neither carries that text nor a `copy: implementor, after <existing key or file>` line under `### Contracts`; settled by reading those three sections. B20 `Mid-operation failure with no decision` - a task whose `### Approach` has a step made of a persisted write followed by an outside action (a send, a call, a job hand-off) and whose `### Failure modes` has no bullet for a failure between the two; settled by reading `### Approach` against `### Failure modes`. B21 `Whole-repository command outside the final gate` - a `#### Build` or `#### Tests` line, or a `### Task Checks` line, that builds or tests the whole repository, solution or workspace while the host's runner and memory files offer a narrower scope (one project, one path, one suite) covering what the plan moves; a whole-repository build or full suite belongs under `#### Integration` alone, which runs at the final review and its re-review only; settled by reading the command against the host's memory files and the plan's `### Files`. Add the four to `## Author self-check` as one bullet each.
2. In both plan skills, retitle the list to `B9-B14 and B18-B21` and append three bullets in the skills' own bullet style: the endpoint contract bullet, the user-visible text bullet naming the `copy: implementor, after <existing key or file>` delegation line, and the mid-operation failure bullet naming the `### Failure modes` shape.
3. In both plan skills' **Gate commands** paragraph, add one bullet after `Take the narrowest scope that still proves the change`: `#### Build` and `#### Tests` run at every checkpoint, so they never carry a whole repository, solution or workspace command when a narrower scope exists - a full build or full suite, when its result is worth having at all, goes under `#### Integration`, the final review's own gate; and in the **Task Checks** paragraph add one sentence to the `narrowest scope` criterion: a command that builds or tests the whole repository never appears here, whatever the task moves.
4. In both templates, extend the `### Contracts` placeholder with the endpoint contract and the `copy:` delegation line, the `### Failure modes` placeholder with the mid-operation failure between a write and an outside action, and the `## Gate commands` placeholder with the sentence that `#### Build` and `#### Tests` carry the narrowest proving scope and a whole-repository command belongs under `#### Integration` only.
5. Widen every hardcoded Blocking range from `B1-B17` to `B1-B21`: the checklist's `## Evidence rule` sentence and its `## Advisory (NOTES)` opening sentence (`Everything real but not in B1-B17`), both plan reviewers' `FINDINGS - Blocking only` bucket line, and both plan skills' `### Self-Review` sentence (`B1-B17 plus ## Author self-check`).

### Failure modes
- none - reference and skill text

### Contracts
- Checklist classes B18, B19, B20, B21 with their titles, filed under FINDINGS by both plan reviewers - consumed by `Judge every implementor decision at the per-task gate` (Task 5)
- Delegation line `copy: implementor, after <existing key or file>` under `### Contracts` - consumed by `Judge every implementor decision at the per-task gate` (Task 5)

### DoD
Both plan skills, both templates, the checklist's Blocking classes and its self-check carry the four rules under the same class IDs and the same delegation line; a whole-repository build or test command is Blocking outside `#### Integration`.


### Covered criteria
15. Nowy endpoint ma kontrakt - Plan, w którym zadanie tworzy nowy punkt końcowy API bez kształtu żądania, odpowiedzi i kodów statusu, nie przechodzi recenzji planu.
16. Tekst dla użytkownika ma właściciela - Plan, w którym zadanie tworzy tekst widoczny dla użytkownika (wiadomość, ekran, komunikat błędu, zasób tekstowy), nie niosąc go ani nie delegując jawnie ze wskazaniem istniejącego wzorca, nie przechodzi recenzji planu.
17. Awaria w połowie operacji ma decyzję - Plan, w którym zadanie ma krok złożony z zapisu i działania zewnętrznego, a nie ustala, co dzieje się przy awarii między nimi, nie przechodzi recenzji planu.
18. Cały projekt tylko w bramce końcowej - Plan, którego bramka pośrednia (budowanie lub testy uruchamiane przy każdym punkcie kontrolnym) albo własna próba zadania buduje lub testuje całe repozytorium, rozwiązanie lub przestrzeń roboczą, choć narzędzia hosta oferują węższy zakres pokrywający to, co plan zmienia, nie przechodzi recenzji planu; pełne budowanie lub pełna suita należy wyłącznie do bramki uruchamianej na recenzji końcowej.
