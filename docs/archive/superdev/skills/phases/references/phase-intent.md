# Phase intent file - content rules

Loaded by the `phases` skill only after the reviewer returns `VERDICT: PASS` - right before the `Write` of the phase intent files. Not needed while proposing, discussing or reviewing the split.

## Where it goes
- One file per phase, at `<phases file dir>/<that phase's Dir: value>/intent.md` - the `Dir:` value joined to the phases file's OWN directory, e.g. `docs/.workflows/<run>/phases/01-<slug>/intent.md`.
- The `Write` call itself creates the directory - never `mkdir`.

## Content rules
- Each file is a complete intent in the intent template's structure, written in the master intent's language. A phase's later run reads only its own file, never the master intent - so nothing this phase needs may be left implicit in it.
- `# Intent: <phase title>` - the title copied verbatim from that phase's own `### <NN>. <title>` heading in the phases file - and `Date:` from the skill's `## Run`.
- `## Request` - the phase's goal, written in the master's framing, as the ask for this phase alone.
- `## Decisions` - the master's decision blocks named in that phase's `Covers:` line, copied VERBATIM, keeping their master numbers (so `#5` stays `### 5.`). Copy no other decision.
- `## Constraints` - the master constraints that apply to this phase, plus one bullet `` `<phase title>` (phase <NN>) of <repo-relative phases file path> ``, plus one bullet per earlier phase it depends on, naming it the same way and its `Delivers:` as already in place.
- `## Out of scope` - the other phases' goals, as non-goals of this phase (they are built in their own runs), plus the master's own out-of-scope entries.
- `## ADR` - phase `01` only: the master's `## ADR` section copied verbatim when the master has one. Every other phase intent has NO `## ADR` section, whatever its `Covers:` names.
- `## History` - the master's, verbatim.
- Use repo-relative paths when referencing files, never absolute paths.
