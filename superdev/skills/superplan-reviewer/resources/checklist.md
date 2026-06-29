### Group A — Codebase fit & architecture
1. Reuse-first: does the plan author new material where a suitable existing function, utility, component, module, or asset already exists? Name the existing item AND its path.
2. Convention conformance: style, directory structure, naming, and patterns required by CLAUDE.md / project rules — does the plan follow them?
3. Architecture: is the approach sound and appropriately simple? Prefer vertical slices (end-to-end per capability) over horizontal phasing (all of one layer, then all of the next) that delays end-to-end feedback. Flag over-engineering.
4. Blast radius / hidden breakage: trace what depends on the artifacts the plan touches (callers, references, contracts, downstream consumers, data). Flag changes that would break existing behavior the plan does not account for.

### Group B — Verifiability & risk
5. Evidence, not assertion: is the verification real, reproducible, and SUFFICIENT for a fresh reviewer to confirm "done" from its result alone — not from the executor's claim? Flag verification that only says "it works".
6. Test-first & coverage: where it makes sense, does the plan define the test or check before the work it validates? Are acceptance criteria objective and measurable, not subjective?
7. Rollback: is there a defined way to undo the change (commit points, backup, feature flag, migration reversal)?
8. Destructive / irreversible operations: are deletions, overwrites, data migrations, or actions on a live/production system explicitly flagged and guarded?
9. Out-of-scope guardrail: does the plan state explicit non-goals to prevent accidental changes beyond the task?

### Group C — Coverage
10. Coverage: map every deliverable implied by §1 Scope, §2 Context, and §9 Definition of done to a concrete change in §4 Files to change. List anything with no owning change.
11. Edge cases: are the edge cases, inputs, states, or scenarios named in §8 each addressed by a change in §4?
12. Scope creep: flag changes in §4 that go beyond §1 Scope without justification — especially anything that contradicts §10 Out-of-scope.
13. Internal fidelity: does §1 Scope + §2 Context describe a coherent goal that §4 actually serves, or a reframed/easier version of it?

### Group D — Executability
14. Placeholder scan: flag content a step needs but does not contain — "same as above", "similar to Task N", "TODO/TBD" left in, or any step stating WHAT without HOW.
15. Internal consistency: every name, identifier, signature, path, or term a later task reuses must match what an earlier task defines — no drift (e.g. `clearLayers` in one task vs `clearFullLayers` in another).
16. Dependency ordering & parallelism: prerequisites come before the tasks that build on them (a thing is defined before it is used). Any `[P]` (parallel) marker must point to genuinely independent tasks.
17. Per-task completeness: each task states a clear goal, its targets, an approach, an acceptance criterion, and a verification field.
18. Dangling references: no task references an artifact (identifier, section, file, resource) defined neither in any task nor (per the plan) in existing material.

### Group E — Security (Engage ONLY if the plan touches any of this areas)
19. Attack surface: new endpoints, inputs, or trust boundaries introduced — are they accounted for?
20. Input validation & encoding: is untrusted input validated/escaped at the right layer? Watch for injection, SSRF, path traversal, deserialization.
21. AuthN / AuthZ: are authentication and authorization checks specified where the plan adds protected behavior? Any privilege boundary crossed without a check?
22. Secrets & data handling: no secrets in code, config, or logs; sensitive data minimized and handled per policy; encryption where required.
23. Guardrails: assume the executor will eventually attempt something unsafe — does the plan include guardrails (least privilege, safe defaults)?
24. Compliance / domain rules: any domain-specific or regulatory constraint the plan must honor.
