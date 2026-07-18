# Skill chaining — the full pattern

**Provenance honesty (read first).** The primitives — `context: fork`, `Read`, `Write`, `Bash`, `!command` —
are all Anthropic-documented. The *composition* taught here ("each stage writes a predictable file, the next
reads it") is a natural consequence of those primitives and is **community practice, not Anthropic doctrine**
(shared by toolkits such as `obra/superpowers`). The mechanism is supported; the architecture is a design
choice. Label it that way when you teach it. Field validity is owned by `authoring-reference`.

---

## Chapter 1 — The problem: context residue

A skill works fine on one item. Run it fifty times and it chokes — not because the skill is broken, but because
every tool response it receives becomes part of the conversation history and **stays there**.

Imagine a `research-lead` skill that, per prospect, scrapes a profile (~5k tokens of JSON), researches the
company (~3k tokens), scores the opportunity, drafts a message, and writes a row to a sheet. One lead: ~10k
tokens, context barely warm. But lead 1's scrape does not disappear when the skill moves to lead 2 — it just
sits there:

| | Lead 1 | Lead 25 | Lead 50 |
| :-- | :-- | :-- | :-- |
| Cumulative context | ~10k (warm) | ~250k (slower) | ~500k (compaction mid-batch) |

When the window fills, **auto-compaction** fires and summarises older turns. For a single Q&A that is fine. For
a **batch mid-execution** it is a silent quality killer: details get smoothed, later items get worse analysis
than earlier ones. "50 high-quality results" becomes "the first 25 are good; the rest are noisier."

The uncomfortable truth: it is not the length of your `SKILL.md` that costs you — it is what the skill
**invokes**. Every tool call, MCP response, and external fetch accumulates.

---

## Chapter 2 — Layer 1: Fork (`context: fork`)

A frontmatter field that tells Claude Code to run the skill in an **isolated subagent** instead of inline.

**What happens:**
1. Claude Code snapshots your conversation.
2. Hands it to a subagent in a fresh, private context window.
3. The subagent runs the skill start to finish.
4. **Only the final return value** comes back to your main conversation.

Every tool call, intermediate reasoning step, and file read the subagent did stays inside the fork. The analogy
is a subcontractor: you say "write me a report," they make their calls and read their documents in their own
office, and you get the report — not their call transcripts. MCP tools are still callable inside the fork; only
their **responses** stay inside it.

**Solves:** cross-run accumulation (lead 1 no longer pollutes lead 2).
**Does NOT solve:** within-run accumulation — see Layer 2.

### In this repo

The whole `developer` pipeline is built from forked executors: `coder`, `runner`, `task-reviewer`,
`decomposer`, `improver`, `committer`, `adr-recorder`, `plan-reviewer`. `github` adds `cli-executor` and
`commit`. The point of each is exactly Layer 1: run a noisy job (build output, a full diff, a git operation) in
a fork and return one condensed verdict so the orchestrator's context never sees the raw output.

### Nested forks

If a forked orchestrator invokes a sub-skill that *also* has `context: fork`, the inner fork does fire (older
builds silently ignored it; that is fixed). So per-stage isolation is real — an orchestrator can fork, and each
of its sub-skills can fork too.

### Don't fork if…

- **Reference / doctrine skill.** No task to run; a fork expects a task. (This very skill is reference-only and
  is not forked.)
- **The skill needs user input mid-run.** `AskUserQuestion` does not work inside a fork.
- **The output belongs in your main chat.** If you want to keep reasoning with Claude about the output, the
  fork throws it away.
- **A scheduled skill with nothing to do.** Early-bail first, fork second.

### Which model runs in the fork?

Architecturally you choose between "inherit the session model" (right default for reasoning- or voice-heavy
work) and "a downgraded read-only profile" (cheaper/faster, fine for read-only exploration, wrong for nuanced
work). To force a specific model regardless of session, pin `model:` — in this repo use the short form
(`opus` / `sonnet` / `haiku`). For the exact field names and how the identity/model fields resolve, consult
`authoring-reference` — do not infer field validity from this file.

---

## Chapter 3 — Layer 2: File-based handoff

A convention where a multi-stage skill writes intermediate state to files between stages instead of carrying it
through the conversation. **Each file is a compression checkpoint.**

A raw 5k-token scrape gets distilled by the stage that produced it into a small file:

```json
{
  "slug": "jane-doe",
  "headline": "VP of Operations at Acme Corp",
  "company": "Acme Corp",
  "tenure_months": 14,
  "top_signal": "Posted about scaling the CS team (2026-04-10)"
}
```

~150 tokens. The ~4,800 tokens downstream stages do not need got thrown away.

### Folder convention (this repo uses `.temp/`, not `.tmp/`)

Per the project rule, all run-scoped temp state goes under `.temp/` in grouped subdirectories. Namespace by a
unique slug so parallel runs do not overwrite each other:

```
.temp/research-lead/<lead-slug>/
├── profile.json     ~150 tokens   # who this person is
├── company.md       ~400 tokens   # who their company is
├── signals.json     ~100 tokens   # what's happening
├── score.json        ~50 tokens   # is this worth pursuing
└── message.md       ~700 tokens   # what to say
```

The `developer` pipeline is the in-repo instance of this: the orchestrator hands tasks to executors through
files under `.superdev/.workflows/<slug>/tasks/` and a `Report path:`, never by pasting raw output between agents.

### Why files matter *more* with nested forks

Tempting thought: "if each sub-skill forks and tool responses discard at the fork boundary, why bother with
files — can't the sub-skill just return its output string?" Because without files the **orchestrator** becomes
the bloat channel:

| Without files | With files |
| :-- | :-- |
| Sub-skill 1 returns 5k of data | Sub-skill 1 writes `profile.json`, returns "scrape complete" |
| That 5k lands in the orchestrator's chat | Orchestrator's chat: ~20 tokens of confirmation |
| Orchestrator passes it to sub-skill 2 as an argument | Sub-skill 2 reads `profile.json` directly (via `!command`) |
| 5k now lives in two places | Orchestrator never held the raw data |
| × 4 sub-skills → orchestrator holds everything | After 4 sub-skills: ~80 tokens of confirmations |

**Fork saves the sub-skill. Files save the orchestrator.** You benefit *more* from files when sub-skills are
also forked, not less.

### Gotchas

- **Don't dump everything.** The point is distillation. A 4,000-token `profile.json` defeats the purpose.
- **Namespace by slug** so parallel runs don't collide.
- **Don't store long-term data in the skill directory.** Files under `.claude/skills/<name>/` may be wiped on
  upgrade. Use `.temp/` for run-scoped state; for durable plugin data use `${CLAUDE_PLUGIN_DATA}`.
- **Clean up.** Add a sweep that deletes slug directories older than N days.

---

## Chapter 4 — Layer 3: `!command` preloading

Inside a skill's markdown body, a shell command wrapped in a backticked `!`-expression runs **before** Claude
reads the skill. The output replaces the expression; Claude only ever sees the result. (Per the docs: "This is
preprocessing, not something Claude executes.")

**The problem it solves:** normally, to use a file a skill burns a turn — Claude says "I'll read signals.json,"
issues a `Read`, receives the contents, reasons about them, *then* does the work. Two turns of plumbing per
file; across a 4-stage pipeline reading 2-3 files each, that is 8-12 wasted turns per item.

**The fix** — bake the data in at parse time so Claude's first sentence already has it:

```markdown
## Context

Profile headline:
!`jq -r .headline .temp/research-lead/$ARGUMENTS/profile.json`

Top 3 signals:
!`jq '.signals | sort_by(-.score) | .[:3]' .temp/research-lead/$ARGUMENTS/signals.json`

Company angle:
!`cat .temp/research-lead/$ARGUMENTS/company.md`

## Task
Write the message using the context above.
```

**The real superpower — pre-filtering.** Because `!command` runs real shell, you can filter/sort/slice before
Claude sees anything. A `signals.json` with 20 signals (~800 tokens) becomes the top 3 (~150 tokens) via `jq`
on your machine. That is where `!command` goes from "nice optimisation" to transformative: zero plumbing tokens
**and** less data in the prompt to begin with.

The chef analogy: without `!command`, the chef walks to the fridge for each ingredient mid-cook. With it, a prep
cook has chopped everything onto the counter before the chef arrives. Chef = Claude; prep cook = the shell.

### In this repo

`committer` preloads `git status` and the staged diff; `runner` preloads the build/test command output. By the
time those forked skills read their own body, the data they reason over is already inline.

### Gotchas

- **Output still costs tokens.** You save the plumbing round-trip, not the data. `cat`-ing 500 tokens still puts
  500 tokens in the prompt — filter first.
- **Missing file = silent empty output.** A failed `cat` substitutes an empty string. Guard with
  `|| echo "fallback"`.
- **Side effects run automatically on skill load.** Never put a mutating command in a `!`-block.
- **`$ARGUMENTS` safety.** Never splice `$ARGUMENTS` into a quoted string — a literal `"`, `` ` ``, or `(` in the
  args breaks the shell and the injection comes back empty. Capture via a quoted here-doc and parse with bash
  builtins (not `awk`, which is broken in the `!` exec shell on Windows). `$ARGUMENTS` *does* substitute inside a
  `context: fork` skill, including a fork invoked programmatically via the `Skill` tool. Full detail:
  `authoring-reference` → "Writing robust `!` blocks".
- **Can be disabled by policy** (`disableSkillShellExecution: true`) — don't make a skill *depend* on `!`-blocks
  for correctness if it must survive that setting.

---

## Chapter 5 — Skill vs Agent vs Model

Three distinct concepts that compose; confusing them leads to bad design.

| | What it is | Where it lives | Says |
| :-- | :-- | :-- | :-- |
| 🧩 **Skill** | A task recipe — *what to do* | `<name>/SKILL.md` (+ supporting files) | "given this input, do these steps, produce this output" |
| 🎭 **Agent** | An identity — *who is doing it* | `agents/<name>.md` (system prompt, tool allowlist, model, behaviour) | "you are this kind of assistant, you behave this way" |
| 🧠 **Model** | The brain — the actual LLM | `model:` field, agent config, or session inheritance | — |

**The decision rule:** a task with a specific output → **Skill**. A behaviour reused across tasks → **Agent**.

**When to promote to a custom agent:** 3+ skills would copy the same system prompt; you want a tool allowlist
enforced at the identity level; you want to pin a model for a whole class of work. For a *single* skill, keep
the behaviour inline in `references/` — a custom agent for one skill is over-engineering. Start with skills;
agents come later.

**This repo's stance matches that.** The marketplace plugins ship skills, not custom agents — behaviour that is
specific to one skill stays in that skill. Reach for a project subagent (`.claude/agents/<name>.md`) only when a
behaviour is genuinely shared across three or more skills.

> Caveat on fields: the *architecture* (a skill, running under some identity, on some model) is what you decide
> here. The exact frontmatter that expresses it — and which of `agent:` / `model:` is valid on a `SKILL.md` vs a
> subagent definition — is owned by `authoring-reference`. Decide the shape here; confirm the fields there.

---

## The stack, in one line

**Single task?** Fork alone is usually enough. **Chain of stages?** Fork + files + `!command`. **Needs user
input mid-run, or output belongs in the main chat?** Don't fork. **Three or more skills share behaviour?**
Extract a custom agent. Miss any one layer in a chain and you are back to prose bloat.
