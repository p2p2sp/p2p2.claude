- Two `switch-text.sh` preloads for the same key (`issues`) are placed inline at their own spots
  in the body: one at "Resolving the report" (both states do something), one at "The diagnosis"
  (only the `true` state adds a part, so only `issues-diagnosis.true.md` exists - no `.false.md`).
- Dropped the "restating all seven parts... plus the Issue line when it is present" handoff
  wording for "restating every part", since the part count is no longer fixed (6 or 7 depending
  on the switch) - matches Delivers.
- The now-unused `config.sh` preload block at the top of the body was removed outright rather
  than left in: nothing else in fixer's body read its output.
