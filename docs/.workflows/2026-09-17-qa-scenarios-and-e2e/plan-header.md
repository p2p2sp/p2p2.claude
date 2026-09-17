Title: "QA scenarios layer and Playwright E2E flow behind qa, e2e-ui and e2e-api switches"
Spec: docs/.workflows/2026-09-17-qa-scenarios-and-e2e/spec.md
Intent: docs/.workflows/2026-09-17-qa-scenarios-and-e2e/intent.md

## Out of scope
- Integracja z GitHub Issues (eksport scenariuszy jako issue).
- Uruchamianie testów E2E w trakcie builda, w checkpoincie lub jako brama final review.
- Scenariusze manualne dla API (dział QA nie testuje API ręcznie).
- Zmiany w specu, planie, checkliście planu i reviewerach build; reguła "seconds, in memory" dla `### Task Checks` zostaje.
- Instalowanie czegokolwiek przez `setup`.
- Wsparcie innych narzędzi niż Playwright dla tej funkcji.

## Constraints / assumptions
- Scenariusze dla QA żyją jako markdown w repo; testerzy tylko czytają, wyniki statusują w GitHub Projects. Kształt scenariusza ma być gotowy na przyszłą regułę "jeden scenariusz = jedno GitHub issue".
- Katalog warstwy to `docs/qa/`; przy runie podzielonym na fazy jeden dokument per faza, z identyfikatorem runu jak w changelogu. Przebieg E2E dostaje ścieżkę pliku przekazania jawnie od operatora; pliki z wcześniejszych buildów nigdy nie są dobierane automatycznie.
- `playwright-cli` (nie MCP) jest narzędziem agenta na sztywno; artefaktem dla CI są pliki `@playwright/test`. Root `CLAUDE.md` zapisuje już, że zasada stack-agnostic dotyczy projektów hosta, nie toolingu pluginu za przełącznikiem opt-in.
- Testy UI mogą używać Playwright `request` do przygotowania danych, asercji skutków i sprzątania; scenariusze UI to klikanie po UI, scenariusze API to black-box przez `request`.
- Przepis startu aplikacji, konta testowe, katalog i konwencje testów E2E (Page Objects, fixtures ról) pochodzą wyłącznie z pamięci hosta (`CLAUDE.md`, `.claude/rules/`); superdev niczego o stacku hosta nie zakłada.
- Lista scenariuszy powstaje po buildzie z kryteriów akceptacji, scenariuszy użytkownika specu, trybów awarii planu, tabeli pokrycia reviewera i kodu widoków oraz routingu; spec i plan nie zmieniają się.
- Nie tworzyć nowych gałęzi git; writer i przebieg E2E commitują przez istniejący mechanizm zadeklarowanego zbioru.

