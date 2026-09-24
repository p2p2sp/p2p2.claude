# T4 coder notes

- Extracted the heredoc's node program verbatim into `merge-settings.js` (same logic, same stdout/exit contract); `merge-settings.sh` now resolves its own dir via `here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"` (same pattern as `bootstrap.sh`) and runs `node "$here/merge-settings.js" "$template" "$target"`.
- The task's own Verification demands exactly one `merge-settings.js` grep match in the .sh file: the header comment had to stay filename-free ("the sibling merge program", not "merge-settings.js") to avoid a second hit.
- `merge-settings.js` keeps no exec bit and no shebang - it's never invoked directly, only via `node`, so the shell-preload/exec-bit rules don't apply to it.
- Did not touch `viber/CLAUDE.md`'s "embedded node program" wording - that's explicitly Out of scope (memory layer, build's close alone).
