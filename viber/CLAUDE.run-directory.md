# The run directory

`docs/<runs>/<stamp>_<slug>/` (`docs/_specs/` by default), landed by `plan-path.sh --land`, which
copies (never moves) the plan-mode file, a round landing into the draft its `into:` key names:

- `plan.md` - frozen once it carries a task block; a draft is relanded in place each round.
- `spec.md`, `tasks/<id>.md` - `plan-index.sh --split`, rebuilt on every call. A task
  file is a coder's whole input; a coder never sees the plan.
- `roadmap.md` - only when the plan has a `## Roadmap`: `plan-index.sh --split` cuts it out of
  `spec.md` (never a model's write) and it rides into the archive as a non-scaffolding file.
- `prototype.html` - only when the plan's `prototype:` key names an existing mockup:
  `plan-path.sh --land` copies it (a draft round overwrites it, or removes it when the key is
  gone), `plan-index.sh --split` commits
  it and appends `## Prototype` with its path to every task file; it rides into the archive.
- `status.md` - `commit-task.sh` is its only writer (`plan-index.sh` creates it empty). Its
  `closed:` line names the finished parts of the close: `memory`, `rules`, `qa`, `final-review`
  and one `extension:<name>` per closed extension.
- `rulings.md` - the build's rulings, `commit-task.sh --rule` its only writer, created by the first
  ruling; it rides in the archive.
- `outcome.md` - the build's final summary plus a `Drift:` line, `closeout` its only writer, just
  before the move; it rides in the archive.

`archive-run.sh` moves it to `docs/<specifications>/<key>/` (`docs/specs/` by default), dropping
only the scaffolding it enumerates, and refuses a run with a task in neither `done` nor
`skipped`. `closeout` edits `spec.md` and writes `outcome.md` first: the drift edit, the summary
and the move are one commit.
