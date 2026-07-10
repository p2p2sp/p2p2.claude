# Design Process & Handoff

Read when planning a design workflow, choosing wireframe fidelity, or writing a developer handoff spec.

## Problem framing

- Anchor the work in ONE specific problem statement phrased as "How might we ...", grounded in a user need (e.g. "Independent creators need a safe way to reach a wider audience.") — never a feature request.
- Treat the process as a loop, not a line: findings from testing feed back into the problem statement and ideas. The loop ends in developer handoff.

## Wireframe fidelity ladder

- Lo-fi: layout and functionality skeleton only — validate structure before any styling.
- Mid-fi: real buttons and text fields, still no visual detail — validate flows.
- Hi-fi: final look and feel — the right fidelity for user testing, since users react to realistic screens.
- Escalate fidelity only after the previous rung is validated — polishing an unvalidated structure wastes the polish.

## Developer handoff = full UI specification

A design is not done until every component ships with:

- Exact dimensions in px for every element.
- All spacing values (margins, padding, gaps between stacked blocks).
- Responsive behavior of each element.
- Interactive states (default/hover/active/disabled) with duration and easing for every interaction — timing recipes in components-states.md. Unspecified motion gets improvised by developers; write it down or lose consistency.

Annotate layouts like an engineering blueprint: element names, px dimensions, margins, states. Tag readiness explicitly, e.g. `STATUS: READY FOR DEV | VERSION 1.0`.

Model of required spec granularity — a single button:

```
Button: width 168px, height 48px, corner radius 8px, horizontal padding 12px
Type: Inter Bold, 16px / 24px line-height, letter-spacing 0.5px
```

Page-level rhythm belongs in the spec too — e.g. 16px vertical margin between stacked sections, 32px gap before the primary CTA.
