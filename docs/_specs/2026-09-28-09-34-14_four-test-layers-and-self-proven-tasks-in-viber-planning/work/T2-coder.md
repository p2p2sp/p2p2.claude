# T2 coder notes

- The awk block is single-quoted bash: any apostrophe inside a comment breaks the shell parse
  with a cryptic `syntax error near unexpected token`. Hit this twice while wording the new
  `selfproven`/`stripticks` comments; reworded around the possessive instead of escaping.
- Whole-token match implemented by padding the (backtick-stripped) DoD text with a leading and
  trailing space, then matching `[^A-Za-z0-9_-]<id>[^A-Za-z0-9_-]` - avoids awk's lack of `\b`
  and handles an id at either edge of the line for free.
- The check runs inside the existing per-task validation loop (same one that already checks
  `dod[i] == ""`), scanning against the already-fully-populated `id[1..n]` array, so it needs no
  second pass and naturally sees every task of the plan regardless of task order.
- DoD.2-5 edge cases (own id, substring, backticks, --split exemption) all went green together
  once the full boundary+strip+skip logic landed in one edit, since the naive substring version
  was never a viable intermediate step worth shipping; DoD.1 was watched red first per TDD.
