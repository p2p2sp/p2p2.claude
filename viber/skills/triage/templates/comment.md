Fill rules, never copied into the report (the report is the fenced block alone):
- Write every heading and every line in the language of the conversation with the user. Translate the headings, the `<summary>` text included; keep all eight, in this order, one line saying so when a section has nothing to say, and keep the `<details>` wrapper with its blank lines.
- Name files by path and code by symbol, never by line number.
- Scope: S = one area, up to 3 files; M = up to 3 areas or up to 10 files; L = anything larger, or a change that needs a specification of its own.
```
## Summary
One or two sentences: what the issue asks for, in your own words, and what the reporter observed as opposed to what they assume.

## Scope
S | M | L - n files across n areas: the areas.

## Classification
bug | feature request | other - one line why.

## Feasibility
feasible | feasible with conditions | not feasible | cannot tell - one line why, each condition named.

## Approach
Recommended: variant n - why. For a bug: the suspected divergence, stated as a hypothesis.

1. Variant - how it works, what it costs, its trade-off.
2. Variant - ...

## Impact
- Behavior, callers, data, public interface, configuration or documentation touched beyond the change site.

## Risks and unknowns
- The risk or open question, and what would settle it.

<details>
<summary><b>Affected code</b></summary>

- `path` - `symbol` - its role in the issue (read | inferred)

</details>
```
