---
name: superbuild-reviewer-readiness
description: Pipeline-bound; invoked only by `superdev:superbuild-reviewer` via the Skill tool, never directly.
model: sonnet
effort: high
context: fork
user-invocable: false
allowed-tools: Read, Glob, Grep, Bash(sh:*), Bash(cat:*)
---

# Production-readiness lens (fork)

Final whole-plan code-review lens. You own EXACTLY ONE dimension — **Production readiness** — applied to the cumulative plan diff. Code quality, architecture, testing, plan completeness, and the full suite are out of scope; do not touch them.

Read the shared rubric for the shared, dimension-agnostic scope / false-positive / severity / verdict / output rules: `${CLAUDE_PLUGIN_ROOT}/shared/rubric-code-review.md`. Your **Production readiness** dimension's criteria and per-dimension severity mapping are in the How-to-work injected below; if the rubric cannot be read after install, those injected steps still carry the dimension criteria and severity mapping.

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/auditor-contract.sh" production-readiness`
