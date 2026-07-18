/* Generate the DESIGN.md skeleton from a validated dtcg.yml.

IN : argv[1] — path to dtcg.yml (read as UTF-8; run validate_tokens.ts first).
     argv[2] — output path for DESIGN.md (written as UTF-8; parent must exist).
OUT: writes argv[2] — a skeleton whose HEADINGS ARE A CONTRACT (the doc writer
     fills placeholders but never renames/renumbers/removes headings):
       # Design System
       ## How it's organized      (fixed three-layer text)
       ## Principles              (FILL)
       ## Token naming            (auto: tiers + per-group counts and samples)
       ## Foundations             (auto: per-group token listing + FILL)
       ## Theming                 (auto: dark-carrying token list + FILL)
       ## Consistency rules       (FILL)
       ## Accessibility           (FILL)
       ## Using this design system (for agents)   (prefilled rules + FILL)
       ## Status                  (FILL)
     Placeholders are HTML comments: <!-- FILL: ... -->.
     stdout — one summary line: "<n> tokens, <g> groups, <d> dark ->" + path.
     Self-verifies: re-reads the output and asserts every contract heading is
     present; a failed assertion exits 1 with a message on stderr.
Exit codes: 0 = written and verified; 1 = bad args, unreadable
     input, or self-verification failure.
Flags: none.

Regenerated wholesale — never hand-edit the generated file's auto sections;
re-run this script after dtcg.yml changes and let the doc writer re-fill.

Ported from design_md_skeleton.py; runs under plain Node (native type
stripping), no third-party dependencies — the YAML subset parser is bundled
in lib/yaml.ts.
Usage: node design_md_skeleton.ts TOKENS.yaml OUTPUT.md
*/
import { readFileSync, writeFileSync } from "node:fs";
import { safeLoad } from "./lib/yaml.ts";
import type { YamlValue, YamlMap } from "./lib/yaml.ts";

const MISSING: unique symbol = Symbol("missing");

const HEADINGS = [
  "# Design System",
  "## How it's organized",
  "## Principles",
  "## Token naming",
  "## Foundations",
  "## Theming",
  "## Consistency rules",
  "## Accessibility",
  "## Using this design system (for agents)",
  "## Status",
];

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function pyReprStr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    if (ch === "\\" || ch === q) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out + q;
}

/** Map a Node fs error to Python's OSError message format. */
function osErrorMsg(e: NodeJS.ErrnoException, path: string): string {
  const table: Record<string, [number, string]> = {
    ENOENT: [2, "No such file or directory"],
    EACCES: [13, "Permission denied"],
    ENOTDIR: [20, "Not a directory"],
    EISDIR: [21, "Is a directory"],
  };
  const hit = e.code !== undefined ? table[e.code] : undefined;
  if (hit) return `[Errno ${hit[0]}] ${hit[1]}: ${pyReprStr(path)}`;
  return e.message;
}

/** Python sorted() — compare strings by code point. */
function pyCmp(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const ca = A[i].codePointAt(0) as number;
    const cb = B[i].codePointAt(0) as number;
    if (ca !== cb) return ca - cb;
  }
  return A.length - B.length;
}

function darkOf(node: YamlMap): YamlValue | typeof MISSING {
  const ext = node.get("$extensions");
  if (ext instanceof Map) {
    const org = ext.get("org.superui");
    if (org instanceof Map && org.has("dark")) {
      return org.get("dark") as YamlValue;
    }
  }
  return MISSING;
}

function walk(node: YamlValue, path: string[], tokens: Map<string, boolean>): void {
  if (!(node instanceof Map)) return;
  if (node.has("$value")) {
    tokens.set(path.join("."), darkOf(node) !== MISSING);
    return;
  }
  for (const [key, child] of node) {
    // faithful to the Python original: a non-string key crashes here
    if ((key as string).startsWith("$")) continue;
    walk(child, [...path, key as string], tokens);
  }
}

