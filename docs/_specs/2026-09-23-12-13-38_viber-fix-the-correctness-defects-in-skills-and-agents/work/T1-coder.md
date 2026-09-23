Resumed after a session where Edit/Write were denied mid-task; no prior edits existed in the tree, so this was a fresh implementation, not a merge.

Put the "2 new files" cap wording on its own unwrapped line in `viber/CLAUDE.md` (deliberately longer than neighboring lines) so `2 new` and `` `rule-admission.md` `` land on the same physical line - the grep-based Verification checks per-line, and normal word-wrap would have split them across two lines.

`rule-admission.md`'s Calibration section is now the sole owner of both the "two" count and the "keep the two with the strongest evidence" wording; `rules-writer.md` no longer states any count and no longer contains the phrase "strongest evidence" at all.

Both writers now permit exactly `wc -c` and `rm -- <one path>` in their Bash sentence, and both Write sections spell out `rm -- <path>`, never `-r`/`-f`, right where the Glob-confirmation deletion rule already lived.
