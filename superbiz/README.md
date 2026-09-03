# superbiz

The business validation and product roadmap ecosystem for Claude Code. Three things it does: judge whether
an idea is worth building, turn a validated idea into a phased execution plan, and pressure-test a decision
with real stakes through a council of five independent advisors.

The framing is deliberate and non-negotiable: an idea is judged as a **side-income product that runs on
autopilot** - a supplementary income source needing minimal owner time after launch - not as a
venture-scale startup. An estimated post-launch maintenance load clearly above your stated budget breaks
the gate on its own, however attractive the market looks.

Every entry skill asks the questions in your session and then hands the heavy work to a fork that runs out
of the main context. Ships no hooks and no manifest.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superbiz@p2p2 --scope user
```

Needs web access for the research and roadmap skills. No runtime dependencies.

## Quick start

### Validate an idea

Describe the idea and ask whether it is worth building ("is my idea good", "who would I compete with",
"could this beat <product>"). `business-idea-validator` fires by itself.

1. It interviews you: the idea, the maintenance hours per month you accept after launch, and the
   supplementary income you are targeting. Decline any of them and it is recorded as "unstated", never
   invented.
2. A fork runs the deep web research - competitors, market sizing, differentiation - scores six dimensions
   led by perceived created value, and writes a sourced BUILD / PIVOT / DROP report to
   `docs/business/<idea-slug>/walidacja.md`.
3. A council round then runs on that finished report automatically (no opt-in) and writes `rada.md` beside
   it. You get both verdicts, and any clash between them is stated outright rather than smoothed over.
4. It offers to chain straight into the roadmap.

Every number in the report is sourced, and every claim is labeled fact, estimate or assumption.

### Plan the launch

Ask for a launch plan, go-to-market plan or roadmap - or accept the offer at the end of a validation.
`product-phase-roadmap` interviews you about scope and constraints, then a fork writes one Markdown file
per phase to `docs/business/<idea-slug>/plan/`: landing page + waitlist, MVP, public launch, growth - each
with step-by-step actions covering marketing, distribution and metrics.

### Convene the council

Say "council this", "I can't decide", or put a genuine tradeoff on the table. `council-this` frames the
decision and its stakes, then a fork convenes five advisors in parallel and synthesizes one chairman
verdict - a clear recommendation plus a single first step - at `docs/business/<decision-slug>/rada.md`.

Do not reach for it on questions with one verifiable right answer, or on a casual should-I with no real
tradeoff.

## Skills

| Skill | Role |
| --- | --- |
| `business-idea-validator` | Interactive entry - resolves the idea, the accepted maintenance load and the income target, dispatches the researcher, then runs the mandatory council round on the finished report and relays both verdicts. Ends by offering the roadmap. |
| `business-idea-validator-researcher` | Fork - deep web research, six scored dimensions with autopilot operability as a hard gate, and the sourced BUILD / PIVOT / DROP report. |
| `product-phase-roadmap` | Interactive entry - resolves the source report, the slug and every open decision, then dispatches the writer. |
| `product-phase-roadmap-writer` | Fork - refreshes best practices from the web and writes the phased execution folder. |
| `council-this` | Interactive entry - frames the decision and its stakes (at most one clarifying question), then dispatches the chairman. |
| `council-this-chairman` | Fork - convenes the five persona agents in one parallel dispatch and writes the chairman verdict. |

## Agents

The five council personas, dispatched by `council-this-chairman` only.

| Agent | Angle |
| --- | --- |
| `council-contrarian` | Hunts the fatal flaw: what is wrong, missing, or will fail. |
| `council-first-principles` | Strips the framing's assumptions and rebuilds the reasoning from the ground up. |
| `council-expansionist` | Finds the upside everyone else misses - the ceiling, not the floor. |
| `council-outsider` | Responds only to what is literally on the page; flags jargon and unstated assumptions. |
| `council-executor` | Only feasibility and the fastest path: the concrete next move. |
