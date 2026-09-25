# T3 coder notes

- The comment file is written with `Write` under the `Edit(./.temp/viber/prototype/**)` pre-approval (a file-write call matches `Edit` rules only), same as intent; no `Write` entry added to `allowed-tools`, per DoD.1.
- Decision: "ready" while the mockup still holds three variants asks which one to keep and runs the narrow round first, so the conclusions always carry a chosen variant.
- Decision: the attach request and mockup path follow only a successful post (exit 0); the comment template itself carries no local path (it may be public).
- Lint WARNs judged: "no when-to-use cue" is expected for a `disable-model-invocation: true` command (triage shares it); "italics" is the `**` glob inside `Edit(...)`, a false positive.
- Step numbering: comment is step 7, intent hand-off step 8; T4 greps `Prototype:` in this file (lines in step 6 and step 8).
