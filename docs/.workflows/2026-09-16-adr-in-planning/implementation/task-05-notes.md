# Task 5 notes

- Both orchestrators' `## Config` line does not just drop `adr` from the gated list: it adds a clause saying the `adr` line is printed but gates nothing here (it gates the `intent` skill) - Approach step 1 states that fact parenthetically, and without it a reader of the config output would hunt for a close-out use of a switch that has none.
- Both orchestrators' `## Step 5 - Done` summary list gained "plus the noted `git diff` failure when Step 4 hit one" on top of the Approach's "drop `ADR:` from the summary list" - the `git diff` failure mode logs to the Step 5 summary line, and nothing else left in Step 5 would have carried that note.
