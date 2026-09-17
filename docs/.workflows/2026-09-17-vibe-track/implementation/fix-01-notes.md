# fix-01 notes (review-01-code)

## Runs
- node --test tests/superdev/vibe-guard.test.ts -> tests 18, pass 18, fail 0
- node --test tests/portability.test.ts -> tests 21, pass 21, fail 0
- grep -n "^name: vibe-implementor" superdev/agents/vibe-implementor.md -> 2:name: vibe-implementor (exit 0)
- grep -n "agents/vibe-implementor.md" superdev/.claude-plugin/plugin.json -> 44:    "./agents/vibe-implementor.md" (exit 0)
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))" -> exit 0

I1: fixed - no test: an agent prompt has no executable test; Task 2's own `### Failure modes` records `test: none - prompt` for every branch of it
I2: fixed

touched: superdev/agents/vibe-implementor.md
touched: superdev/scripts/lib_touched.sh
touched: superdev/scripts/vibe-guard.sh
touched: superdev/scripts/commit-task.sh
touched: tests/superdev/lib_touched.test.ts

UNDERSPECIFIED: lib_touched.sh's `root` dependency - `normalise_path` reads the caller's global `root` (both callers already set it before the first call) rather than taking it as a second argument, so neither `add_declared` changed shape; an unset or empty `root` skips the root reduction instead of aborting under `set -u`, where the copied code would have stripped a leading "/" against an empty root
UNDERSPECIFIED: `touched_paths` output contract - prints one raw declared path per line and leaves normalisation, dedupe, the `.temp/` drop and the `.` handling to each caller's own `add_declared`, per I2's "keep each script's own `add_declared` policy local to it"
