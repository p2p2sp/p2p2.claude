# Design lens
Audits structure that makes change expensive: one piece of knowledge kept in several places, code that must change together but lives apart, abstractions that grew wrong, dependencies pointing the wrong way, dead or drifted code, and breaks of the project's own written rules. A wrong result, crash or lost failure belongs to the bugs lens, an exploitable flaw to the security lens, a slow path to the runtime performance or web performance lens, and a weak or missing test to the tests lens. Every finding needs a concrete change scenario plus history evidence; a finding closable as "won't fix" at no argued cost is a nit and is never filed.

## Hunts
### knowledge-duplication
One fact (a business rule, file format, schema, constant, protocol step, validation) written in 2 or more places that must change together. Matching text alone does not count: the copies must hold the same knowledge. Name the fact in one sentence.

### change-preventers
Shotgun surgery (one change means edits across many files), divergent change (one file changes for unrelated reasons), god modules (large, high-churn, low cohesion). Start from the co-change and hotspot signals.

### wrong-abstraction
A shared helper that grew per-caller flags or branches, a shallow or pass-through module, callers depending on another module's internal format, an invariant that lives only in a comment.

### boundary-coupling
Imports pointing the wrong way, import cycles, code reaching into another module's internals, fan-in hubs that change often.

### dead-and-drifted
Exports nothing references, parameters or flags no caller sets, unreachable branches, comments contradicting the code.

### rule-drift
A `CLAUDE.md` or `.claude/rules` file says X and the code does Y in several places. Only an explicit written rule qualifies; quote it.

## Map signals
History only ranks units, it is never a finding. Rank a unit higher the more signals it carries. Version bump and release commits touch the same manifests every time, so the co-change command skips them and commits over 30 files; without that skip every top pair is a bump. Pairs in different directories with no import between them rank highest; a test paired with its source is expected and does not count.

Co-change pairs of the last 12 months, shared commits first (at least 3):
```bash
git log --since='12 months ago' --no-merges --invert-grep -i -E --grep='^(chore|build)(\([^)]*\))?: *(bump|release)|^(bump|release)' --name-only --format=format:@ -- <scope> | awk 'function e(){if(n>1&&n<=30)for(i=1;i<n;i++)for(j=i+1;j<=n;j++)c[f[i]" | "f[j]]++;n=0} /^@$/{e();next} NF{f[++n]=$0} END{e();for(k in c)if(c[k]>=3)print c[k],k}' | sort -nr | head -30
```

Churn times size hotspots, churn count first, then lines:
```bash
git log --since='12 months ago' --no-merges --name-only --format= -- <scope> | grep -v '^$' | sort | uniq -c | sort -rn | head -50 | while read c f; do [ -f "$f" ] && echo "$((c * $(wc -l < "$f"))) $c $f"; done | sort -rn | head -30
```

Largest files:
```bash
git ls-files -z -- <scope> | xargs -0 wc -l | sort -rn | head -20
```

Repeated literals, a candidate for knowledge duplication (a literal found in 3 or more places); `git log -S` on a literal shows commits that touched only some copies:
```bash
git grep -ohE '"[A-Za-z0-9_./:-]{12,}"' -- <scope> | sort | uniq -c | sort -rn | awk '$1>=3' | head -30
```

Import fan-in, the modules most depended on:
```bash
git grep -hE '^(import|from) |require\(' -- <scope> | grep -oE "['\"][^'\"]+['\"]" | sort | uniq -c | sort -rn | head -20
```

Import fan-out, the files depending on most others:
```bash
git grep -cE '^(import|from) |require\(' -- <scope> | sort -t: -k2 -rn | head -20
```

Dead export candidates: an exported name that `git grep -lw` finds in only one file. These are leads, not findings.

## Excluded
- Style, formatting, naming taste, anything a linter, formatter or compiler catches.
- In diff scope: old code the diff does not touch, unless it blocks the change.
- "Could be more SOLID", "consider extracting", "for extensibility" without a concrete pain.
- An abstraction for code in only 2 places with no co-change history.
- A finding contradicting the repository's documented conventions (a rule that plugins are self-contained makes cross-plugin copies deliberate).
- Generated, vendored, lockfile, fixture and migration files.
- Test-only duplication, unless the tests encode production knowledge.

## Verify
Worktree: none

Nothing here is proven by running code. The critic refutes the finding gate by gate from the repository and its git history, working only from the claim; a failed gate is REFUTED unless stated otherwise.
1. Existence: every cited location exists at the cited lines and says what the finding claims.
2. Same knowledge: write the single fact all copies encode in one sentence. Copies that change for different reasons are coincidental: REFUTED.
3. Change scenario: one concrete, realistic change, ideally a past commit, needing edits in N places today and 1 in a fixed design.
4. Pain evidence, at least one: the pair co-changed in 3 or more commits at a coupling of at least 30%; a commit fixed one copy and missed another; the unit is a top-decile hotspot; the change scenario touches 3 or more files; the finding quotes a project rule verbatim with the lines breaking it.
5. Not deliberate: search `CLAUDE.md`, `.claude/rules`, ADRs and nearby comments for an intentional choice. An intentional one is REFUTED.
6. Fix economics: the fix is concrete, touches fewer places than it saves and creates no wrong abstraction. A fix adding a per-caller flag or branch to shared code is REFUTED.
7. Dead-code reachability: search dynamic references too (strings, reflection, config, globs, plugin manifests) before accepting a dead-code claim.

Verdicts:
- VERIFIED: every gate passes.
- PARTIALLY VERIFIED: gates 1 to 3 pass but the pain evidence is weak or the severity or fix is wrong; restate the corrected claim.
- REFUTED: a gate fails.
- INCONCLUSIVE: the history is too thin (a shallow clone, squash-only merges, about 20 commits or fewer touching the unit), dead-code reachability depends on runtime dispatch grep cannot settle, or whether the pattern is deliberate depends on intent written down nowhere.

## Severity
Nothing is broken, so this lens caps at 6 unless the flaw already caused a bug.
- 1-2: real but local; 2 places, low churn, no co-change.
- 3-4: knowledge duplicated in 3 or more places, or co-change in 3 or more commits; every change costs N edits.
- 5-6: a top-decile hotspot or god module, co-change in 5 or more commits at 50% or more, or a written project rule broken in several places.
- 7-8: only when the flaw already caused a bug: a fix that missed a copy, or copies disagreeing now and producing wrong behavior.
- 9-10: not used; hand those to the bugs lens.
