## Task 2 - test(portability): add the static cross-OS invariant sweep over every shipped script

- The exec-bit ("invoked without an interpreter") rule is scoped to `*.sh` scripts only, not `*.ts` - a
  `.ts` file is always run through an explicit `node`/resolved-node-command prefix by convention in this repo
  (never bare-executed via its own shebang), and at least one real prose invocation
  (`superui/pro-designer/SKILL.md`'s `check_contrast.ts`) describes that explicit invocation without the
  literal word "node" immediately adjacent to the quoted path, which a literal bare/explicit text classifier
  cannot tell apart from a true bare invocation. Scoping the rule to `.sh` avoids a false positive on that
  line while still covering every script that can actually be exec'd directly by the OS. No `.ts` file in the
  repo carries the `100755` bit today, consistent with this scoping.
- `invocationPatterns`/`findInvocations` (helpers behind the exec-bit rule) derive each script's
  `${CLAUDE_PLUGIN_ROOT}/...` and `${CLAUDE_SKILL_DIR}/...` invocation text from its repo-relative path
  and search for that literal substring, rather than matching by bare basename - two scripts share a
  basename (`detect_state.sh` in both `superdev-memory` and `superdev-rules`; `create.sh` in both
  `create-issue` and `create-pr`) and basename-only matching could not disambiguate their invocation sites.
  Not called out explicitly in the Approach, but required for the detector to be precise rather than
  coincidentally correct.
- `findInvocations`' "explicit" classification strips a wrapping inline-code backtick (`` `bash "..."` ``)
  from the word preceding the quoted path before comparing it against `bash`/`sh`/`node` - several real
  invocations in prose (e.g. `commit-task.sh`, `decompose.sh`) sit inside a single backtick span, so the
  bare word-split otherwise yields `` `bash `` (with the backtick attached) instead of `bash`, misclassifying
  a genuinely explicit invocation as bare. Caught by running the sweep against the real tree; added a
  paired self-check.
- no other deviations.
