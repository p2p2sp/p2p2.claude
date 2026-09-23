## T8 review - round 1

### Critical

- `viber/skills/idea/SKILL.md:3` (frontmatter `description:`) - violates DoD.6 ("both frontmatters are unchanged"). Committed HEAD reads `description: An interview about a raw idea, one question at a time.`; the working tree now reads `description: An interview about a raw idea, one question at a time. Run only when user asks explicitly.` No other task's `Files:` lists `viber/skills/idea/SKILL.md` (checked every task under `docs/_specs/2026-09-23-12-52-41_tighten-the-viber-instructions/tasks/`), so this file's whole diff against HEAD is T8's to answer for. The coder's note ("kept ... exactly as found in the tree per the reason note; did not touch it") is not a valid excuse: per the gating rules a coder's note is a hypothesis to disprove, not evidence, and `Out of scope` for T8 names nothing that would license a frontmatter edit. Fix: revert the frontmatter `description:` line to the HEAD wording (drop the appended sentence), or, if another task genuinely owns that addition, have this task's `Files:`/notes make that ownership explicit and get the plan corrected - right now T8 is the only claimant and its own DoD forbids the change.

### Notes (not findings)

- Verification command reproduced as specified: `wc -c` gives idea 6769 / fixer 3961 (both under ceiling), `2.1` count in idea = 3, all-caps law regex in fixer = 0, `viber:planner` counts = 1 (idea) and 2 (fixer), em/en-dash counts = 0/0, lint `FAIL=0` on both (idea also reports `WARN=1`, which the verification does not gate on). All of this matches the task's declared result.
- DoD.1 (numbering rule matches the example), DoD.2 (trace rule stated once, referenced by number from Process), DoD.3 (no all-caps law), DoD.4 (three laws, seven fix-plan parts, reproduction-test rules, handoff, bypass rule all present), DoD.5 (idea's `viber:planner` handoff kept), DoD.7, DoD.8, DoD.9 all hold under inspection of the diff and the verification output.
