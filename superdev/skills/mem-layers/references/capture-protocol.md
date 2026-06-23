# Memory Layer Capture Protocol

## Capture Order

Work leaf-first, clarity-first:

1. Well-understood leaf areas (utilities, helpers)
2. Domain-specific modules (auth, payments)
3. Integration layers (APIs, clients)
4. Complex/tangled areas (legacy, core logic)
5. Root and intermediate nodes (summarize children)

## SME Interview Questions

### Purpose & Scope

- "In one sentence, what does this area own?"
- "What is explicitly NOT this area's responsibility?"

### Entry Points

- "Where does code execution typically start in this area?"
- "What are the main APIs/interfaces other code uses?"

### Commands

- "How do you build, test, lint, and run this area? Where are those commands defined?"
- "Does this subtree have its own toolchain, or does it inherit the repo's?"

### Contracts & Invariants

- "What must always be true here? What would break if violated?"
- "What are the implicit rules that aren't in the code?"

### Patterns

- "How do you add a new [typical task] here?"
- "What's the canonical way to do [common operation]?"

### Anti-patterns

- "What mistakes do new engineers typically make here?"
- "What should never be done, even if the code allows it?"

### Pitfalls

- "What's the most surprising thing about this code?"
- "What looks deprecated but isn't?"

## Summarization Rules

When creating parent nodes:

1. **Summarize child nodes, not raw code** - children are already compressed
2. **Use LCA for shared facts** - applies to multiple children? move up
3. **Add cross-cutting context** - how children relate, patterns that span areas

## Quality Checklist

Before finalizing a node:

- [ ] < 4k tokens
- [ ] Purpose statement in first 2 lines
- [ ] Contracts are explicit (not "handle carefully")
- [ ] Anti-patterns from real experience, not hypothetical
- [ ] Downlinks use relative paths
- [ ] No duplication with ancestor nodes
- [ ] Commands (if any) discovered from host config, not invented; placed at the node owning the toolchain

## Example Capture

```
Q: "What does this area own?"
A: "Payment processing. We handle the lifecycle from initiation to settlement.
   Billing is separate - they handle invoicing."

→ Purpose: Owns payment lifecycle: initiation → validation → processing → settlement.
  Does NOT own: invoicing (see billing-service).

Q: "What invariants must never be violated?"
A: "Every payment mutation needs an idempotency key. We had an incident where
   a retry created duplicate charges."

→ Contracts: Idempotency keys required for all mutations (enforced by ProcessorClient type)

Q: "How do you test and run this area, and where are those commands defined?"
A: "It's its own package. Scripts live in services/payment/package.json -
   pnpm --filter payment test, pnpm --filter payment dev."

→ Commands (discovered from services/payment/package.json):
  Test: pnpm --filter payment test · Run: pnpm --filter payment dev
```
