#!/usr/bin/env bash
# superdev / SessionStart hook.
#
# Prints ONE obsolescence banner in the user's terminal and injects NOTHING
# into the model's context. superdev ships no manifest any more: the plugin is
# superseded by viber, whose own SessionStart hook carries the manifest for
# that track.
#
# Contract:
#   stdin  : JSON hook payload (drained, never parsed)
#   stdout : { "systemMessage": "!!! superdev is obsolete - use viber instead !!!",
#              "hookSpecificOutput": { "hookEventName": "SessionStart" } }
#            never an `additionalContext` key.
#   exit 0 : always (fail-open; decisions are conveyed in stdout, not exit code).
#
# `systemMessage` MUST be a top-level JSON field, not nested in
# `hookSpecificOutput` -- `hookSpecificOutput.systemMessage` is not a documented
# SessionStart field and is silently ignored by Claude Code. It surfaces in the
# user's terminal but is NOT added to the model's context.
#
# Policy:
#   - source == "resume" -> excluded by the matcher in hooks.json, so this
#                           script does not fire on resume.
#   - any error          -> exit 0 (never wedge the harness).
#
# SessionStart fires for the main session only (sub-agents use SubagentStart/
# SubagentStop), so the banner does not reach sub-agent contexts.

set -u
# NB: no `set -e` -- fail-open requires us to swallow non-zero exits.

# --- drain stdin ---------------------------------------------------------
# Drain and discard the hook payload so the writer never hits EPIPE. Nothing
# in it is read: the output is a constant.
cat >/dev/null 2>&1

# --- emit ----------------------------------------------------------------
printf '{"systemMessage":"!!! superdev is obsolete - use viber instead !!!","hookSpecificOutput":{"hookEventName":"SessionStart"}}\n'
exit 0
