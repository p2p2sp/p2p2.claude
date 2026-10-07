/*
 * build_report.test.ts - the file-writing half of superbiz's report builder
 * CLI: unparsable input and invalid data exit 1 and write nothing, valid data
 * exits 0 and writes the filled template with LF line endings. Integration
 * tier (each case builds a temp-dir fixture); it calls `main` in-process.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   CI=true node --test tests/superbiz/build_report.test.ts
 */

import { test } from "../harness/test.ts";
import { withTempDir } from "../harness/tmp.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { main } from "../../superbiz/skills/idea-validator/scripts/build_report.mjs";
import { capture, validReport } from "./fixture.ts";

test("unparsable input exits 1 with a 'Cannot parse' line and writes no report", async () => {
  await withTempDir("superbiz-", (dir) => {
    const src = path.join(dir, "report-data.json");
    const dest = path.join(dir, "report.html");
    fs.writeFileSync(src, "{not json", "utf-8");
    const out = capture();
    assert.equal(main([src, dest], out.log), 1);
    assert.match(out.lines[0], /^Cannot parse /);
    assert.ok(!fs.existsSync(dest));
  });
});

test("invalid data exits 1, prints the problem count and one line per problem, and writes no report (the skill fixes the JSON, never the HTML)", async () => {
  await withTempDir("superbiz-", (dir) => {
    const d = validReport();
    d.thresholds = {};
    const src = path.join(dir, "report-data.json");
    const dest = path.join(dir, "report.html");
    fs.writeFileSync(src, JSON.stringify(d), "utf-8");
    const out = capture();
    assert.equal(main([src, dest], out.log), 1);
    assert.match(out.lines[0], /^3 problem\(s\) in /);
    assert.equal(out.lines.length, 4);
    assert.ok(!fs.existsSync(dest));
  });
});

test("valid data exits 0 and writes the filled template with every placeholder replaced and LF line endings", async () => {
  await withTempDir("superbiz-", (dir) => {
    const src = path.join(dir, "report-data.json");
    const dest = path.join(dir, "report.html");
    fs.writeFileSync(src, JSON.stringify(validReport()), "utf-8");
    const out = capture();
    assert.equal(main([src, dest], out.log), 0);
    assert.match(out.lines[0], /^OK → .*report\.html \(\d+ KB\)$/);
    const html = fs.readFileSync(dest, "utf-8");
    assert.ok(html.includes('<html lang="pl">'));
    assert.ok(html.includes("<title>Idea</title>"));
    assert.ok(!/__REPORT_DATA__|__LANG__|__TITLE__/.test(html));
    assert.ok(!html.includes("\r\n"));
  });
});
