# Auto-fill heuristics (Step 6)

Detail for the two heading heuristics that Step 6 of `SKILL.md` delegates here: **Test-section auto-fill** (testability classifier) and **Summary auto-fill** (description, not commit list). The conservativeness and fallback rules below are binding.

## Test-section auto-fill (testability classifier)

**Sources** (priority - in-context first):

1. Scan transcript (~30 last turns) for: prior `git diff --stat` / `git diff --name-only` output, coder / reviewer / orchestrator sub-agent results listing changed files, explicit user / assistant mentions of changed areas ("added endpoint X", "fixed validation Y").
2. **Only if transcript yields no file list** → the `CHANGED_FILES` list from the Step 4 `pr-facts.sh` block (comma-separated; already in context - no new tool call).

**Classification rule** applied to the file list:

- **Untestable** when **every** changed path matches one of: `*.md`, `*.mdx`, `*.txt`, `LICENSE*`, `CHANGELOG*`, `docs/**`, `*.png` / `*.jpg` / `*.jpeg` / `*.svg` / `*.gif` / `*.webp`, `.editorconfig`, `.gitignore`, `.gitattributes`, or `.github/**` excluding `.github/workflows/**`.
- **Testable** when **any** changed path is production code (`.ts` / `.tsx` / `.js` / `.jsx` / `.py` / `.cs` / `.go` / `.rs` / `.java` / `.kt` / `.rb` / `.php` / `.cpp` / `.c` / `.h`), test code (`*.spec.*` / `*.test.*` / `tests/**` / `__tests__/**`), or runtime-affecting config (`package.json`, `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json`, `tsconfig.json`, `*.csproj` / `*.sln`, `pyproject.toml` / `requirements*.txt`, `Cargo.toml` / `Cargo.lock`, `go.mod` / `go.sum`, `Dockerfile`, `docker-compose*`, `.github/workflows/**`).
- **Mixed diff (code + docs)** → testable (code dominates).
- **Empty diff / classification ambiguous** → testable (conservative; never silently drop a section we cannot prove is unnecessary).

**Content generation (testable case)** - in-context reasoning only, no new tool calls:

1. Inspect transcript for concrete action verbs against changed areas (`added`, `fixed`, `renamed`, `extracted`, `removed`).
2. Emit 2–4 checkbox bullets matching the template's checkbox style (`- [ ] <step>`) - concrete manual or automated verification steps grounded in transcript evidence.
3. **Conservativeness rule**: never invent specific function / endpoint / file names that are not present in the transcript. When uncertain about specifics → drop that bullet rather than fabricate.
4. **Fallback (sparse context - transcript yields zero concrete signals)**: emit exactly one generic bullet derived from commit subjects, e.g. `- [ ] Verify changes described in commits on this branch work as intended end-to-end`. **Never** the literal template placeholders.

**Skip mechanism (untestable case)**:

- Mark the section object `skip=true` during classification.
- In the final rendering pass, **filter out** sections with `skip=true` entirely - no heading, no `_No response_`, nothing. The PR body simply has no Plan testów section.
- In Step 7 Edit-field list, expose the skipped section with a `(pominięto - przywróć?)` suffix so the user can opt back in; selecting it flips `skip=false` and triggers normal Edit-field prompting for the section content.

**Edge case - template lacks any test section**: skill adds nothing. Template authority wins; do not inject a section that is not in the template, even when the change is testable.

## Summary auto-fill (description, not commit list)

**Goal**: produce a short, human-readable description of WHAT was changed in this branch, grouped by area when the change set is large. NEVER paste the raw `git log` output as-is.

**Sources** (priority - in-context first, no new tool calls):

1. Scan transcript (~30 last turns) for: prior diff output, sub-agent results (coder / reviewer / orchestrator) describing what was implemented, explicit user / assistant statements about the change.
2. `CHANGED_FILES` from the Step 4 `pr-facts.sh` block.
3. The `COMMITS:` section of the Step 4 block (commit subjects + bodies, oldest first) as raw input for summarization. Commit messages are a hint about intent, not the output format.

**Output format**:

- **Small change** (≤ ~5 distinct logical changes): a flat bulleted list, one bullet per logical change. Each bullet describes the change in imperative-past tone (e.g. `- dodano walidację email w formularzu rejestracji`, `- naprawiono crash przy pustym koszyku`). Match the user's conversation language for the prose; section heading stays verbatim from template.
- **Large change** (≥ ~6 distinct logical changes, OR diff touches ≥ 3 distinct areas): **group by area** with bold sub-headings inline, e.g.:

  ```
  **Backend:**
  - dodano endpoint `POST /api/users/invite`
  - przepisano walidację sesji na middleware

  **Frontend:**
  - nowy widok zaproszeń użytkowników
  - poprawki dostępności w formularzach

  **Dokumentacja / konfiguracja:**
  - zaktualizowano README - sekcja Quickstart
  - bump zależności w package.json
  ```

  Grupy dobieraj na podstawie ścieżek plików w diffie i kontekstu (np. `src/api/**` → Backend, `src/ui/**` / `*.tsx` → Frontend, `*.md` / `docs/**` → Dokumentacja, `tests/**` → Testy, `package.json` / `*.csproj` → Konfiguracja). Pomijaj puste grupy. Nazwy grup tłumacz na język konwersacji.

**Post-processing** (always applied to the final rendered text of this section):

- Replace every `#(\d+)` with `\1` (strip `#` before digit-only references - `(#123)` → `(123)` - so GitHub does not render them as cross-references in the PR body).

**Conservativeness rule**: never invent endpoints / function names / scope that are not present in transcript, commit messages, or file paths. When uncertain about a specific name → describe generically (`zaktualizowano logikę walidacji w module sesji`) rather than fabricate.

**Fallback (very sparse context - empty transcript signals AND commit messages are too terse / non-descriptive like `wip`, `fix`, `update`)**: emit one `- <subject>` bullet per commit from the `COMMITS:` block, oldest first (post-processed: `#`-strip applied). This restores the legacy behaviour as a safety net so a PR description is never empty.

**Empty range** (branch at base, no commits past base): leave the section's original placeholder lines untouched.
