
## Task 3 — feat(superui): add bundle meta, validator and zip packer
- Covers: criteria #1, #2, #4

### Dependencies
- Task 2 — blocks: Task 6

### Files
- add - `superui/scripts/build_meta.ts` (`main`, `scanBundle`, `emitYaml`)
- add - `superui/scripts/validate_bundle.ts` (`main`, `checkTokenRefs`, `checkScreenRefs`, `checkSections`, `checkForbidden`)
- add - `superui/scripts/pack_bundle.ts` (`main`, `zipDir`, `writeCentralDirectory`)

### Test Commands
*Build*
- `sh superui/scripts/check_node.sh`

*Tests*
- `$NODE superui/scripts/build_meta.ts .temp/design-extractor-fixtures/handoff acme-screens` — expect a summary naming screen, component and pattern counts, and `meta.yml` written inside the bundle
- `$NODE superui/scripts/validate_bundle.ts .temp/design-extractor-fixtures/handoff .temp/design-extractor-fixtures/registry.json; echo $?` — expect `0` and a `CLEAN` line
- `$NODE superui/scripts/validate_bundle.ts .temp/design-extractor-fixtures/handoff-broken .temp/design-extractor-fixtures/registry.json; echo $?` — expect `1` and exactly four finding lines, one `unknown-token`, one `missing-screen`, one `empty-section`, one `forbidden-artifact`
- `$NODE superui/scripts/pack_bundle.ts .temp/design-extractor-fixtures/handoff .temp/design-extractor-fixtures/handoff.zip` — expect a summary naming the file count and byte size
- `unzip -l .temp/design-extractor-fixtures/handoff.zip` — expect the same tree as the source dir (skip this assertion with a note if `unzip` is absent; `pack_bundle.ts` self-verifies its own central directory regardless)

### Approach
1. Hand-write a fixture bundle under `.temp/design-extractor-fixtures/handoff/` (design.md from Task 2, a small inventory.md whose component entry appears on three screens of which one is canonical, one component spec carrying backticked property names and a backticked screen filename alongside real token references, one pattern spec, two PNG screens copied from the Task 1 fixture) and a `handoff-broken/` variant carrying exactly four seeded defects: an unknown token reference, a missing canonical screen, an empty section, and a stray `tokens.json`.
2. Write `build_meta.ts`: scan the bundle dir, derive `version`, `source` (from the argument), `generatedAt` (ISO-8601), `darkMode` (true when `design.md` section 3.10 is not `none`), and the `screens`, `components`, `patterns` lists from the files actually present, reading each spec's canonical-screen line for `canonical:` and taking each component's `kind` from the SECOND `·`-separated field of its `inventory.md` entry line (index 1 when splitting on `·`), which is the unlabelled `atomic|composite` token — there is no `kind:` label in the inventory format, and the third field is `canonical:`. Emit `meta.yml` by direct string assembly — no YAML library, and none needed since nothing reads it back. Because `meta.yml` is derived from directory contents, meta-versus-contents consistency holds by construction and needs no validation pass.
3. Write `validate_bundle.ts` taking the bundle dir and `registry.json`. `checkTokenRefs` extracts every backticked string from `components/*.md` and `patterns/*.md`, keeps only those matching the dotted token form defined in the Contracts block, and resolves each against the registry's resolution namespace as Task 2 pins it — the keys of `tokens{}` plus every `textStyles[].name` — so backticked property names, part names and screen filenames never produce a finding, and a spec's dotted type-style reference in a `font` line resolves rather than dangling. `checkScreenRefs` collects CANONICAL screen references only — each spec's canonical-screen line and each `canonical:` field in `inventory.md` — deduplicates them by filename so one absent screen cited from both sources yields exactly one finding, and asserts each exists in `screens/`; the inventory's `appears:` field is source metadata describing where a block was seen, not a file reference, and is deliberately excluded, matching the bundle contract's "one PNG per canonical screen". `checkSections` asserts each `## 3.N` heading in `design.md` has non-whitespace body content. `checkForbidden` asserts the bundle holds no `*.css`, `*.js`, `*.html` and no `*.json` at all, anywhere under the bundle dir — blanket rejection, not a name heuristic, since the bundle contract lists no legitimate JSON member and `registry.json` is internal to `.temp/`. `meta.yml` is YAML and unaffected. Print one `FINDING: <category> <detail>` line per defect and a `CLEAN` line when none; exit 1 when any finding exists, 2 on bad arguments.
4. Write `pack_bundle.ts`: build a ZIP with `node:zlib.deflateRawSync` per entry, local file headers, a central directory and an end-of-central-directory record, CRC32 per entry. Self-verify by re-reading the written archive and confirming the central directory entry count and each stored CRC before printing its summary.
5. All three carry the `IN :` / `OUT:` / exit-code header contract.

### Edge cases
- A spec citing a screen with different case on a case-insensitive filesystem: compare exactly as written and report a finding, since the consumer's filesystem may be case-sensitive.
- An inventory entry whose `appears:` lists screens absent from `screens/`: not a finding by construction, since only canonical screens ship. Cover this with a fixture entry appearing on three screens of which one is canonical, and assert `CLEAN`.
- Bundle dir absent or empty: exit 1 naming the dir.
- A token reference inside a fenced code block in a spec: still resolved, since the bundle has no code samples and treating them uniformly avoids a parser exception.
- Zero components or zero patterns: valid, emit empty lists in `meta.yml` and do not fail.
- File names holding non-ASCII: store UTF-8 bytes and set the ZIP language-encoding flag bit 11.

### Contracts
`meta.yml` per the bundle contract: `version: 1`, `source`, `generatedAt`, `darkMode`, `screens: []`, `components: [{ slug, kind, canonical, spec }]`, `patterns: [{ slug, canonical, spec }]`. `validate_bundle.ts` finding categories: `unknown-token`, `missing-screen`, `empty-section`, `forbidden-artifact`. A backticked string in a spec counts as a token reference only when it matches the dotted form `<group>.<name>` with at least one dot and no whitespace or slash; bare backticked words (`bg`, `text`, `radius`, part names) and backticked filenames (`login.png`) are excluded by that rule, the latter by an explicit image-extension exemption. The spec-file surface both scripts parse — the literal `canonical: <filename>.png` line and the backticked dotted token form — is pinned in Task 4's Contracts block and must agree with it verbatim.

### DoD
All five test commands produce the stated output and exit codes; the clean fixture yields `CLEAN` despite carrying backticked non-token strings and an `appears:` list wider than `screens/`; the broken fixture yields exactly four findings, one per seeded defect and one per finding category.


### Covered criteria
1. Running the head skill on a screenshots directory produces `.temp/design-extractor/<run>/handoff/` with all required members present and a sibling `handoff.zip` that unpacks to the same tree.
2. The bundle contains no `*.json` token file, no `*.css`, no `*.js` and no `*.html` — verified by listing the bundle.
4. `validate_bundle.ts` exits 1 with a named finding when a spec cites a token absent from the registry, when a spec or inventory entry cites a CANONICAL screen absent from `screens/`, or when a required section of `design.md` is empty; it exits 0 on a clean bundle, including one whose inventory `appears:` lists screens that do not ship.
