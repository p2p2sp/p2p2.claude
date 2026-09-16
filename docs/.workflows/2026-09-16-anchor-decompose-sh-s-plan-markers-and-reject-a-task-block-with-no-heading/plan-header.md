Title: "Anchor decompose.sh's plan markers and reject a task block with no heading"


## Goal
`decompose.sh` splits a plan into task files only on real block markers, and refuses to build a
working directory out of a task block that carries no task heading: a plan whose prose quotes a
block marker decomposes into exactly its real block count, and a block without a
`## Task <N> - <title>` heading stops the decomposition with a named error and a non-zero exit
instead of a phantom task file with an empty title column.

> Naming note for the implementor: this plan never writes the four HTML-comment block markers
> literally, because the very bug it fixes would make a literal mention open a spurious block during
> its own decomposition. They are named here as **the TASK open marker**, **the TASK close marker**,
> **the HEADER open marker** and **the HEADER close marker** - the four markers already present in
> `superdev/scripts/decompose.sh`'s awk splitter and in both plan templates.

## Context
The awk splitter in `superdev/scripts/decompose.sh` matches its four block markers unanchored, so
any line that merely *contains* the TASK open marker - a plan task about the markers themselves,
even inside backticks - opens a new block. The observed symptom was a phantom `task-09.md` with an
empty title in the stdout index, reported only as a `warning: ... has no 'Covers:' criteria` on
stderr while the script exited 0 and the build proceeded on garbage. Two defects stack here: the
loose match, and the absence of any check that a produced task file actually looks like a task. The
fix anchors the markers to whole lines and makes a heading-less block a hard error with its own exit
code.

## Out of scope
- Requiring the heading's `<N>` to equal the task file's index number.
- Any change to the `Covers:` parsing, the criteria append, or the decomposition commit.
- Rewriting existing plans under `docs/.workflows/` or `.temp/`.

## Acceptance criteria
1. Whole-line markers - each of the four block markers opens or closes a block only when it is the
   entire line, trailing whitespace allowed; a marker quoted inside a longer line is ordinary content.
2. Task count intact - a plan whose task body quotes the TASK open and close markers in prose
   decomposes into exactly as many `tasks/task-NN.md` files and index rows as it has real task
   blocks, with the quoted line preserved verbatim inside the task file.
3. Heading required - every `tasks/task-NN.md` opens, on its first non-empty line, with a heading of
   the shape `## Task <N> - <title>` and a non-empty title; the number need not equal the file index.
4. Hard error on a missing heading - a task block without that heading aborts the run with
   `error: task-NN.md has no task heading` on stderr and exit 6, prints no task index rows, and
   leaves no working directory this run created.
5. Documented contract - `decompose.sh`'s header comment states the whole-line marker rule, the
   heading requirement and exit 6, beside its existing exit-4 and exit-5 bullets, and
   `tests/superdev/decompose.test.ts`'s own file header names exit 6 among the script's documented
   error paths.
6. Suite green - `node --test "tests/**/*.test.ts"` passes, the existing tab-in-title edge case
   still documented by a heading that satisfies the new shape.

