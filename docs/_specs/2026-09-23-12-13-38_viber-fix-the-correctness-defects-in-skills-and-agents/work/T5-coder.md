# T5 - coder notes

- Replaced the session-token example with the required "does the export include archived
  records?" question, keeping `[Recommended]:` and three concrete options, recommended first.
- Unified the label: the options rule used lowercase `"(recommended)"`, the example already used
  `[Recommended]:` - moved the rule to the example's spelling rather than the reverse, since the
  example's block-quote format is the one referenced verbatim by callers.
- The interview rule referenced "one call" even though the same rule opens with "Do not use
  `AskUserQuestion`" - reworded to "one message" so the tool-call reference is gone without
  changing the one-question-at-a-time constraint.
- Done condition now reads "Every unknown carries a named way to resolve it and no question to
  the user is left open", matching the existing "Unknowns... how it gets resolved" cover item
  instead of contradicting it.
