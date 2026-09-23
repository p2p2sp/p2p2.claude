Prior attempt found Edit/Write unreachable; this session had both tools and the tree was clean, so the whole task was built fresh via `viber:tdd`.

The leaf check lives in the same `Depends-on` loop as the forward-reference check, guarded by
`mode != "--split"` (mode now travels into the awk program through `ENVIRON["mode"]`, same
mechanism as `plan`). It reads `excl[seen[dn[k]]]`, which is already fully populated by the time
END runs since task parsing happens in a single earlier pass.

Pre-existing unrelated dirty files in the tree (`tests/viber/merge-settings.test.ts`,
`viber/skills/setup/assets/settings.json`) were not touched - left exactly as found.

viber/CLAUDE.md and viber/skills/implementor/SKILL.md are T2's files (it Covers #1 and #5); T1's
Files list intentionally excludes them even though criterion #5 mentions viber/CLAUDE.md.
