# T1 - notes

- `final-review` is a plain switch, wired identically to `cleanup`: added to `config.sh`'s
  key list (right after `cleanup`) and to `switch-text.sh`'s key case. No fragment for the
  `false` state exists or is needed - the DoD only asks for a `.true.md` fragment, and the
  generic "no file -> nothing printed" contract already covers the off case.
- `config.test.ts`'s `switches()` helper does not strip the new key, so its shared `OFF`
  fixture and two explicit fixture objects (seeded-template, shipped-template tests) needed
  `"final-review": "false"` added to stay green - not new behavior, just fixture upkeep.
- Did not touch any skill/fragment file: T1's `Files` is limited to `config.sh`,
  `switch-text.sh` and their three test files. The actual reviewer wiring (a skill calling
  `switch-text.sh final-review` and its `final-review.true.md` fragment) belongs to a later
  task; DoD.5 only requires `portability.test.ts`'s `SWITCH_VALUES` map to accept the key.
