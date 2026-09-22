# T1 - memory-map.sh

- `core.filemode=false` here, so a new script enters the index as 100644 whatever its filesystem bit: DoD.4's 100755 was recorded with `git update-index --add --chmod=+x <script>` (a later `git add -A` keeps it). Every new shipped script needs that call.
- Commit 7d9cf13, another task staging with no pathspec, swept an in-progress copy of both T1 files into itself at 100644 - T1's own commit therefore lands as a modification, and it is the one that carries the exec bit.
- Choices C1 left open, now pinned by the suite: `toolchain` needs the manifest DIRECTLY inside the candidate; `files`/`bytes` count every tracked file beneath it; a node over a subtree is not an orphan (orphan = nothing else tracked anywhere beneath it); refusal reasons are exactly `not-a-node | modified | untracked`; `--reset` with no path, and any unknown argument, exit 2 with usage on stderr and empty stdout.
- `git status --porcelain -z` needs `-uall` or an untracked node is collapsed to its directory name and never seen.
- Sizes come from ONE `xargs -0 wc -c` pass attributed to directories inside awk: a `wc` per file is thousands of processes on a real host repo (this one maps in 1.7s on Git-Bash).
