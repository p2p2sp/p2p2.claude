---
name: design-system-creator
description: Designs a NEW framework-agnostic design system from the user's intent and optional inspiration materials — inspiration, never replication.
allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Bash(cp:*), Skill, Agent
user-invocable: true
disable-model-invocation: true

---

# Design System Creator — creative head

Turn a user's intent — a product, an audience, a mood, optional inspiration images — into a framework-agnostic
design system: DTCG tokens, a DESIGN.md document, pure-CSS tokens, specs, and an HTML documentation site. You
are the CREATIVE HEAD: you interview the user, dispatch the holistic `design-director` agent for the visual
direction, gate on the user's approval of it, then hand the approved direction to the shared
`design-system-generator` tail for artifact production. You never write tokens/specs/sheets yourself — neither
directly nor by owning those steps; the mechanical generation pipeline is the generator's job.

Input contract: none required upfront — the interview (step 2) resolves product, audience, mood, and
inspiration from the conversation.

## Ground rules

- This skill is the ONE place in this pipeline that talks to the user — the interview and the direction gate.
  Every worker (`design-director`, the generator, and everything the generator fans out to) never talks to the
  user; their `> NEEDS INPUT` markers are what you collect and carry back.
- The interview is plain conversational prose, one question per turn — never a forms/multi-select tool, never
  several questions bundled into one turn.
- Hard collision gate (step 1): an existing `.superui/design-system/DESIGN.md` means full redesign (explicit
  overwrite) or abort — NEVER merge. Gaps in an existing system belong to `design-system-completer`; new source
  screenshots belong to `design-system-extractor`.
- Sole write exception: copying the approved inventory proposal into `<out>/inventory.md` (step 6), mirroring
  the extractor's `component-scout` ownership. Every other artifact write flows through the generator's
  single-writer pipeline — this skill never touches `dtcg.yml`, `DESIGN.md`, `tokens.css`, specs, or sheets
  directly.
- Inspiration values are hints, never canon — adopting one verbatim is `design-director`'s explicit
  `hint-adopted` call, never something decided here.
- RE-DISPATCH CONVENTION (direction gate, contrast QA): spawn a fresh `design-director` with its normal inputs
  plus the previous output and the user's corrections (or the failing pairs) as additional constraints; it
  regenerates in full honoring them. `design-director` is spawned one at a time — never in parallel with itself.
- Trust the generator: it verifies its own result — relay its return verbatim rather than re-verifying it.
- Paths: `<run>` = `.temp/design-system-creator/<run-slug>/` (run state: brief, inspiration hints, direction
  notes; `<run-slug>` — any short kebab-case identifier for this run, fixed for its whole duration). `<out>` =
  `.superui/design-system/` (final artifacts; the user may override).

## Checklist — execute in order, never skip a step or a gate

### 1 — Env-check + collision gate [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`. `PYTHON_MISSING` -> tell the user the pipeline's
`*.py` steps need Python 3 and point them at `/superui:setup`; stop before any `python ...` step. `PYTHON_OK
<cmd>` -> use `<cmd>` in place of `python` everywhere below, and state it as the interpreter command when
spawning `design-director` (Bash-bearing).

Glob `.superui/design-system/DESIGN.md`.
- PRESENT -> hard stop. Tell the user plainly: this skill can either do a FULL redesign (this run OVERWRITES
  the whole existing system wholesale) or abort. If the real need is gaps in the existing system, point at
  `design-system-completer`; if it's new source screenshots, point at `design-system-extractor`. If the user
  insists on merging the new direction into the existing system, refuse — explain that gap-filling is
  `design-system-completer`'s job — and offer only redesign or abort. Proceed past this gate only on an
  explicit "redesign" choice.
- ABSENT -> `mkdir` `<run>` and the `<out>` skeleton.

### 2 — Interview [you + user]
Prose, one question per turn, no forms: the product and its audience; mood in 3-5 adjectives; whether the system
needs dark mode; whether they have inspiration images (a directory path) and, if so, what to take from them
(palette, type, density, mood) and what to avoid. Write the answers to `<run>/brief.md`, including the dark-mode
answer — undecided is recorded as "no dark", never fabricated. No inspiration materials -> skip step 3; a
brief-only design is first-class.

