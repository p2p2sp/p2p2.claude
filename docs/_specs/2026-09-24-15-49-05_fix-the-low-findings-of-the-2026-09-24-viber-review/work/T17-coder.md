# T17 - coder notes

- `config.sh` prints both `directories.runs` and `directories.specifications`; the skill's
  step 1 now names both as `<runs>` and `<specs>` and globs `qa.e2e.md` under each before
  picking the newest by directory name.
- Left the stale "no archived one either" wording fixed to "the fallback found none either"
  since the fallback no longer only checks the archive - a small local consistency fix inside
  the same sentence this task owns.
- Step 6's skip condition now reads on `FILE:`/`BLOCKED` outcomes rather than "ID processed",
  matching the review finding about `--e2e` exiting 4 when every scenario ends in FAIL/skip.
- T23 (not this task) marks the review document's `- WYKONANE - ` prefixes; left untouched here.
- `skill-designer` lint reports one pre-existing WARN (possible italics with `*...*`) unrelated
  to this edit; FAIL=0 as required by Verification.
