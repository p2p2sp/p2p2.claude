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

  Cała wewnętrzna pętla per-task (coder → runner → task-reviewer → improver wraz z całą mechaniką
  retry / BLOCKED-unblock / guard nieskończonej pętli / forwardowania raportów) jest napędzana przez
  JEDNO wywołanie narzędzia Workflow na task. Dispatcher robi per task tylko cztery klamry: flip widgetu,
  zapis task-base.sha, wywołanie workflow, oraz (na PASS) commit + zapis stanu / (na FAIL) prompt eskalacji.

  1. Widget N → in_progress (safe_task_call, soft-fail).
  2. Zapis task-base.sha = git rev-parse HEAD — RAZ, PRZED workflow (stała baza diffa dla całego taska;
     re-invoke eskalacji jej nie nadpisuje).
  3. task_gate_runnable = (## Task gate ma `- Tests:` ≠ none) LUB (`- Build: green`) — flaga dla workflow.
  4. Wywołanie workflow (RAZ; eskalacja re-invoke z feedbackPath):
     Workflow(
       scriptPath="${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/task-pipeline.workflow.js",
       args={taskFile, reportDir: …/orchestration/task-<N>, taskBaseSha, taskGateRunnable,
             rulesImprover, retryMaxAttempts: cap, feedbackPath?})
     - workflow SAM dispatchuje agenty per-task przez agentType:
       • coder  → agentType:'superdev:dev-coder'  (model opus; ten sam agent prowadzi Mode: normal i Mode: unblock)
       • runner → 'superdev:dev-agent-runner' (skill; task-scoped, nigdy Scope: full)
       • task-reviewer → agentType:'superdev:dev-task-reviewer' (model opus)
       • improver → agentType:'superdev:dev-improver' (model sonnet; gated rulesImprover — off ⇒ skip)
     - workflow zwraca strukturę {status: PASS|FAIL, attempts, lastFailureReportPath}.
     - print: [N/max] task-pipeline: <status> (attempts <K>/<cap>).
  5. PASS → committer (deterministyczny skrypt, nie fork) → bash
     "${CLAUDE_PLUGIN_ROOT}/skills/dev-orchestrator/scripts/commit-task.sh" "<task_file>"
     - skrypt sam: git add -A, git commit -m "T<N>: <H1-subject>", weryfikuje że HEAD ruszył i drzewo czyste, dopiero wtedy emituje tag.
     - zwrotka (jedna linia, parse_commit_tag): sha → print [N/max] commit: <sha>, widget completed; no-changes → no-op; error/malformed → twardy stop. Brak re-weryfikacji i retry — tagowi się ufa.
  6. Zapis stanu — po commicie: status.yml ← current_task: N+1; po Tasku 1: base.sha ← HEAD^. break do następnego taska.

  Retry / BLOCKED-unblock / guard nieskończonej pętli — WEWNĄTRZ workflow (już nie w dispatcherze):
  - BLOCKED (runner lub task-reviewer) → workflow odpala pass unblock przez tego samego dev-coder agenta
    (Mode: unblock, Feedback: raport blokującego). PASS → restart passu bez inkrementu attempt (darmowy);
    FAIL → liczy się jak zwykły FAIL. Guard: BLOCKED dwa razy z rzędu na tym samym passie → wymuszony FAIL.
  - Eskalacja (poziom dispatchera): FAIL z workflow (cap wyczerpany) → AskUserQuestion
    (Retry <retry_escalation_attempts> more / Abort). Retry → re-invoke workflow z cap=retry_escalation_attempts
    i feedbackPath = lastFailureReportPath (task_base_sha NIE jest przeliczany). Brak opcji „skip task".

  C. Final review (raz, po commicie ostatniego taska)

  - Rozwiązanie zakresu: base_sha (priorytet: base.sha → git log --grep="^T1: " → git merge-base HEAD main), head_sha = git rev-parse HEAD.
  - → Skill(superdev:dev-agent-final-reviewer, "Plan: <ścieżka>\nDiff range: <base>..<head>")
  - Sub-orchestrator wewnętrznie odpala dev-agent-plan-auditor → dev-agent-runner (Scope: full) → dev-agent-smoke → synteza.
  - zwrotka na stdout: jeden STATUS: PASS (go) / STATUS: FAIL (no-go) + rozbicie sub-kroków. Nic nie zapisuje na dysk. Orchestrator
  relacjonuje verdykt verbatim i kończy. Bez retry, bez improvera, FAIL jest jedynie doradczy.

  Na koniec: closing summary — po jednej linii na task (Task N: <verb> — committed (<sha>) [attempts: K] lub no-op), potem stop.