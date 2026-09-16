The empty-value guard moved from the bash loop into the awk pass: awk now drops a `- Dir:` line whose
value is empty (and clears the pending title with it) instead of the old `if [[ -z "$value" ]]; then
continue; fi` - why: with two parallel arrays the skip has to happen before the tab-separated line is
emitted, otherwise `values` and `titles` could drift apart.

Step 5's "optional per-entry title" is realised as a `PhaseRef = string | { dir, title: string | null }`
union on `writePhases` rather than a second array argument - why: it keeps every existing call site
(`writePhases(root, ["phases/01-a"])`) untouched, and `title: null` expresses "write no `###` heading at
all", which the no-heading case needs.

Also rewrote the test file's header docblock to the three-column contract (the `Files` entry named only
`writePhases`, the assertions and the two new cases) - why: the docblock states the contract the file
proves, so leaving it at two columns would have been stale documentation inside a listed file.
