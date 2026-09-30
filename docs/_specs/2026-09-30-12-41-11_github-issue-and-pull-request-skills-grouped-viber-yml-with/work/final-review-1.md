# Final review - slice 1 (T1-T8)

## Blocking

None.

## Minor

1. `viber/skills/setup/templates/viber.yml:80-82` - the `branching:` comment still says "Nothing is ever fetched, pushed, merged or deleted: a branch is only created, switched to and committed on." This build added `/viber:create-pr`, which pushes the branch on the user's yes. The template now contradicts its own `github.pr-title` comment (line 60, "/viber:create-pr opens") and the other documents that describe the same behaviour: `viber/BRANCHING.md:9-10` ("No branching step ever fetches, pushes, merges or deletes ... Only `/viber:create-pr` pushes it, on your yes"), `viber/README.md:138-140` and `viber/skills/setup/assets/help.html:3053-3055` ("... alone pushes the branch, on your yes"). Every project seeded or migrated by `/viber:setup` gets this comment. Fix: reword it to match BRANCHING.md, for example "No branching step fetches, pushes, merges or deletes anything: a branch is only created, switched to and committed on; only /viber:create-pr pushes it, on your yes." Keep the file's comment wrapping. `tests/viber/bootstrap.test.ts` builds its `GROUPED` fixture from key lines only, so no test needs a change.
