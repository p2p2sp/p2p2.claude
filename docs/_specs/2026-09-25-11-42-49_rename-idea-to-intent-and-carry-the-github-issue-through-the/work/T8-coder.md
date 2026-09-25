# T8 coder notes

- Added a new `## Resolving the report` section (first `The Process` step) rather than folding
  the issue-read logic into Law 1: keeps the Iron Law's three laws untouched, matching
  triage's own "read the issue first, then assess" shape.
- The config preload reuses the exact literal line and `allowed-tools` pattern `planner`
  already carries for `config.sh`; `issue-facts.sh` gets its own pattern per the
  shell-preload-contract rule (a bare `Bash` allow does not cover a preload or a pre-approved
  runtime call).
- The Issue bullet was appended as an 8th diagnosis item rather than touching the existing
  seven; the Handoff line still says "all seven parts ... plus the Issue line when it is
  present" so the gate wording stays literally true when no issue was read.
- `planner/SKILL.md` was untouched: T6 already added its `Issue:` line and `issue:` frontmatter
  handling: verification grep confirms both sides without any edit there.
- No test file exists for `fixer/SKILL.md` (markdown only); DoD is proven by the grep
  verification plus the portability/orphan-tags suites, which stayed green.
