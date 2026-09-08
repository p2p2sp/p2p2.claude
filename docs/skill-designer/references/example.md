# Example

Read before writing a skill body from scratch. Same task, two skills.

BAD
```
# CSV to JSON Conversion Skill

This skill helps you convert CSV files into JSON format. CSV is a common
format for tabular data, while JSON is widely used in web apps and APIs.

When a user uploads a CSV, read the file carefully to understand its
structure. Look at the header row to determine the column names, then map
every value to its column, building a JSON object per row. You can use `jq`
to format the output. Edge cases should be handled appropriately.
```

Why bad: explains what the model already knows, hand-parses instead of scripting, no trigger in frontmatter, hedged edge cases, `jq`.

GOOD
```
---
name: csv-to-json
description: Convert .csv files to .json. Use whenever the user has tabular data in CSV and wants JSON, even if they only say "turn this into something my API can read".
---

# csv-to-json

## Run
- `python scripts/csv2json.py <input.csv> <output.json>`
- Return the output path. Do not parse rows yourself.

## Rules (deltas only)
- Empty cell -> null, not "".
- Numeric-looking values stay strings unless the user asks to coerce.
- Duplicate header names -> suffix _2, _3.

## On failure
- Print stderr verbatim. Do not fall back to hand-parsing.
```

Why good: trigger lives in `description:`, work is a script, body holds only the deltas and the failure rule.
