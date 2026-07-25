
## Task 4 - feat(superui): system-level provenance marker in dtcg.yml across the canon
- Covers: criteria #7

### Dependencies
- Task 1 - blocks: Task 6, 7

### Files
- modify - superui/agents/token-composer.md (compose/merge: root marker write + preserve)
- modify - superui/agents/fidelity-reviewer.md (skip rule: root marker granularity)
- modify - superui/skills/design-system-completer/scripts/check_completeness.py (system-provenance fact line)
- modify - superui/CLAUDE.md (Provenance canon bullet: 4th marker, its writers/consumers)

### Test Commands
*Build*
- `python3 -c "import yaml" 2>/dev/null || echo PyYAML missing (install before running fixtures)`

*Tests*
- fixture: write `.temp/provenance-fixture/dtcg.yml` containing `$extensions: {org.superui.provenance: designed}` at root plus 2 valid tokens -> `python3 superui/scripts/validate_tokens.py .temp/provenance-fixture/dtcg.yml` exits 0
- `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/provenance-fixture .temp/provenance-fixture/facts.md` exits 0 AND `grep -n 'provenance' .temp/provenance-fixture/facts.md` shows the system-provenance line under `## Provenance facts`

### Approach
1. token-composer.md: input gains optional `provenance: designed` line -> on compose, write `$extensions` with `org.superui.provenance: designed` at the dtcg.yml ROOT; on every job (compose or merge) an existing root marker is preserved verbatim - never dropped, never added unrequested. Per-token `synthesized: true` rules unchanged.
2. fidelity-reviewer.md: extend the skip sentence - a root `$extensions.org.superui.provenance: designed` marker means the ENTIRE system is designed: skip all token spot-checks and spec comparisons, report `system provenance: designed - comparison skipped` with the usual skipped count.
3. check_completeness.py: in the `## Provenance facts` section emit `system provenance: designed|measured (root marker present|absent)`; keep exit-code contract (gaps are data); update its header contract comment + self-verify.
4. superui/CLAUDE.md: document the 4th canon marker (writer: token-composer on generator instruction; consumers: fidelity-reviewer, check_completeness.py; validator tolerance verified).

### Edge cases
- Root `$extensions` written as a `$`-prefixed top-level key MUST remain ignored by `validate_tokens.py`'s group walk (verified in exploration: `key.startswith("$") -> continue`); the fixture test guards regressions.
- Merge into a designed system with MISSING-TOKENS entries (later re-extraction flows) - root marker preserved even when per-token flags differ.

### Contracts
- `$extensions.org.superui.provenance: designed` at dtcg.yml root; absence = measured. Written only by token-composer when instructed; read by fidelity-reviewer + check_completeness.py.

### DoD
Fixture validates + facts line present; all four files updated consistently; canon bullet in superui/CLAUDE.md names the new marker.


### Covered criteria
7. Provenance canon extended end-to-end: token-composer writes `$extensions.org.superui.provenance: designed` at the dtcg.yml ROOT when its dispatch says so and preserves an existing root marker across merges; fidelity-reviewer's skip rule gains the root-marker = whole-system-skip granularity; `check_completeness.py` reports system provenance under `## Provenance facts`; `python superui/scripts/validate_tokens.py` exits 0 on a fixture dtcg.yml bearing the root marker (tolerance confirmed - no validator change expected).
