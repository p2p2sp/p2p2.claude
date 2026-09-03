# Council protocol

Seven members, each with a different guiding question and different primary dimensions. The point is independent perspectives, so isolation in round 1 is not optional.

| # | Member | File | Guiding question | Primary dimensions |
|---|---|---|---|---|
| 1 | Target customer | `council/01-customer.md` | Do I really have this problem, and would I pay for this? | Problem strength, Revenue model |
| 2 | Skeptic / red team | `council/02-skeptic.md` | What must be true for this to work, and why is it probably not? | All (contrarian) |
| 3 | Market analyst / investor | `council/03-analyst.md` | Market, competition, timing, unit economics | Market size, Competition, Timing |
| 4 | Growth / distribution | `council/04-growth.md` | How will the first 100 customers hear about this? | Distribution |
| 5 | Operator | `council/05-operator.md` | What hurts in month 3 after launch? | Side-project fit, Autopilot fit |
| 6 | Risk & legal | `council/06-risk.md` | Regulation, API dependencies, what kills this with one external decision? | Risks, Autopilot fit |
| 7 | Optimist / visionary | `council/07-visionary.md` | Best realistic case; where does this lead if it works? | Advantage, upside |

## Launching a member (round 1)

Spawn a `general-purpose` Agent subagent per member, all seven in the same turn. The prompt contains, in this order:

1. The full text of the member file `references/council/<nn>-<member>.md` (read it and paste it; subagents cannot see the skill).
2. The line: `Write in <report language>.`
3. The list of paths to `01-normalized.md` … `09-autopilot-fit.md`, with the instruction to read all of them before answering and to cite the file (and the URL inside it) for every fact used.
4. The output path `10-council-r1/<member>.md` and the round-1 output format below.
5. `Do not look for or read any file under 10-council-r1/ or 11-council-r2/.`

Do not summarise the research for the member. Do not tell the member what other members think. Do not tell it what verdict you expect.

## Round-1 output format (every member, verbatim headings)

```
# <Member name> — round 1
## Position
One of: Go / Pivot / No-Go, plus one sentence.
## Three strongest arguments
1. … (cite file + URL)
2. …
3. …
## Scores
Table: dimension | score 1–5 | confidence | one-line reason — only for the member's primary dimensions, plus any other dimension the member feels strongly about.
## What would change my mind
2–4 concrete, testable statements ("if 5 of 10 interviewees say X, I move to Go").
## Facts I relied on / facts I could not verify
```

## Round 2 (default on; skipped only with `--quick`)

Spawn the same seven members again. Each prompt contains: its member file, its own round-1 file, all six other round-1 files, the report language, and the round-2 format. Instruction: respond to specific arguments by name ("The Skeptic's argument 2 is wrong because…" / "The Operator convinced me on…"). No restating round 1.

```
# <Member name> — round 2
## Responses to other members
- To <member>, argument <n>: agree / disagree, why, evidence.
## Updated position
Same as before / changed to … because …
## Updated scores (only if changed)
## Unresolved disagreement I want recorded
```

Members should feel free to change position. A member who never changes across many runs is a prompt that is too rigid; note it as a skill-improvement item, not as strength.

## Moderator protocol (main context, step 12)

The moderator has no opinion of its own. It reads all round-1 and round-2 files and produces `12-synthesis.md`:

1. **Agreed points** — claims at least five members support, each with the members named.
2. **Disputed points** — each with the members on each side, their strongest argument, and whether round 2 moved anyone. Disputes are preserved; they are not resolved by the moderator.
3. **Scorecard** — per dimension: primary owner's score, range if disputed, confidence per `dimensions.md`, one-paragraph justification quoting members, evidence links, dissenters named.
4. **Verdict** — Go / Pivot / No-Go per the verdict rules, with the arithmetic shown and the "weakest key dimension" rule applied explicitly.
5. **Biggest single risk** — one, named by the council, not chosen by the moderator.
6. **Dissenting opinion** — mandatory. Written from the losing side's best arguments, in their words, at least as long as the verdict justification. If the verdict is No-Go, the dissent is the Visionary's and Customer's case; if Go, the Skeptic's and Risk's case.
7. **Council health** — did positions differ in round 1? Did anyone move in round 2? Unanimity-without-reservation → warning banner in the report.

The moderator attributes every sentence to a member. If a point cannot be attributed, it does not go into the synthesis.

## Safeguards against fake diversity

- Separate subagent per member; never one subagent playing all seven.
- Different, concrete guiding questions (in the member files); not "give your perspective".
- Members see the same research, so disagreement is about interpretation and priorities, not about facts.
- Unanimity is treated as a failure signal, not a confidence signal.
- The moderator adds nothing; if the synthesis feels thin, that is a finding about the council, not a gap to fill.
