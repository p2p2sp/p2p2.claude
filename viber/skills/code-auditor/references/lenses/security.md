# Security lens
Audits exploitable flaws: an attacker-controlled input that reaches a sink, a missing or wrong authorization, a leaked secret, broken cryptography. A wrong result without an attacker belongs to the bugs lens, a slow path to the runtime performance or web performance lens, a weak test to the tests lens, and structure without an exploit to the design lens.

## Hunts
### injection
SQL and NoSQL, OS command, `eval`, template (SSTI), XXE and XSS. Trace each sink back to an entry point: source, propagators, sanitizer, sink. A sink with no source an attacker controls is not a finding.

### access-control
Missing or wrong authorization: an object ID read from the request with no ownership check, a route left out of the auth middleware, JWT `alg` or key confusion, session fixation, CSRF on a state-changing route, mass assignment. Compare each route with its siblings: the outlier is the bug.

### untrusted-data-to-machinery
Untrusted data reaching files, the network or objects: path traversal (checked before canonicalizing), unrestricted upload, SSRF where the attacker picks host or scheme, unsafe deserialization (`pickle`, `yaml.load`, `ObjectInputStream`, `unserialize`, `BinaryFormatter`).

### secrets-and-crypto
Committed live credentials and private keys, weak or attacker-chosen algorithms, ECB, a static IV or nonce, tokens from a non-CSPRNG, TLS verification off, `==` on a MAC, dangerous defaults (an empty key that skips the check).

### exposure-and-supply-chain
Secrets or PII in logs and responses, debug endpoints left on, CI workflows running untrusted PR code with secrets (`pull_request_target` plus a checkout of the PR head), install scripts fetching unpinned code.

## Excluded
- Denial of service, resource or CPU and memory exhaustion, rate limiting, ReDoS, resource leaks.
- Missing hardening or best practice with no concrete exploit; input validation with no proven security impact.
- Outdated dependencies, a version-only finding.
- Memory safety in memory-safe code: safe Rust, Go without `unsafe` or cgo, managed languages.
- Code used only by tests, and documentation files.
- Log spoofing, logging of non-secret non-PII data, missing audit logs.
- Regex injection; SSRF controlling only the path; user content in an LLM prompt.
- Auth checks missing from client-side code.
- XSS in React or Angular without `dangerouslySetInnerHTML`, `bypassSecurityTrust*` or similar.
- Theoretical races or timing attacks, TOCTOU without proof the value can change.
- Attacks needing control of env vars, CLI flags or install-time config.
- Secrets on disk that are otherwise secured; guessing UUIDs.
- Tabnabbing, XS-Leaks, prototype pollution and open redirect, unless the exploit chain is concrete.
- Shell scripts, notebooks and CI workflows, unless untrusted input demonstrably reaches them.
- A finding resting on "looks dangerous" or "similar code elsewhere was vulnerable".

## Verify
Worktree: required

Oracle: with attacker-controlled input at a real trust boundary, the claimed security property is observably violated.

1. Restate the claim in one sentence: source, path, sink, impact, attacker position. A claim that cannot be restated coherently: REFUTED.
2. Trace backward from the sink: list every hop and every validator, sanitizer, framework auto-escape and auth check on the path.
3. Execute in the clean worktree: a unit test or script calling the vulnerable function with the payload; otherwise start the unit on localhost with local stubs or SQLite. A concrete symptom is needed: an injected clause executes, a marker file appears, a file outside the root is read, the wrong principal is allowed, a secret shows in output.
4. A claim that cannot be executed passes six gates, each with cited lines: reachability, attacker control, real impact, PoC trace, bounds or math, no environmental block.

Verdicts:
- VERIFIED: the PoC shows the symptom, or all six gates pass with every hop read. Never VERIFIED on a pattern match alone.
- PARTIALLY VERIFIED: real, but the precondition or impact is weaker than claimed; state the corrected scope.
- REFUTED: any gate fails with cited evidence.
- INCONCLUSIVE: a hop is unreadable (reflection, DI wiring, generated code, a deploy-time proxy, WAF or config), the PoC needs a live external service or real credentials, or the existence of a deserialization gadget chain is unknown.

## Severity
- 9-10: pre-auth RCE, auth bypass to admin, cross-tenant read or write at scale, a committed live production credential.
- 7-8: authenticated RCE or injection, IDOR across users, SSRF to internal hosts or cloud metadata, stored XSS in a privileged view, arbitrary file read or write.
- 4-6: needs user interaction or a specific precondition: reflected XSS, CSRF, weak crypto on moderately sensitive data, a leak of internal details.
- 1-3: reachable only by an already-privileged actor, or defense in depth only.

Subtract 2 when the attacker must be admin or local; add 1 when it is reachable from the internet without auth.
