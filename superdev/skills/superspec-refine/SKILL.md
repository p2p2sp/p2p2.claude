---
name: superspec-refine
description: Use this skill always when user want to work on existing spec.
user-invocable: true
argument-hint: <path-to-spec>
allowed-tools: Read, Skill
---

The user wants to work on the existing spec at "$ARGUMENTS" - to change, edit, improve, simplify, or otherwise evolve it; the interview resolves exactly what.

- Read the spec at "$ARGUMENTS" so its current content is the baseline in context, and keep its path in context - the eventual `superspec` handoff overwrites this file in place.
- Run the `superdev` Skill to drive the interview over that existing spec.

Ask the user nothing here and do not edit the spec yourself - `superdev` owns the interview.
