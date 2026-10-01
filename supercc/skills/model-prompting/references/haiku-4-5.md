# Claude Haiku 4.5

Alias `haiku`, ID `claude-haiku-4-5-20251001`, released 2025-10-15. Context 200K, output 64K, knowledge through Feb 2025. $1/$5 per MTok. No `effort`; thinking only as extended thinking, which in Claude Code follows the session's thinking setting. Retirement not sooner than 2026-10-15, with at least 60 days' notice: re-check what `haiku` resolves to before relying on this profile.

## Profile

- No interleaved thinking: it thinks only at the start of a turn, never between tool calls. Put decision criteria up front, or ask for a written check after each tool result.
- Thinking from earlier turns is dropped once a new user turn starts: a plan it made then is gone unless it wrote it down.
- Hardcodes tests more often than Sonnet 4.5, and an anti-hardcoding instruction helps only modestly (impossible-task hack rate 30 to 23 percent): verify coding output with tests it cannot see.
- Over-refuses dual-use security work in Claude Code (network recon, vulnerability testing): keep security workers off Haiku.
- Slightly favours a Claude-labelled option when choosing among models or vendors, and picks correctly when labels are anonymised: strip the labels.
