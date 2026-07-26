
## Task 2 - fix(superui): widen the collision gate to every merged namespace
- Covers: criteria #4, #5
- TDD: none

### Dependencies
- Task 1 - blocks: both tasks edit `build_registry.ts`; Task 1's NUL fix also makes the file greppable for this task's verification

### Files
- modify - superui/scripts/build_registry.ts (detectCollisions, mergeFragments, Collision)
- modify - superui/agents/design-synthesizer.md (Coherence and collision rules)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-textstyle .temp/superui-fix/t2/out.json` - exit 1, stderr names `text.body` and both fragment filenames
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-surface .temp/superui-fix/t2/out.json` - exit 1, stderr names the duplicated region
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-accent .temp/superui-fix/t2/out.json` - exit 1, stderr names the duplicated accentUsage triple
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-dup-within .temp/superui-fix/t2/out.json` - exit 1 for a single fragment declaring `text.body` twice in its own `textStyles` array
- `node superui/scripts/build_registry.ts .temp/superui-fix/t2/frag-clean .temp/superui-fix/t2/out.json` - exit 0, `REGISTRY_OK` line

### Approach
1. Generalise `Collision` from a token-only shape to `{ namespace: string; key: string; fragments: string[] }` and update the CLI's collision reporting to print the namespace alongside the key, keeping the existing one-line-per-collision format and exit 1.
2. Rewrite `detectCollisions` to walk four namespaces per fragment: `tokens` keys, `textStyles[].name`, `surfaceOrder[].region`, and `accentUsage` keyed on the `screen`+`where`+`token` triple. Keep one `Map<string, string>` per namespace so a name may legitimately repeat across namespaces.
3. In the same pass, detect within-fragment duplicates for the three array namespaces by checking each array against a per-fragment set before merging it into the cross-fragment map; report them with both `fragments` entries set to the same filename.
4. Correct the `detectCollisions` docstring and both stale header-comment claims: that a same-fragment duplicate is unobservable after `JSON.parse` (true for `tokens{}`, false for the three arrays, which survive parsing intact), and the header's description of the collision exit as token-name-only, which now covers four namespaces.
5. In `design-synthesizer.md`, widen the collision rule so "a duplicate name aborts the merge" is stated for every merged namespace rather than token names alone.

### Edge cases
- `surfaceOrder` and `accentUsage` are optional and default to `[]`; an absent field must not register as a collision.
- The same dotted name legitimately appearing as both a token key and an `accentUsage[].token` reference is not a collision - `accentUsage[].token` is a reference, and its referential check against merged tokens stays as it is.
- Two `accentUsage` entries sharing a screen but differing in `where` are distinct and must pass.

### Contracts
- `detectCollisions(fragments: NamedFragment[]): Collision[]` where `Collision = { namespace: string; key: string; fragments: string[] }`.
- `mergeFragments` keeps its current signature and concatenation order; only the pre-merge gate changes.

### DoD
All Task 2 test commands produce the stated exit codes, the four duplicate fixtures each fail with a message naming the namespace and key, and the clean fixture still merges.


### Covered criteria
4. `build_registry.ts` exits 1 naming both source fragments when two fragments declare the same `textStyles[].name`, the same `surfaceOrder[].region`, or the same `accentUsage` screen+where+token triple.
5. `build_registry.ts` exits 1 when a single fragment's `textStyles`, `surfaceOrder`, or `accentUsage` array declares the same key twice.
