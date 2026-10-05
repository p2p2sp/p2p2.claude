# T3 coder notes

- `memory-writer` still reads the root and its sections, read only, to run the false-sentence and deleted-area checks that produce `SUGGEST:` lines; it writes nothing there.
- Dropped the "One root `CLAUDE.md`" clause from the node bullet: it contradicted the root being the user's.
- `SUGGEST:` paths stay off `FILES:`, so the commit never carries the root.
