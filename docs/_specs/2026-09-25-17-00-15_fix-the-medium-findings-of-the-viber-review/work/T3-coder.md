# T3 coder notes

- `feeds` is computed inside the existing File-ownership loop, not the earlier `named` check: `named` only asks whether SOME holder uses the block (reachability); `feeds` asks whether some OTHER task (not the holder itself) uses it. A holder that only names its own block in Uses gets no feeds entry unless a different task also names it.
- Both awk programs in this script sit inside one bash single-quote each: no apostrophe may appear anywhere in their comments (bit me once - "a task's Verification text" broke `bash -n` with a cryptic `syntax error near unexpected token '{'` far below the real cause). Confirmed with `bash -n viber/scripts/plan-index.sh` after every edit to the awk blocks.
- `verify:` lines print in a loop separate from the `tasks:` rows, after them and before any `dirty:` line, in task order - matches C1 exactly.
- Left `implementor` step 3's "several tasks depend on it" tier rule as "several tasks naming it in their deps" (an index field already visible), not a literal restating of `feeds`: a load-bearing task can earn opus by fan-in alone even with no contract block.
