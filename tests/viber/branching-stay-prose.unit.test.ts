/*
 * Root cause: the branching-handoff fragments of intent and fixer (`Branch: <the current: value>` bullet).
 * Actual: "stay" at the start step (do not move HEAD now) hands off `Branch: <current:>`, which the planner
 * records as the plan's `branch:`, so the build lands on the branch current while planning (another run's).
 * Expected: "stay" only keeps HEAD for the interview; `Branch:` comes only from an explicit build-on-current choice.
 * Fix direction: split "stay" from a separate "build on <current:>" option in branching-start and branching-handoff.
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SKILLS = path.resolve(import.meta.dirname, "../../viber/skills");

const HANDOFFS = [
  "intent/fragments/branching-handoff.allowed.md",
  "intent/fragments/branching-handoff.required.md",
  "fixer/fragments/branching-handoff.allowed.md",
  "fixer/fragments/branching-handoff.required.md",
];

function branchBullet(rel: string): string {
  const text = fs.readFileSync(path.join(SKILLS, rel), "utf8");
  return text.split(/\r?\n/).find((line) => line.startsWith("- `Branch:")) ?? "";
}

for (const rel of HANDOFFS) {
  test(`${rel}: "stay" does not pin the current branch as the run branch`, () => {
    const bullet = branchBullet(rel);
    assert.notEqual(bullet, "", "the fragment has no Branch: bullet");
    assert.ok(!bullet.includes('"stay"'), bullet);
  });
}
