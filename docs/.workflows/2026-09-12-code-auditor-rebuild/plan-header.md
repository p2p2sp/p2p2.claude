Title: "code-auditor rebuild - repo profile, redacted critic, directory scope, findings cap"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-12-code-auditor-rebuild/spec.md
Intent: docs/.workflows/2026-09-12-code-auditor-rebuild/intent.md

## Out of scope

- Weryfikacja kontraktu statycznego dla prozy i skilli (SKILL.md, agenci); repo skilli audytuje `supercc:skill-designer`.
- Critic na modelu innej rodziny niż Claude (cross-model critic).
- Argument `--max-findings` lub inna konfiguracja limitu findingów.
- Zmiana rubryki 1-5, kwadrantów, progów bramek (`--min-impact 3 --min-opportunity 3 --top 20 --top-edges 20`) i algorytmu `rank.ts` / `rank_edges.ts`.
- Persystencja profilu lub findingów między runami; profiler nie czyta poprzednich `findings.md`.
- ADR.
- Zmiana `worktree.sh` i `check_node.sh`.

## Constraints / assumptions

- Skrypty deterministyczne zostają priorami i bramkami; wnioskowanie o repo i o claimach należy do agentów (invariant "thin harness, model does the judgment").
- Agenty otrzymują ścieżki skryptów i plików jako argumenty briefu dispatchu; żaden plik w `agents/` nie rozwija `${CLAUDE_SKILL_DIR}`.
- Każdy run jest czysty: nic z poprzednich runów nie jest wejściem.
- Profiler ma `tools: Read, Write, Grep, Glob, Bash`, przy czym Bash służy wyłącznie do `git log`, a Write wyłącznie do `profile.md`.
- Harness honoruje `model: inherit` w frontmatterze agenta (wartość udokumentowana); `effort` w frontmatterze agenta jest przyjętym w repo założeniem (zapisanym w głównym CLAUDE.md), nie gwarancją.
- Nowe przypadki testowe używają wyłącznie helperów z `tests/harness/` i naśladują nazewnictwo istniejących testów (zdanie opisujące gwarantowane zachowanie, bez `describe`).
- Żaden edytowany lub nowy plik nie zawiera em dash ani en dash.
- Wszystkie pliki źródłowe pluginu w języku angielskim.

