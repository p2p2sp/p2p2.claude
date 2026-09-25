# T2 coder notes

- Fence rule chosen: a line whose left-trimmed text starts with ``` or ~~~ opens a fence; only a line that is nothing but a run of the SAME character (3+) closes it, so a ```lang line or the other fence character inside the block closes nothing. An unclosed fence keeps everything to end of file (CommonMark does the same).
- Order matters: the open-comment check runs before fence detection, so a fence line inside a multi-line guidance comment opens nothing and the comment still goes whole.
- Blank lines inside a fence are printed verbatim, never collapsed; the blank-run collapse applies outside fences only.
- Trap for fixtures: an HTML comment closes at the FIRST `-->`, so a nested `<!-- ... -->` inside a multi-line comment ends it early. That is correct behaviour, not a bug.
- Both awk programs sit inside single quotes: no apostrophe may appear in their comments.
- One run of the verification saw plan-path.test.ts fail at file level with no test result (transient, Windows); an immediate rerun was 145/145 green.
