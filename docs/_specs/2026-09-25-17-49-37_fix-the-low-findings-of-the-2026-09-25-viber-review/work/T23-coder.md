# T23 coder notes

- Sourced the exact mechanics from `implementor/SKILL.md` step 1: a `state: draft` plan is
  continued by pointing `/viber:intent` at it; any other resolution (including plan-path.sh with
  no argument, which returns the run most recently worked on) is what "ask Claude to continue the
  build" triggers - `implementor` is `user-invocable: false`, so that phrasing, not a slash
  command, is the correct way to describe resuming it.
- README: extended the existing "Where it writes" paragraph (it already said an interrupted build
  "resumes by re-reading" status.md) rather than adding a new section, since DoD only asks both
  paths be named, not a new place for them.
- usage.html: added one new English/Polish paragraph pair to the `#ways-in` section, right after
  the existing note that intent/fixer end at the planner - no equivalent "Where it writes" section
  exists in usage.html, so this was the closest natural home.