function main(): void {
  if (process.argv.length !== 4) {
    die("usage: design_md_skeleton.ts TOKENS.yaml OUTPUT.md");
  }
  let text: string;
  try {
    text = readFileSync(process.argv[2], "utf-8");
  } catch (e) {
    die(
      `error: cannot read ${process.argv[2]}: ${osErrorMsg(e as NodeJS.ErrnoException, process.argv[2])}`,
    );
  }
  const data = safeLoad(text, process.argv[2]);
  if (!(data instanceof Map)) {
    die("error: top level must be a mapping");
  }

  const tokens: Map<string, boolean> = new Map(); // dotted path -> has_dark
  walk(data, [], tokens);

  const groups: Map<string, string[]> = new Map(); // top-level group -> [paths]
  for (const path of tokens.keys()) {
    const g = path.split(".")[0];
    if (!groups.has(g)) groups.set(g, []);
    (groups.get(g) as string[]).push(path);
  }
  const dark = [...tokens.entries()]
    .filter(([, has]) => has)
    .map(([p]) => p)
    .sort(pyCmp);

  const L: string[] = [];
  L.push("# Design System");
  L.push("");
  L.push("<!-- FILL: one-paragraph intro — what this system is, extracted from");
  L.push("which source, and that every value below is a real measured token. -->");
  L.push("");
  L.push("## How it's organized");
  L.push("");
  L.push("Three layers, from raw material to finished screens:");
  L.push("");
  L.push("- **Foundations** — color, type, spacing & radius, effects. The raw");
  L.push("  material — all bound to tokens (`dtcg.yml`).");
  L.push("- **Components** — reusable building blocks assembled only from");
  L.push("  foundation tokens. Specs in `components/`.");
  L.push("- **Patterns** — how components come together into real screens.");
  L.push("  Specs in `patterns/`.");
  L.push("");
  L.push("## Principles");
  L.push("");
  L.push("<!-- FILL: the OBSERVED principles this source demonstrates, as short");
  L.push("bullets. Evidence-backed only; no aspirational principles. -->");
  L.push("");
  L.push("## Token naming");
  L.push("");
  L.push("Two tiers, named so they're predictable to read and to query:");
  L.push("");
  L.push("- **Primitives** — raw values, named by family + step; never consumed");
  L.push("  directly by UI.");
  L.push("- **Semantic** — roles that point at a primitive, named by use; build");
  L.push("  with these. (Component-scoped tokens exist only where a value must");
  L.push("  not leak globally.)");
  L.push("");
  L.push("Groups in `dtcg.yml`:");
  L.push("");
  for (const g of [...groups.keys()].sort(pyCmp)) {
    const paths = [...(groups.get(g) as string[])].sort(pyCmp);
    const sample = paths
      .slice(0, 3)
      .map((p) => `\`${p}\``)
      .join(", ");
    const unit = paths.length === 1 ? "token" : "tokens";
    L.push(`- \`${g}\` — ${paths.length} ${unit} (e.g. ${sample})`);
  }
  L.push("");
  L.push("<!-- FILL: any naming conventions specific to this system. -->");
  L.push("");
  L.push("## Foundations");
  L.push("");
  L.push("<!-- FILL: per foundation (color, typography, spacing & radius,");
  L.push("effects/motion), a short narrative of what was measured: scales,");
  L.push("ramps, the measured surface/elevation order. Token NAMES only. -->");
  L.push("");
  L.push("## Theming");
  L.push("");
  if (dark.length > 0) {
    L.push(`${dark.length} tokens carry a dark value in`);
    L.push("`$extensions.org.superui.dark` (the only dark source; `tokens.css`");
    L.push("derives its `.dark` block from it):");
    L.push("");
    for (const p of dark) {
      L.push(`- \`${p}\``);
    }
  } else {
    L.push("No token carries `$extensions.org.superui.dark` — the source showed");
    L.push("no dark screens, so dark mode is unpopulated (never fabricated).");
  }
  L.push("");
  L.push("<!-- FILL: how theming works here; which surfaces flip; anything the");
  L.push("dark screens did or did not show. -->");
  L.push("");
  L.push("## Consistency rules");
  L.push("");
  L.push("<!-- FILL: the measured surface/elevation order; the radius role set;");
  L.push("the ACCENT DISCIPLINE list (every allowed accent location, from the");
  L.push("accent-usage inventory); state treatments as form + measured color. -->");
  L.push("");
  L.push("## Accessibility");
  L.push("");
  L.push("<!-- FILL: measured contrast findings (report failures as observations),");
  L.push("focus treatment, target sizes, color-alone risks. -->");
  L.push("");
  L.push("## Using this design system (for agents)");
  L.push("");
  L.push("Rules for ANY agent or developer building UI in this project:");
  L.push("");
  L.push("- Tokens are the source of truth: reference `tokens.css` custom");
  L.push("  properties (`var(--...)`) or `dtcg.yml` names — NEVER hardcode a hex");
  L.push("  or a pixel value that exists as a token.");
  L.push("- Semantic over primitive: reach for role tokens first; primitives");
  L.push("  exist so the semantics have something to point to.");
  L.push("- Before building any UI: read this file, then the relevant spec in");
  L.push("  `components/` / `patterns/`; follow its states, anatomy, and Do's &");
  L.push("  Don'ts.");
  L.push("- Respect the consistency rules above — especially accent discipline");
  L.push("  and the surface/elevation order.");
  L.push("- A value you need that has no token is a gap: add the token first");
  L.push("  (validate with the extraction tooling), never inline the raw value.");
  L.push("");
  L.push("<!-- FILL: system-specific rules for agents (e.g. the one-line accent");
  L.push("rule, the spacing rhythm rule). Keep the bullets above intact. -->");
  L.push("");
  L.push("## Status");
  L.push("");
  L.push("<!-- FILL: what has been extracted (foundations, component/pattern");
  L.push("counts), open NEEDS INPUT items, and suggested next steps. -->");
  L.push("");

  const out = L.join("\n");
  try {
    writeFileSync(process.argv[3], out, "utf-8");
  } catch (e) {
    die(
      `error: cannot write ${process.argv[3]}: ${osErrorMsg(e as NodeJS.ErrnoException, process.argv[3])}`,
    );
  }

  // self-verify: every contract heading present in the written file
  const written = readFileSync(process.argv[3], "utf-8");
  for (const h of HEADINGS) {
    if (!`\n${written}\n`.includes(`\n${h}\n`) && !written.startsWith(h + "\n")) {
      console.error(`error: self-verification failed — missing heading '${h}'`);
      process.exit(1);
    }
  }

  console.log(
    `${tokens.size} tokens, ${groups.size} groups, ${dark.length} dark -> ${process.argv[3]}`,
  );
}

main();
