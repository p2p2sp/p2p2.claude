# T3 coder notes

- The Verification grep needs the literal substring "asked for it to be run" contiguous; an
  intervening phrase like "asked in their own words for it to be run" fails the grep even though
  it reads fine. Wrote each occurrence as "asked for it to be run, in their own words" instead.
- Kept the `plan-rules.md` End-to-end rule inline (extended the existing bullet) per this repo's
  own `instruction-editing.md` rule rather than splitting it into new bullets, since it is a
  variant of the rule already there.
- Left `viber/CLAUDE.md`'s "End-to-end tests only on the user's own ask" duplication-tracker line
  untouched: it already names the same four files and needs no wording change for this task.
