# Experiment plan and decision thresholds

## Where hypotheses come from

1. Top entries of `02-hypotheses.md` (riskiest first).
2. Every "what would change my mind" statement from the council, round 1 and 2. These are already phrased as tests; keep the member's name attached.
3. Every autopilot killer without a confirmed fix.
4. Every `no data found` on a key dimension.

Cap the plan at 6–8 experiments. More than that is a research programme, not a side project.

## Experiment table (report format)

`# | hypothesis | test | metric | pass threshold | fail threshold | cost (hours / money) | duration | owner-member | order`

Order by: kills the most load-bearing hypothesis first, then cheapest. The first experiment must target the weakest key dimension (Problem strength, Distribution, Autopilot fit).

## Catalogue

Pick the cheapest test that can *kill* the hypothesis, not the one that can confirm it.

| Test | Best for | What it can and cannot tell you |
|---|---|---|
| **Mom Test interviews** (5–10) | Problem strength, segment | Past behaviour and current workaround. Cannot tell you they'll pay. Questions must be about the past ("last time this happened, what did you do?"), never about the hypothetical product. |
| **Landing page + waitlist** | Distribution, message | Whether the pitch converts visitors from a specific channel. Meaningless without a traffic source you can name. Measure visitor→signup by source. |
| **Fake door / pricing page** | Revenue model, price point | Click on "Buy" at a stated price. Tells you intent at that price, not payment. Be transparent after the click. |
| **Pre-sale / deposit** | Revenue model | Strongest demand signal short of a product. Refundable. Count paid, not promised. |
| **Concierge MVP** | Problem strength, delivery model | Deliver the outcome manually for 3–5 customers. Tells you what the product must do and what they pay for. Expensive in hours; do it before automating the wrong thing. |
| **Agent-built thin MVP** | Activation, retention | Since the build is cheap, this is legitimate *after* demand and channel are tested, never as the first test. Measure return usage in week 2, not signups. |
| **Channel probe** | Distribution | Post/list/advertise in the one channel the Growth member named. Measure clicks and cost. Two weeks maximum. |
| **Sean Ellis PMF survey** | Retention (post-MVP only) | "How would you feel if you could no longer use this?" 40% "very disappointed" is the common benchmark, with known false positives; use only with real users. |
| **Support-load simulation** | Autopilot fit | Run the concierge or MVP phase and log every human intervention with time spent. Extrapolate to hours/week. |
| **Dependency stress test** | Risk | Read the ToS and pricing history of each critical API; write down what happens if it goes away. Zero cost. |

## Decision thresholds (step 14)

Written **before** any experiment runs, in the report's own section, as three rows:

- **Go if:** e.g. ≥ 5 of 8 interviewees describe an active workaround costing ≥ 1 h/week AND landing page converts ≥ 5% from the named channel AND ≥ 3 pre-sales.
- **Pivot if:** the problem is confirmed but the channel or price fails — say what to change.
- **No-Go if:** e.g. ≤ 2 interviewees have the problem, or the channel probe produces zero qualified traffic in two weeks.

Thresholds must be numbers the user cannot reinterpret later. "Good response" is not a threshold. Include the sample size next to each number.

## Closing note for the report

The report ends with this idea in the report language: the verdict says whether the idea is worth *testing*, not worth *building*. The experiments answer "will they pay". The final decision combines those results with the user's own time constraints.
