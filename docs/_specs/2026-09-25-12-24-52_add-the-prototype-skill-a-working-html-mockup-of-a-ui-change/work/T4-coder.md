# T4 coder notes

- Added the Prototype-line carry-over as one sentence appended to the existing `Hand off:` paragraph, right after the Issue-line sentence it mirrors - same paragraph, same "carries ... inside that summary" phrasing, so DoD.1's "like the Issue line" is literal, not just conceptual.
- Conditional clause ("a conversation with none adds none") lives in the same sentence rather than a new one, keeping the single-line diff DoD.3 requires (grep confirms only this line of `intent/SKILL.md` changed).
- No TDD skill invoked: `TDD: none`, and DoD names no new test file - `grep -n 'Prototype:'` on both SKILL.md files is the only verification, already green.
