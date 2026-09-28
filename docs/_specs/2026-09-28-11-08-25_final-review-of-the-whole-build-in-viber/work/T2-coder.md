# T2 - notes

- `config.sh` and `switch-text.sh` already wire `final-review` (T1's work); this task only
  needed the template line, its comment, and the docs - no script edit.
- `bootstrap.sh`'s merge is fully generic over the template's top-level keys, so adding
  `final-review` to the template needed no `bootstrap.sh` change, only fixture upkeep in
  `bootstrap.test.ts`: every fixture meant to read as "already complete" (byte-identical,
  directory-only-merge, blanks-before-colon) needed its own `final-review` line added, or it
  would have silently become a merge case instead.
- The README's switch-count sentence was already wrong before this task (said "six of the
  seven on and qa off", but issues was off too) - fixed while updating it for the eighth switch:
  now "six of the eight on and qa and issues off".
- `usage.html`'s own "Five of the seven..." summary paragraph (both languages) was accurate
  before this change, so it also needed updating to "Six of the eight..." to stay true - not
  explicitly named in Delivers, but left stale it would contradict the new switch table.
- Did not touch the `implementor` card's "Switches" list in `usage.html`: that names the
  reviewer's actual wiring into the build, which belongs to a later task per this task's Goal.
