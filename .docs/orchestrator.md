A. Faza wstępna (raz, przed pętlą)

  1. Zlokalizuj plan — deterministyczna kolejność (pierwszy trafiony): arg `Plan: <ścieżka>` → linia harnessu
  `Your plan has been saved to: <ścieżka>` z aprobaty ExitPlanMode → skan rozmowy .claude/plans/*.md → brak →
  twardy stop „No plan path resolved…" (bez AskUserQuestion). Potem Read planu (orientacyjnie). Plan jest już
  zrecenzowany przez bramkę hooka (review-plan.sh → dev-plan-reviewer STATUS: PASS) — dispatcher go nie re-recenzuje.
  2. Wczytaj config (.superdev/config.yml, preloaded przez !cat). Klucz jest off tylko gdy literalnie false; brak = on (fail-open).
  Honoruje adr i rules_improver.
  3. Rejestracja ADR (gdy adr≠false; idempotentna przez marker adr.done lub istniejące task files):
    - guard czystego drzewa — OSOBNY i WCZEŚNIEJSZY niż per-task pre-flight; brudne drzewo → twardy stop.
    - → Skill(superdev:dev-agent-adr-recorder, "<abspath(planu)>") — fork SAM zapisuje pliki .superdev/adr/*.md + indeks .superdev/ADR.md, nie dotyka gita.
    - STATUS: ADR → commit przez bash commit-adr.sh "<Commit-subject>" (verify-before-claim, ten sam słownik tagów co commit-task.sh); STATUS: NO-ADR → nic nie zapisane.
    - plan NIGDY nie jest modyfikowany ani kopiowany — decompose zawsze dostaje oryginał; decomposer nic nie wie o ADR. Na koniec: Write adr.done.
  4. Dekompozycja (raz, idempotentna):
    - → Skill(superdev:dev-agent-decomposer, "Plan: <ścieżka>\nPlanSlug: <slug>")
    - zwrotka STATUS: PASS + sekcja ## Task files (linie - <N> — <verb> — <path>). Parsuje → task_files, task_titles, max. Nie-PASS →
  eskalacja do usera (Retry/Abort).
  5. Rozstrzygnij start — kolejność: status.yml (current_task) → arg task=N → konflikt rozstrzyga user → domyślnie 1. Jeśli current_task >
  max → start = current_task (wszystko zrobione, lecimy tylko do final review).
  6. Seed widgetu postępu — TaskCreate po jednym wierszu na task (flat); taski < start → completed. Wszystko przez safe_task_call
  (soft-fail).
  7. Pre-flight working tree (raz, przed pętlą, gdy start ≤ max) — git status --porcelain; brudne drzewo → twardy stop (nie stashuje).

  B. Pętla per-task (dla N = start..max)

  Widget N → in_progress. attempt=0. Zawsze jedno wywołanie Skill na turę — każde zależy od poprzedniego.

  Na początku attempt==1: zapis task-base.sha = git rev-parse HEAD (stała baza diffa dla całego taska).

  1. coder → Skill(superdev:dev-agent-coder, "Task file: …\nReport path: …/coder-<a>.md\nMode: normal\nFeedback:
  <ścieżka-raportu-poprzedniej-porażki lub —>")
    - zwrotka 3-liniowa: STATUS: PASS|FAIL / Report: / Summary:.
    - FAIL → last_failure_path = coder-<a>.md; attempt≥3? eskalacja : continue.
    - PASS po wcześniejszym FAIL → zapamiętaj last_coder_report_path (forward do reviewera).
  2. runner (pomijany przy czystym Tests: none bez Build: green) → Skill(superdev:dev-agent-runner, "<cmd>\n\nReport path:
  …/runner-<a>.md\n\nScope hints:\n  paths: …\n  test names: …")
    - task-scoped — nigdy Scope: full.
    - zwrotka: STATUS: PASS|FAIL|BLOCKED|ERROR|TIMEOUT.
    - BLOCKED → gałąź unblock (patrz niżej); FAIL/ERROR/TIMEOUT → last_failure_path = runner-<a>.md, retry; PASS → dalej.
  3. dev-agent-task-reviewer → Skill(superdev:dev-agent-task-reviewer, "Task file: …\nRunner report: <ścieżka|none>\nTask base:
  <sha>\nReport path: …/...-<a>.md" (+ \nPrevious coder report: … gdy był FAIL→PASS handshake))
    - zwrotka: STATUS: PASS|FAIL|BLOCKED.
    - BLOCKED → gałąź unblock; FAIL → retry; PASS → dalej.
  4. improver (gated rules_improver; off → jedna linia skipped (disabled)) → Skill(superdev:dev-agent-improver, "Task-reviewer report:
  …\nReport path: …/improver-<a>.md")
    - zwrotka: zawsze STATUS: PASS (brak trybu porażki). Wołany przed commitem, by wpisy do .claude/rules/ weszły w commit taska.
  5. committer (deterministyczny skrypt, nie fork) → bash "${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/commit-task.sh"
  "<task_file>"
    - skrypt sam: git add -A, git commit -m "T<N>: <H1-subject>", weryfikuje że HEAD ruszył i drzewo czyste, dopiero wtedy emituje tag.
    - zwrotka (jedna linia, parse_commit_tag): sha → print [N/max] commit: <sha>, widget completed; no-changes → no-op; error/malformed →
  twardy stop. Brak re-weryfikacji i retry — tagowi się ufa.
  6. Zapis stanu — po commicie: status.yml ← current_task: N+1; po Tasku 1: base.sha ← HEAD^. break do następnego taska.

  Gałąź BLOCKED (unblock) — wspólna dla runnera i reviewera:
  - → Skill(superdev:dev-agent-coder, "… Mode: unblock\nFeedback: <raport-blokującego-agenta>")
  - PASS → restart tego samego passu bez inkrementu attempt (udany unblock jest „darmowy"). FAIL → liczy się jak zwykły FAIL.
  - Guard nieskończonej pętli: BLOCKED dwa razy z rzędu na tym samym passie → wymuszony FAIL (+attempt).

  Retry/eskalacja — attempt współdzielony przez coder/runner/reviewer/unblock; cap 3, potem AskUserQuestion (Retry 3 more / Abort), max
  3+3. Brak opcji „skip task".

  C. Final review (raz, po commicie ostatniego taska)

  - Rozwiązanie zakresu: base_sha (priorytet: base.sha → git log --grep="^T1: " → git merge-base HEAD main), head_sha = git rev-parse HEAD.
  - → Skill(superdev:dev-agent-final-reviewer, "Plan: <ścieżka>\nDiff range: <base>..<head>")
  - Sub-orchestrator wewnętrznie odpala dev-agent-plan-auditor → dev-agent-runner (Scope: full) → dev-agent-smoke → synteza.
  - zwrotka na stdout: jeden STATUS: PASS (go) / STATUS: FAIL (no-go) + rozbicie sub-kroków. Nic nie zapisuje na dysk. Orchestrator
  relacjonuje verdykt verbatim i kończy. Bez retry, bez improvera, FAIL jest jedynie doradczy.

  Na koniec: closing summary — po jednej linii na task (Task N: <verb> — committed (<sha>) [attempts: K] lub no-op), potem stop.