### 3 — Inspiration hints [optional, script]
For each image in the inspiration dir:
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py" <image> --k 6
```
Append each result to `<run>/inspiration-hints.md`, every palette labeled `hint — mood direction, not canon`.
An unreadable or non-image file makes the sampler exit 1 — skip that file with a one-line note in
`inspiration-hints.md` and continue; never abort the run over one bad file.

### 4 — Design the direction [design-director, x1]
Spawn `superui:design-director` (Agent tool, `subagent_type: superui:design-director`) with: the brief path,
the inspiration-hints path (when step 3 produced one), the naming-vocabulary template
`${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`, the contrast script
`${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py`, and the output run-dir `<run>`. GATE: the four
`notes-<foundation>.md` files, `inventory.md`, and `direction-rationale.md` all exist in `<run>`. Additionally,
mechanical dark condition: the brief asked for dark -> `<run>/notes-colors.md`'s `CONTRAST-PAIRS` section
contains at least one `dark ·` entry; missing -> re-dispatch `design-director` per the RE-DISPATCH CONVENTION,
capped at two rounds — after that, carry the residue to step 8 as `> NEEDS INPUT` rather than looping forever
(this skill has no global remediation cap, so this gate states its own).

### 5 — Direction GATE [you + user]
Present the direction to the user: the palette (token names + prose, not raw values), the type ramp, the mood
rationale (from `direction-rationale.md`), and the inventory list (from `<run>/inventory.md`).
- Adjust -> re-dispatch `design-director` per the RE-DISPATCH CONVENTION with the user's corrections. Loop.
- Two rejections in a row -> instead of a third blind re-design, offer to restate the brief (loop to step 2).
- Approve -> continue.

### 6 — Generate artifacts [design-system-generator, x1]
Copy the approved `<run>/inventory.md` to `<out>/inventory.md` (the sole write exception above). Then invoke
`design-system-generator` via the Skill tool with the labeled block:
```
run: <run>
out: <out>
spec-producer: superui:spec-designer
provenance: designed
context: <run>/brief.md
```
The generator composes `dtcg.yml` (with the root `designed` provenance marker), renders
`tokens.css`/`DESIGN.md`/specs/sheets/`index.html`, and returns a single message with artifact paths, counts,
and every carried `> NEEDS INPUT` item. GATE: the generator reports success (all its internal gates green). A
failure line (env or gate) -> surface it to the user verbatim and stop.

### 7 — Contrast QA [you + design-director + token-composer, as needed]
Resolve any composer renames from the generator's step-6 merge report first. Split the `CONTRAST-PAIRS`
entries from `<run>/notes-colors.md` by their leading theme column and verify each theme as its OWN run
against the FINAL `<out>/dtcg.yml` token values:
- a `light` entry resolves each token to its `$value`.
- a `dark` entry resolves each token to `$extensions.org.superui.dark`, falling back to `$value` when the
  token carries no dark override.
Dereference alias chains to a literal before writing a pair; a value that resolves to none (e.g.
alpha-bearing) is skipped, never handed to `check_contrast.py` — same rule as the auditor's contrast
pre-pass. Build `<run>/contrast-pairs-light.json` and, only when dark entries
exist, `<run>/contrast-pairs-dark.json`; run `check_contrast.py --json` once per file that exists. No dark
entries -> only the light run happens; the absence is not a failure.

Every pair in a run still passes -> that theme is done. A run's failure:
1. Re-dispatch `design-director` (RE-DISPATCH CONVENTION) scoped to only THAT theme's failing pairs —
   brief, current `dtcg.yml`, and the failing pairs as the constraint — to produce corrected values.
2. Spawn `superui:token-composer` (merge job) with the corrected values against `<out>/dtcg.yml`, then re-run
   `tokens_to_css.py`.
3. Re-run `check_contrast.py` on that theme's previously-failing pairs.
Both themes' remediation runs SEQUENTIALLY — never two `design-director` instances at once, per its "spawn
exactly one" rule and the RE-DISPATCH CONVENTION's "one at a time — never in parallel with itself" ground rule.
Cap remediation at two rounds total (a round may carry one re-dispatch per failing theme, run one after the
other — the cap never becomes four rounds); after that, carry the remaining failures into step 8 as
`> NEEDS INPUT`.

### 8 — Present results [you]
Give the user: the artifact paths (`dtcg.yml` first, then `DESIGN.md`, `tokens.css`, `inventory.md`,
`index.html`), component/pattern counts, every collected `NEEDS INPUT` item (yours plus the generator's relayed
ones), and one closing line: "system provenance: designed — design-system-guardian now enforces it on every UI
task."
