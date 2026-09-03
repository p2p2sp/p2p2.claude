/*
 * build_report.ts - Hormozi Report dashboard renderer.
 *
 * Takes a structured report.json and emits ONE self-contained .html file:
 * a long-form formal written report wrapped in a navigable dashboard shell.
 *
 * IN : spec - path to report.json (top level must be an object; `sections`,
 *      when present, must be an array). A UTF-8 BOM is tolerated.
 *      -o/--out   - output .html path (default: alongside the spec, named
 *                   "<meta.subject> - Diagnosis - <meta.date>.html")
 *      --brand    - path to brand.config.json (default:
 *                   ~/.claude/skills/hormozi-report/brand.config.json)
 *      --no-markdown - skip the report.md companion
 * OUT: the .html file, plus report.md unless suppressed.
 *      stdout - "done - <path>" then a one-line summary; a "  + <token>
 *      embedded" line per embedded font; "  . no brand config at <path>" when
 *      the brand config is absent (not a warning - the fallback is supported).
 *      stderr - "  ! rejected non-https citation URL: <url>", which means a
 *      citation is wrong and the report must not ship as-is.
 *      Exit 1 with a message on stderr when the spec is missing or malformed.
 *
 * The display and label faces (Antarctican, Carbon) plus the logo are
 * base64-embedded from an optional brand.config.json when one is present -
 * base64 never passes through model context, it goes straight from disk into
 * the file. Missing assets degrade to a system stack rather than failing. The
 * BODY face (Outfit) is not embedded and falls back to system-ui on a machine
 * that lacks it; add an `outfit_ttf` key to brand.config.json to bake it in.
 *
 * Uppercase-only display faces are deliberately unsupported for labels: they
 * render digits, lowercase and punctuation as BLANK glyphs, which defeats
 * browser font fallback and silently erases every number. Do not add it back.
 *
 * The output has no external requests: no CDN, no webfont link, no remote
 * images. It opens offline, prints clean, and can be handed to a client as one
 * file.
 *
 * Node >= 22.6 (run directly: `node build_report.ts <spec>`). No dependencies.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Bundled default, resolved from this file - nothing outside the plugin is read
// unless --brand points there. Absent by default, which is the supported path:
// the fallback palette and system fonts are a first-class rendering, not a
// degraded one.
const SKILL_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_BRAND = path.join(SKILL_ROOT, "brand.config.json");

const FALLBACK_COLORS: Record<string, string> = {
  bg: "#08080C", ink: "#F5F5FA", crypto_blue: "#2600EF", purple: "#5001D6",
  neon_yellow: "#FEFF20", hot_pink: "#FE329B", red_pink: "#FF0053", grey: "#787878",
};

type Dict = Record<string, any>;

// ---------------------------------------------------------------- helpers

function expand(p: string | undefined | null): string {
  if (!p) return p as string;
  let out = p;
  out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => process.env[k] ?? m);
  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, k) => process.env[k] ?? m);
  out = out.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (m, k) => process.env[k] ?? m);
  if (out === "~") return homedir();
  if (out.startsWith("~/") || out.startsWith("~\\")) return path.join(homedir(), out.slice(2));
  return out;
}

function isDict(v: any): v is Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function loadBrand(p: string): Dict {
  const target = expand(p);
  if (!target || !existsSync(target)) {
    // Not a warning: the fallback is the supported default. Reserve "!" for
    // the citation-integrity warnings, which mean something is actually wrong.
    console.log(`  · no brand config at ${target} — using fallback palette + system fonts`);
    return { colors: { ...FALLBACK_COLORS }, fonts: {}, logo_path: null };
  }
  const cfg: Dict = JSON.parse(readFileSync(target, "utf-8").replace(/^\uFEFF/, ""));
  cfg.colors = { ...FALLBACK_COLORS, ...(cfg.colors || {}) };
  return cfg;
}

const FONT_FMT: Record<string, string> = { ".otf": "opentype", ".ttf": "truetype", ".woff": "woff", ".woff2": "woff2" };
const FONT_MIME: Record<string, string> = { ".otf": "font/otf", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2" };

function fontFace(family: string, p: string | undefined, weight?: string): string | null {
  const target = expand(p);
  if (!target || !existsSync(target)) return null;
  const ext = path.extname(target).toLowerCase();
  const fmt = FONT_FMT[ext] || "opentype";
  const mime = FONT_MIME[ext] || "font/otf";
  const data = readFileSync(target).toString("base64");
  const w = weight ? `font-weight:${weight};` : "";
  return `@font-face{font-family:'${family}';${w}font-display:swap;`
    + `src:url(data:${mime};base64,${data}) format('${fmt}');}`;
}

function logoUri(p: string | undefined | null): string | null {
  const target = expand(p);
  if (!target || !existsSync(target)) return null;
  const data = readFileSync(target).toString("base64");
  const ext = path.extname(target).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml" : (ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png");
  return `data:${mime};base64,${data}`;
}

/** Escape for HTML text nodes. NULs are dropped - rich() uses them as sentinels. */
function e(s: any): string {
  const raw = s === null || s === undefined ? "" : String(s).replaceAll("\u0000", "");
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

const RE_CODE = /`([^`]+?)`/g;
const RE_BOLD = /\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/g;
const RE_ITAL = /(?<![*\p{L}\p{N}_])\*(?=\S)([^*]+?)(?<=\S)\*(?![*\p{L}\p{N}_])/gu;
const RE_STASH = /\u0000(\d+)\u0000/g;

/*
 * Escape, then re-enable a tiny markdown subset: **bold**, *italic*, `code`.
 *
 * `code` runs FIRST and its contents are parked behind a sentinel the emphasis
 * passes cannot match, so a backtick span protects its own asterisks. Emphasis
 * delimiters must hug non-space characters, which leaves stray asterisks in
 * prose (arithmetic, globs, bullet lists) inert. Italic cannot span `**`, so
 * ***triple*** no longer misnests into <strong><em>...</strong></em>.
 */
function rich(s: any): string {
  let out = e(s);
  const stash: string[] = [];
  out = out.replace(RE_CODE, (_m, g1) => {
    stash.push(g1);
    return `\u0000${stash.length - 1}\u0000`;
  });
  out = out.replace(RE_BOLD, (_m, g1) => `<strong>${g1}</strong>`);
  out = out.replace(RE_ITAL, (_m, g1) => `<em>${g1}</em>`);
  return out.replace(RE_STASH, (_m, n) => `<code>${stash[Number(n)]}</code>`);
}

function slug(s: any, fallback = "s"): string {
  const out = String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return out || fallback;
}

/*
 * Citation hrefs are restricted to https.
 *
 * The product promise is that every link opens the public page the passage was
 * read from, so anything that is not an https URL -- javascript:, data:, a bare
 * http: page, a hallucinated URL shape -- degrades to the same no-link
 * rendering that a missing source_url already produces.
 */
function isHttps(u: any): boolean {
  return /^https:\/\/[^\s/]+/i.test(String(u ?? "").trim());
}

const warned = new Set<string>();

function safeUrl(u: any): string {
  const url = String(u ?? "").trim();
  if (isHttps(url)) return url;
  // Both the inline citation and the sources appendix reach the same URL, and
  // warning twice for one bad link makes the stderr count read as two faults.
  if (url && !warned.has(url)) {
    warned.add(url);
    console.error(`  ! rejected non-https citation URL: ${url.slice(0, 80)}`);
  }
  return "";
}

/*
 * Host of a citation, as its visible label. `www.` is dropped because it is
 * noise on a pill. A hostless URL still parses (`javascript:` has no host), so
 * an empty result falls back rather than rendering a blank link.
 */
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "") || "source";
  } catch {
    return "source";
  }
}

/** Accept a string or list of strings; return a list of non-empty paragraphs. */
function paras(value: any): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value.split("\n\n").map((p) => p.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((p) => String(p).trim()).filter(Boolean);
  }
  return [];
}

// ---------------------------------------------------------------- evidence

/** Usable subsections only - a malformed entry is skipped, not fatal. */
function subsections(sec: Dict): Dict[] {
  return ((sec.subsections || []) as any[]).filter(isDict);
}

/** Usable evidence entries only: dicts carrying a quote or a link. */
function evidenceItems(sub: Dict): Dict[] {
  return ((sub.evidence || []) as any[]).filter((ev) => isDict(ev) && (ev.quote || ev.source_url));
}

/*
 * Group every cited passage by source page, preserving order of first
 * appearance. `source_id` overrides the URL as the key, so several passages
 * pulled from one long page collapse into a single appendix card.
 */
function collectSources(sections: Dict[]): Dict[] {
  const byPage = new Map<string, Dict>();
  for (const sec of sections) {
    for (const sub of subsections(sec)) {
      for (const ev of evidenceItems(sub)) {
        const key = String(ev.source_id || ev.source_url || "unknown");
        let slot = byPage.get(key);
        if (!slot) {
          slot = {
            source_id: ev.source_id,
            title: ev.title || "Untitled",
            published: ev.published,
            cites: [] as Dict[],
          };
          byPage.set(key, slot);
        }
        slot.cites.push({ source_url: ev.source_url, section: sec.title });
      }
    }
  }
  return [...byPage.values()];
}

function renderEvidence(ev: Dict, idx: number): string {
  const url = safeUrl(ev.source_url);
  const label = url ? domainOf(url) : "source";
  let quote = String(ev.quote || "").trim();
  // Keep quotes short - policy is paraphrase-and-link, not wholesale reproduction.
  if (quote.length > 480) quote = quote.slice(0, 477).replace(/\s+$/, "") + "…";
  const meta = [e(ev.title), e(ev.published)].filter(Boolean).join(" &middot; ");
  const link = url
    ? `<a class="ts" href="${e(url)}" target="_blank" rel="noopener noreferrer">`
      + `<span class="play">&#8599;</span>${e(label)}</a>`
    : "";
  // A citation may carry a link without a pull-quote; render the caption alone
  // rather than an empty bordered box that reads as a broken quote.
  const block = quote ? `<blockquote>${e(quote)}</blockquote>` : "";
  return `<figure class="ev${quote ? "" : " ev-bare"}" data-ev="${idx}">`
    + block
    + `<figcaption><span class="ev-meta">${meta}</span>${link}</figcaption>`
    + `</figure>`;
}

// ---------------------------------------------------------------- sections

/*
 * The three ranked constraints, as the first thing the reader touches.
 *
 * Each card is a button that scrolls to the section analysing it. A target
 * that does not resolve to a real anchor is dropped rather than shipped as a
 * dead click.
 */
function renderConstraintBoard(constraints: any[], validIds: Set<string>): string {
  const cards: string[] = [];
  const picked = (constraints || []).filter(isDict)
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (Number(a.x.rank) || 99) - (Number(b.x.rank) || 99) || a.i - b.i)
    .slice(0, 3)
    .map((w) => w.x);
  picked.forEach((c, idx) => {
    const i = idx + 1;
    const rank = c.rank || i;
    const target = validIds.has(c.target) ? c.target : "";
    const impactRaw = Number(c.impact ?? 0);
    const impact = Number.isFinite(impactRaw) ? Math.max(0, Math.min(100, Math.trunc(impactRaw))) : 0;
    const metric = c.metric ? `<span class="cmetric">${rich(c.metric)}</span>` : "";
    const go = target ? '<span class="cgo">Jump to analysis &rarr;</span>' : "";
    cards.push(
      `<button class="ccard r${rank}" data-target="${e(target)}" type="button">`
      + `<span class="rank">${e(rank)}</span>`
      + `<h3>${rich(c.title || "Untitled")}</h3>`
      + `<p>${rich(c.note || "")}</p>${metric}`
      + `<span class="meter"><i data-w="${impact}"></i></span>${go}`
      + `</button>`);
  });
  if (!cards.length) return "";
  return '<div class="board"><div class="board-head">'
    + "<h2>Top three constraints</h2>"
    + '<span class="board-hint">Ranked by impact &middot; click to jump</span>'
    + `</div><div class="cboard">${cards.join("")}</div></div>`;
}

/** The action plan as a working checklist rather than a table to admire. */
function renderActionPanel(actions: any[]): string {
  const rows = (actions || []).filter((a) => isDict(a) && a.action);
  if (!rows.length) return "";
  const items = rows.map((a, i) => {
    const meta = [e(a.owner), e(a.due)].filter(Boolean).join(" &middot; ");
    const why = a.why ? `<div class="awhy">${rich(a.why)}</div>` : "";
    return `<li><button class="acheck" type="button" data-id="a${i}" aria-pressed="false" `
      + `aria-label="Mark action ${i + 1} complete"></button>`
      + `<span class="atext"><span class="aact">${rich(a.action)}</span>${why}</span>`
      + (meta ? `<span class="ameta">${meta}</span>` : "") + "</li>";
  });
  return '<div class="apanel">'
    + '<svg width="0" height="0" style="position:absolute"><defs>'
    + '<linearGradient id="gr" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="var(--blue)"/>'
    + '<stop offset="100%" stop-color="var(--purple)"/></linearGradient></defs></svg>'
    + '<div class="ap-head">'
    + '<span class="ring"><svg width="54" height="54">'
    + '<circle class="bg" cx="27" cy="27" r="24"></circle>'
    + '<circle class="fg" cx="27" cy="27" r="24"></circle></svg>'
    + `<b>0/${rows.length}</b></span>`
    + "<span><h2>Action plan</h2>"
    + "<p>Ordered by impact on the constraint. Tick them off — progress is remembered.</p>"
    + "</span></div>"
    + `<ul class="alist">${items.join("")}</ul>`
    + '<div class="ap-foot">Full detail, owners and review cadence in the sections below.</div>'
    + "</div>";
}

function renderSubsection(sub: Dict, secId: string, n: number): string {
  const sid = sub.id || `${secId}-${n}`;
  const out: string[] = [`<article class="sub" id="${e(sid)}">`];
  out.push(`<button class="sub-head" type="button"><span class="chev"></span>`
    + `<h3>${rich(sub.title || "Untitled")}</h3></button>`);
  out.push('<div class="sub-body">');

  if (sub.plain) {
    out.push(`<p class="plain"><span class="plain-tag">In plain terms</span>${rich(sub.plain)}</p>`);
  }

  for (const p of paras(sub.body)) out.push(`<p>${rich(p)}</p>`);

  const evList = evidenceItems(sub);
  if (evList.length) {
    // Evidence sits behind a toggle so the argument reads as prose and the
    // reader opens the receipts when they want them. The count is always
    // visible, so nothing is hidden - only deferred. Print forces it open.
    const label = `${evList.length} source passage${evList.length !== 1 ? "s" : ""}`;
    const wrapId = `ev-${slug(sid, "x")}`;
    out.push('<div class="ev-block">');
    out.push(`<button class="evtoggle" type="button" data-for="${e(wrapId)}" `
      + `data-label="${e(label)}">Show ${e(label)}</button>`);
    out.push(`<div class="ev-wrap" id="${e(wrapId)}">`);
    out.push('<div class="ev-head"><span class="lbl lbl-src">Source evidence</span>'
      + `<span class="ev-count">${e(label)}</span></div>`);
    evList.forEach((ev, i) => out.push(renderEvidence(ev, i)));
    out.push("</div></div>");
  }

  if (sub.synthesis) {
    out.push('<div class="synth"><span class="lbl lbl-syn">Our reading</span>');
    for (const p of paras(sub.synthesis)) out.push(`<p>${rich(p)}</p>`);
    out.push("</div>");
  }

  const call = sub.callout;
  if (isDict(call) && call.text) {
    const kind = slug(call.type || "note", "note");
    out.push(`<aside class="callout c-${e(kind)}"><span class="c-kind">${e(call.type || "Note")}</span>`
      + `<p>${rich(call.text)}</p></aside>`);
  }

  out.push("</div></article>");
  return out.join("\n");
}

function renderSection(sec: Dict, n: number): string {
  const secId = sec.id || slug(sec.title, `section-${n}`);
  const subs = subsections(sec);
  const out: string[] = [`<section class="sec" id="${e(secId)}">`];
  out.push('<header class="sec-head">');
  out.push(`<span class="sec-num">${String(n).padStart(2, "0")}</span>`);
  out.push(`<h2>${rich(sec.title || "Untitled")}</h2>`);
  if (sec.summary) out.push(`<p class="sec-sum">${rich(sec.summary)}</p>`);
  out.push("</header>");
  subs.forEach((sub, i) => out.push(renderSubsection(sub, secId, i + 1)));
  out.push("</section>");
  return out.join("\n");
}

const RESERVED_IDS = ["snapshot", "actions", "scorecard", "sources", "assumptions", "navsearch"];

/*
 * Stamp a unique, concrete `id` onto every section and subsection.
 *
 * Runs once, before any rendering, so nav and body agree by construction.
 * Without it two sections sharing a title slug to the same anchor and the
 * second nav link jumps to the first; a user section titled "Sources" would
 * collide with the built-in appendix the same way.
 */
function assignIds(sections: Dict[]): void {
  const seen = new Set(RESERVED_IDS);
  const unique = (base: string): string => {
    let cand = base;
    let i = 2;
    while (seen.has(cand)) {
      cand = `${base}-${i}`;
      i += 1;
    }
    seen.add(cand);
    return cand;
  };
  sections.forEach((sec, n) => {
    sec.id = unique(sec.id || slug(sec.title, `section-${n + 1}`));
    subsections(sec).forEach((sub, i) => {
      sub.id = unique(sub.id || `${sec.id}-${i + 1}`);
    });
  });
}

function renderNav(sections: Dict[]): string {
  return sections.map((sec, idx) => {
    const n = idx + 1;
    const secId = sec.id || slug(sec.title, `section-${n}`);
    const kids = subsections(sec).map((sub, i) => {
      const sid = sub.id || `${secId}-${i + 1}`;
      return `<li><a href="#${e(sid)}" class="nav-sub">${e(sub.title || "Untitled")}</a></li>`;
    });
    const kidHtml = kids.length ? `<ul class="nav-kids">${kids.join("")}</ul>` : "";
    return '<li class="nav-group">'
      + `<a href="#${e(secId)}" class="nav-top"><span class="nav-n">${String(n).padStart(2, "0")}</span>`
      + `<span>${e(sec.title || "Untitled")}</span></a>${kidHtml}</li>`;
  }).join("");
}

const NA_CELL = '<span class="na">&mdash;</span>';

function renderTable(rows: any[], cols: [string, string][]): string {
  const list = (rows || []).filter(isDict);
  if (!list.length) return "";
  const head = cols.map(([, label]) => `<th>${e(label)}</th>`).join("");
  const body = list.map((r) => {
    const cells = cols.map(([key]) => {
      const val = r[key];
      const empty = val === null || val === undefined || val === "";
      return `<td>${empty ? NA_CELL : rich(val)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ---------------------------------------------------------------- template

const CSS = String.raw`
__ANTARCTICAN_FACE__
__CARBON_FACE__

/* The label face must have a full character set. An uppercase-A-Z-only face —
   defines digits, lowercase and punctuation as BLANK glyphs, so the browser
   never falls back and every number silently disappears. Verified on the real
   font file. Do not reintroduce it for any string that can contain a digit. */
:root{
  --bg:__C_BG__; --ink:__C_INK__; --blue:__C_BLUE__; --purple:__C_PURPLE__;
  --yellow:__C_YELLOW__; --pink:__C_PINK__; --red:__C_RED__; --grey:__C_GREY__;
  --panel:#0E0E15; --panel2:#12121C; --line:#20202E;
  --head:'Antarctican Headline','Anton',system-ui,sans-serif;
  --sub:'Carbon',ui-monospace,'Share Tech Mono',SFMono-Regular,Menlo,monospace;
  --body:'Outfit','Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --grad:linear-gradient(103deg,var(--blue),var(--purple));
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);
  font-size:17px;line-height:1.72;-webkit-font-smoothing:antialiased}

/* ---------- shell ---------- */
.shell{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:100vh}
.rail{position:sticky;top:0;height:100vh;overflow-y:auto;background:var(--panel);
  border-right:1px solid var(--line);padding:26px 18px 60px}
.rail::-webkit-scrollbar{width:8px}
.rail::-webkit-scrollbar-thumb{background:#25253a;border-radius:4px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.brand img{width:30px;height:30px;object-fit:contain}
.brand .bolt{width:30px;height:30px;border-radius:8px;background:var(--grad)}
.brand b{font-family:var(--head);font-size:16px;letter-spacing:.02em;font-weight:600}
.rail .kicker{font-family:var(--sub);font-size:10.5px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--grey);margin:0 0 22px 40px}
.navsearch{width:100%;background:var(--panel2);border:1px solid var(--line);color:var(--ink);
  border-radius:9px;padding:9px 11px;font-family:var(--body);font-size:13.5px;margin-bottom:16px}
.navsearch::placeholder{color:#55556a}
.navsearch:focus{outline:none;border-color:var(--purple)}
nav ul{list-style:none;margin:0;padding:0}
.nav-group{margin-bottom:3px}
.nav-top{display:flex;gap:10px;align-items:baseline;text-decoration:none;color:#B9B9CC;
  font-size:13.5px;font-weight:600;padding:7px 9px;border-radius:8px;line-height:1.35}
.nav-top:hover{background:#181826;color:#fff}
.nav-n{font-family:var(--sub);font-size:10px;color:var(--grey);letter-spacing:.08em;flex:0 0 auto}
.nav-kids{margin:1px 0 8px 30px;border-left:1px solid var(--line);padding-left:11px}
.nav-sub{display:block;text-decoration:none;color:#7A7A93;font-size:12.5px;
  padding:4.5px 7px;border-radius:6px;line-height:1.4}
.nav-sub:hover{color:#fff;background:#181826}
.nav-top.on{color:#fff;background:#1B1B2B}
.nav-sub.on{color:var(--yellow)}
.nav-group.hide,.nav-kids li.hide{display:none}

/* ---------- main ---------- */
main{padding:0 0 120px;max-width:900px}
.wrap{padding:0 62px}

.hero{padding:58px 62px 40px;border-bottom:1px solid var(--line);position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;inset:auto auto -140px -120px;width:380px;height:380px;
  background:var(--grad);filter:blur(120px);opacity:.20;pointer-events:none}
.eyebrow{font-family:var(--sub);font-size:11px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--grey);margin:0 0 16px}
.hero h1{font-family:var(--head);font-weight:600;font-size:clamp(34px,4.4vw,52px);
  line-height:1.08;margin:0 0 20px;letter-spacing:-.01em}
.hero .lede{font-size:19px;color:#C8C8DA;margin:0;max-width:62ch;line-height:1.65}
.hero-meta{display:flex;flex-wrap:wrap;gap:9px;margin-top:26px}
.chip{font-family:var(--sub);font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  border:1px solid var(--line);background:var(--panel);color:#9C9CB4;
  padding:6px 12px;border-radius:999px}
.chip.on{border-color:transparent;background:var(--grad);color:#fff}

.verdict{margin:34px 0 0;padding:26px 28px;border-radius:16px;background:var(--panel);
  border:1px solid var(--line);border-left:3px solid transparent;
  border-image:var(--grad) 1;border-image-slice:1}
.verdict .lbl{margin-bottom:12px}
.verdict h2{font-family:var(--head);font-weight:600;font-size:25px;line-height:1.22;margin:0 0 12px}
.verdict p{margin:0;color:#C2C2D6}

.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:12px;margin:30px 0 0}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:17px 18px}
.tile .t-l{font-family:var(--sub);font-size:10px;letter-spacing:.15em;text-transform:uppercase;
  color:var(--grey);display:block;margin-bottom:9px}
.tile .t-v{font-family:var(--head);font-weight:600;font-size:30px;line-height:1;
  background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.tile .t-n{display:block;font-size:12.5px;color:#82829A;margin-top:9px;line-height:1.5}

/* ---------- sections ---------- */
.sec{padding-top:64px;scroll-margin-top:20px}
.sec-head{margin-bottom:8px}
.sec-num{font-family:var(--sub);font-size:11px;letter-spacing:.2em;color:var(--grey);display:block;margin-bottom:9px}
.sec h2{font-family:var(--head);font-weight:600;font-size:31px;line-height:1.16;margin:0;letter-spacing:-.005em}
.sec-sum{color:#9E9EB6;font-size:16px;margin:11px 0 0;max-width:64ch}
.sub{padding-top:34px;scroll-margin-top:20px}
.sub h3{font-family:var(--body);font-weight:600;font-size:20.5px;line-height:1.35;
  margin:0 0 13px;color:#fff}
.sub p{margin:0 0 16px;color:#CFCFDF}
.sub code{font-family:var(--sub);font-size:.88em;background:#1A1A28;padding:2px 6px;border-radius:5px;color:var(--yellow)}
.sub strong{color:#fff;font-weight:600}

.plain{background:#101019;border:1px solid var(--line);border-radius:12px;
  padding:15px 18px;font-size:16px;color:#BFBFD4 !important}
.plain-tag{display:block;font-family:var(--sub);font-size:10px;letter-spacing:.15em;
  text-transform:uppercase;color:var(--yellow);margin-bottom:7px}

.lbl{display:inline-block;font-family:var(--sub);font-size:10px;letter-spacing:.15em;
  text-transform:uppercase;padding:3px 9px;border-radius:5px}
.lbl-src{background:rgba(38,0,239,.20);color:#9E93FF;border:1px solid rgba(80,1,214,.45)}
.lbl-syn{background:rgba(254,255,32,.09);color:var(--yellow);border:1px solid rgba(254,255,32,.28)}

.ev-block{margin:20px 0 22px}
.ev-head{display:flex;align-items:center;gap:11px;margin-bottom:11px}
.ev-count{font-size:11.5px;color:var(--grey);font-family:var(--sub);letter-spacing:.06em}
.ev{margin:0 0 9px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;
  padding:16px 18px;transition:border-color .15s}
.ev:hover{border-color:#2E2E45}
.ev blockquote{margin:0;font-size:15.5px;line-height:1.68;color:#B4B4CA;font-style:italic}
.ev blockquote::before{content:"\201C";color:var(--purple);font-size:24px;line-height:0;
  vertical-align:-4px;margin-right:2px}
.ev figcaption{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:10px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line)}
.ev-bare figcaption{margin-top:0;padding-top:0;border-top:none}
.ev-meta{font-size:12px;color:#77778E;line-height:1.45}
.ts{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-family:var(--sub);
  font-size:11.5px;letter-spacing:.05em;color:#fff;background:var(--grad);
  padding:5px 11px;border-radius:999px;white-space:nowrap}
.ts:hover{opacity:.88}
.ts .play{font-size:8px}

.synth{margin:20px 0 22px;padding:17px 20px;border-radius:12px;
  background:rgba(254,255,32,.035);border:1px solid rgba(254,255,32,.16)}
.synth p{margin:11px 0 0;color:#C6C6D8}
.synth p:first-of-type{margin-top:11px}

.callout{margin:20px 0;padding:16px 19px;border-radius:12px;background:var(--panel);
  border:1px solid var(--line);border-left:3px solid var(--grey)}
.callout p{margin:7px 0 0;color:#C6C6D8}
.c-kind{font-family:var(--sub);font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--grey)}
.c-action{border-left-color:var(--yellow)} .c-action .c-kind{color:var(--yellow)}
.c-risk{border-left-color:var(--red)}     .c-risk .c-kind{color:var(--red)}
.c-note{border-left-color:var(--purple)}  .c-note .c-kind{color:#9E93FF}

/* ---------- tables ---------- */
.tw{overflow-x:auto;margin:20px 0;border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:14.5px}
th{font-family:var(--sub);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--grey);text-align:left;padding:13px 16px;background:var(--panel2);
  border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:13px 16px;border-bottom:1px solid var(--line);color:#C4C4D6;vertical-align:top}
tr:last-child td{border-bottom:none}
.na{color:#4A4A5E}
.st{font-family:var(--sub);font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  padding:2px 8px;border-radius:4px;white-space:nowrap}
.st-verified{background:rgba(38,0,239,.2);color:#9E93FF}
.st-inferred{background:rgba(254,255,32,.1);color:var(--yellow)}
.st-missing{background:rgba(255,0,83,.12);color:#FF6B96}

/* ---------- sources ---------- */
.srcgrid{display:grid;gap:10px;margin-top:20px}
.srccard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
.srccard h4{margin:0 0 4px;font-size:15.5px;font-weight:600;color:#fff;line-height:1.4}
.srccard .pub{font-size:12px;color:var(--grey);font-family:var(--sub);letter-spacing:.05em}
.stamps{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}

.foot{margin-top:70px;padding:26px 62px 0;border-top:1px solid var(--line);
  font-size:12.5px;color:#63637A;line-height:1.7}
.foot a{color:#8C8CA6}

.empty{color:var(--grey);font-style:italic}
.assumps{color:#CFCFDF;padding-left:20px;margin:0}
.assumps li{margin-bottom:9px}

/* ---------- reading progress ---------- */
.prog{position:fixed;top:0;left:0;height:2px;width:0;z-index:60;background:var(--grad);
  transition:width .1s linear}

/* ---------- constraint board ---------- */
.board{margin:34px 0 0}
.board-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  margin-bottom:14px;flex-wrap:wrap}
.board-head h2{font-family:var(--head);font-weight:600;font-size:23px;margin:0}
.board-hint{font-family:var(--sub);font-size:10.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--grey)}
.cboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.ccard{position:relative;display:block;width:100%;text-align:left;cursor:pointer;
  background:var(--panel);border:1px solid var(--line);border-radius:14px;
  padding:18px 19px 17px;font:inherit;color:inherit;overflow:hidden;
  transition:transform .16s cubic-bezier(.2,.8,.3,1),border-color .16s,box-shadow .16s}
.ccard::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--grad);
  opacity:.75}
.ccard:hover{transform:translateY(-3px);border-color:#33334d;
  box-shadow:0 10px 28px -14px rgba(80,1,214,.75)}
.ccard:focus-visible{outline:2px solid var(--purple);outline-offset:2px}
.ccard .rank{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
  border-radius:7px;background:var(--grad);color:#fff;font-family:var(--sub);font-size:11px;
  margin-bottom:11px}
.ccard.r2 .rank,.ccard.r3 .rank{background:#1D1D2B;color:#9C9CB4;border:1px solid var(--line)}
.ccard.r2::before,.ccard.r3::before{background:#2A2A3E;opacity:1}
.ccard h3{font-family:var(--body);font-weight:600;font-size:17.5px;line-height:1.3;
  margin:0 0 7px;color:#fff}
.ccard p{margin:0;font-size:13.5px;line-height:1.55;color:#8E8EA6}
.ccard .cmetric{font-family:var(--sub);font-size:11px;letter-spacing:.06em;color:var(--yellow);
  display:block;margin-top:9px}
.meter{height:3px;border-radius:2px;background:#1C1C2A;margin-top:14px;overflow:hidden}
.meter i{display:block;height:100%;background:var(--grad);border-radius:2px;
  width:0;transition:width .9s cubic-bezier(.2,.8,.3,1)}
.ccard.r2 .meter i,.ccard.r3 .meter i{background:#4A4A6B}
.cgo{font-family:var(--sub);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:#6E6E8A;margin-top:12px;display:block}
.ccard:hover .cgo{color:var(--yellow)}
@keyframes flash{0%,100%{box-shadow:0 0 0 0 rgba(80,1,214,0)}
  25%{box-shadow:0 0 0 3px rgba(80,1,214,.55)}}
.flash{animation:flash 1.1s ease-out}

/* ---------- action panel ---------- */
.apanel{margin:30px 0 0;background:var(--panel);border:1px solid var(--line);
  border-radius:16px;padding:22px 24px}
.ap-head{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.ring{position:relative;flex:0 0 auto;width:54px;height:54px}
.ring svg{transform:rotate(-90deg);display:block}
.ring circle{fill:none;stroke-width:5}
.ring .bg{stroke:#1D1D2B}
.ring .fg{stroke:url(#gr);stroke-linecap:round;transition:stroke-dashoffset .5s ease}
.ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:var(--sub);font-size:12px;color:#fff}
.ap-head h2{font-family:var(--head);font-weight:600;font-size:22px;margin:0 0 3px}
.ap-head p{margin:0;font-size:13px;color:var(--grey)}
.alist{list-style:none;margin:0;padding:0}
.alist li{display:flex;gap:13px;align-items:flex-start;padding:12px 0;
  border-top:1px solid var(--line)}
.alist li:first-child{border-top:none}
.acheck{flex:0 0 auto;width:21px;height:21px;margin-top:1px;border-radius:6px;cursor:pointer;
  border:1px solid #34344d;background:var(--panel2);display:flex;align-items:center;
  justify-content:center;color:transparent;font-size:11px;transition:.15s}
.acheck:hover{border-color:var(--purple)}
.acheck[aria-pressed="true"]{background:var(--grad);border-color:transparent;color:#fff}
.atext{flex:1;min-width:0}
.atext .aact{font-size:15px;color:#E4E4F0;line-height:1.5;font-weight:500}
.atext .awhy{font-size:13px;color:#7E7E96;line-height:1.55;margin-top:3px}
.alist li.done .aact{color:#5C5C74;text-decoration:line-through}
.alist li.done .awhy{color:#4A4A5E}
.ameta{flex:0 0 auto;font-family:var(--sub);font-size:10px;letter-spacing:.08em;
  text-transform:uppercase;color:#6E6E8A;border:1px solid var(--line);
  padding:3px 8px;border-radius:5px;white-space:nowrap}
.ap-foot{margin-top:15px;padding-top:13px;border-top:1px solid var(--line);
  font-size:12px;color:#5E5E76}

/* ---------- collapse / evidence toggle ---------- */
.sub-head{display:flex;align-items:flex-start;gap:11px;cursor:pointer;width:100%;
  background:none;border:none;padding:0;text-align:left;font:inherit;color:inherit}
.sub-head:focus-visible{outline:2px solid var(--purple);outline-offset:3px;border-radius:6px}
.chev{flex:0 0 auto;margin-top:6px;width:9px;height:9px;border-right:1.5px solid #6E6E8A;
  border-bottom:1.5px solid #6E6E8A;transform:rotate(45deg);transition:transform .2s}
.sub.closed .chev{transform:rotate(-45deg)}
.sub-head:hover .chev{border-color:var(--yellow)}
.sub.closed .sub-body{display:none}
.evtoggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font:inherit;
  font-family:var(--sub);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
  color:#9E93FF;background:rgba(38,0,239,.13);border:1px solid rgba(80,1,214,.4);
  padding:7px 13px;border-radius:8px;transition:.15s}
.evtoggle:hover{background:rgba(38,0,239,.24);color:#fff}
.ev-wrap{display:none;margin-top:11px}
.ev-wrap.open{display:block}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:26px 0 0}
.minibtn{cursor:pointer;font:inherit;font-family:var(--sub);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;color:#8E8EA6;background:var(--panel);border:1px solid var(--line);
  padding:7px 12px;border-radius:7px;transition:.15s}
.minibtn:hover{color:#fff;border-color:#33334d}

/* ---------- responsive ---------- */
@media (max-width:980px){
  .shell{grid-template-columns:1fr}
  .rail{position:static;height:auto;border-right:none;border-bottom:1px solid var(--line);padding-bottom:22px}
  .nav-kids{display:none}
  .hero{padding:36px 24px 30px}
  .wrap,.foot{padding-left:24px;padding-right:24px}
  main{max-width:none}
}

/* ---------- print ---------- */
@media print{
  body{background:#fff;color:#111;font-size:11.5pt}
  .rail,.navsearch,.hero::after{display:none !important}
  .shell{display:block}
  .hero,.wrap,.foot{padding:0 0 12pt}
  .hero h1,.sec h2,.verdict h2{color:#000}
  .tile,.ev,.srccard,.callout,.verdict,.plain,.synth,.tw{
    background:#fff !important;border:1px solid #CCC !important;break-inside:avoid}
  .tile .t-v{color:#000 !important;-webkit-text-fill-color:#000}
  .sub p,.ev blockquote,td,.sec-sum{color:#222 !important}
  /* Everything below was white-on-white before. The synthesis marker and the
     inferred badge are the document's two integrity signals — losing them in a
     PDF is worse than losing decoration. */
  .sub h3,.srccard h4,.sub strong,.callout .c-kind,.sec-num,th{color:#000 !important}
  .sub code{background:#F2F2F2 !important;color:#111 !important}
  .lbl,.st,.plain-tag,.chip{color:#111 !important;background:none !important;
    border:1px solid #999 !important;-webkit-text-fill-color:#111}
  .synth p,.callout p,.verdict p,.hero .lede,.tile .t-n,.ev-meta,
  .srccard .pub,.assumps li{color:#222 !important}
  .plain{color:#222 !important}
  .na{color:#777 !important}
  .ts{background:none !important;color:#00E !important;padding:0}
  .ts::after{content:" (" attr(href) ")";font-size:8pt;color:#555;word-break:break-all}
  .sec{page-break-before:auto;padding-top:22pt}
  a{text-decoration:underline}
  /* Interactive chrome collapses to a flat document — every collapsed panel is
     forced open so a PDF never silently omits evidence. */
  .prog,.evtoggle,.bar,.chev,.cgo,.acheck,.board-hint{display:none !important}
  .sub.closed .sub-body,.ev-wrap{display:block !important}
  .ccard,.apanel,.alist li{background:#fff !important;border:1px solid #CCC !important;
    break-inside:avoid;transform:none !important;box-shadow:none !important}
  .ccard::before{background:#666 !important}
  .ccard h3,.ap-head h2,.board-head h2,.atext .aact{color:#000 !important}
  .ccard p,.atext .awhy,.ameta,.ap-foot{color:#333 !important}
  .ccard .rank{background:#000 !important;color:#fff !important;
    -webkit-text-fill-color:#fff;border:none !important}
  .ccard .cmetric{color:#111 !important}
  .meter{border:1px solid #999 !important;background:#fff !important}
  .meter i{background:#555 !important}
  .ring{display:none}
  .alist li.done .aact{text-decoration:line-through;color:#666 !important}
}
`;

const JS = String.raw`
(function(){
  // Scrollspy — highlight the section/subsection currently in view.
  var links = [].slice.call(document.querySelectorAll('.nav-top,.nav-sub'));
  var map = {};
  links.forEach(function(a){
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) map[id] = {link:a, el:el};
  });
  var ids = Object.keys(map);
  function spy(){
    var best=null, bestTop=-Infinity, probe=window.innerHeight*0.22;
    ids.forEach(function(id){
      var top = map[id].el.getBoundingClientRect().top;
      if (top <= probe && top > bestTop){ bestTop = top; best = id; }
    });
    links.forEach(function(a){ a.classList.remove('on'); });
    if (best){
      map[best].link.classList.add('on');
      var grp = map[best].link.closest('.nav-group');
      if (grp){ var t = grp.querySelector('.nav-top'); if (t) t.classList.add('on'); }
    }
  }
  var tick=false;
  window.addEventListener('scroll', function(){
    if (tick) return; tick=true;
    requestAnimationFrame(function(){ spy(); tick=false; });
  }, {passive:true});
  spy();

  // Reading progress.
  var prog = document.getElementById('prog');
  function progress(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (prog) prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', progress, {passive:true});
  window.addEventListener('resize', progress);
  progress();

  // Constraint board — jump to the section that analyses this constraint,
  // then flash it so the reader lands with their eye in the right place.
  function goTo(id){
    var el = document.getElementById(id);
    if (!el) return;
    var sub = el.closest ? el.closest('.sub') : null;
    if (sub && sub.classList.contains('closed')) sub.classList.remove('closed');
    el.scrollIntoView({behavior:'smooth', block:'start'});
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
  [].slice.call(document.querySelectorAll('.ccard')).forEach(function(c){
    c.addEventListener('click', function(){ goTo(c.getAttribute('data-target')); });
  });

  // Impact meters fill once on first view.
  function fillMeters(){
    [].slice.call(document.querySelectorAll('.meter i')).forEach(function(m){
      m.style.width = (m.getAttribute('data-w') || 0) + '%';
    });
  }
  setTimeout(fillMeters, 220);

  // Action checklist. State persists per report where the browser allows it —
  // file:// origins sometimes refuse storage, so every access is guarded and the
  // list simply falls back to in-session state.
  var KEY = 'hormozi-report:' + (document.title || 'report');
  function load(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; }
  }
  function save(s){ try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){} }
  var state = load();

  var ring = document.querySelector('.ring .fg');
  var ringTxt = document.querySelector('.ring b');
  var C = 2 * Math.PI * 24;
  if (ring){ ring.style.strokeDasharray = C; }

  function paint(){
    var boxes = [].slice.call(document.querySelectorAll('.acheck'));
    var done = 0;
    boxes.forEach(function(b){
      var on = !!state[b.getAttribute('data-id')];
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '✓' : '';
      b.closest('li').classList.toggle('done', on);
      if (on) done++;
    });
    if (ring && boxes.length){
      ring.style.strokeDashoffset = C * (1 - done / boxes.length);
    }
    if (ringTxt) ringTxt.textContent = done + '/' + boxes.length;
  }
  [].slice.call(document.querySelectorAll('.acheck')).forEach(function(b){
    b.addEventListener('click', function(){
      var id = b.getAttribute('data-id');
      state[id] = !state[id];
      save(state); paint();
    });
  });
  paint();

  // Collapsible subsections + on-demand evidence.
  [].slice.call(document.querySelectorAll('.sub-head')).forEach(function(h){
    h.addEventListener('click', function(){ h.closest('.sub').classList.toggle('closed'); });
  });
  [].slice.call(document.querySelectorAll('.evtoggle')).forEach(function(t){
    t.addEventListener('click', function(e){
      e.stopPropagation();
      var wrap = document.getElementById(t.getAttribute('data-for'));
      if (!wrap) return;
      var open = wrap.classList.toggle('open');
      t.textContent = (open ? 'Hide ' : 'Show ') + t.getAttribute('data-label');
    });
  });
  function setAll(closed){
    [].slice.call(document.querySelectorAll('.sub')).forEach(function(s){
      s.classList.toggle('closed', closed);
    });
  }
  var ea = document.getElementById('expandall'), ca = document.getElementById('collapseall'),
      es = document.getElementById('evall');
  if (ea) ea.addEventListener('click', function(){ setAll(false); });
  if (ca) ca.addEventListener('click', function(){ setAll(true); });
  if (es) es.addEventListener('click', function(){
    var wraps = [].slice.call(document.querySelectorAll('.ev-wrap'));
    var anyClosed = wraps.some(function(w){ return !w.classList.contains('open'); });
    wraps.forEach(function(w){ w.classList.toggle('open', anyClosed); });
    [].slice.call(document.querySelectorAll('.evtoggle')).forEach(function(t){
      t.textContent = (anyClosed ? 'Hide ' : 'Show ') + t.getAttribute('data-label');
    });
    es.textContent = anyClosed ? 'Hide all evidence' : 'Show all evidence';
  });

  // Everything opens for print, then restores.
  function beforePrint(){
    document.body.setAttribute('data-restore',
      [].slice.call(document.querySelectorAll('.sub.closed')).map(function(s){
        return s.id; }).join(','));
    setAll(false);
    [].slice.call(document.querySelectorAll('.ev-wrap')).forEach(function(w){
      w.classList.add('open'); });
  }
  window.addEventListener('beforeprint', beforePrint);
  if (window.matchMedia){
    var mq = window.matchMedia('print');
    if (mq.addEventListener) mq.addEventListener('change', function(ev){ if (ev.matches) beforePrint(); });
  }

  // Nav filter — type to narrow the topic hierarchy.
  var box = document.getElementById('navsearch');
  if (box){
    box.addEventListener('input', function(){
      var q = box.value.trim().toLowerCase();
      document.querySelectorAll('.nav-group').forEach(function(g){
        var kids = [].slice.call(g.querySelectorAll('.nav-kids li'));
        var topTxt = (g.querySelector('.nav-top')||{}).textContent || '';
        var topHit = !q || topTxt.toLowerCase().indexOf(q) > -1;
        var anyKid = false;
        kids.forEach(function(li){
          var hit = !q || li.textContent.toLowerCase().indexOf(q) > -1 || topHit;
          li.classList.toggle('hide', !hit);
          if (hit) anyKid = true;
        });
        g.classList.toggle('hide', !(topHit || anyKid));
      });
    });
  }
})();
`;

const PAGE = String.raw`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title>
<style>__CSS__</style>
</head><body>
<div class="prog" id="prog"></div>
<div class="shell">
  <aside class="rail">
    <div class="brand">__BRANDMARK__<b>__SUBJECT__</b></div>
    <p class="kicker">__KICKER__</p>
    <input id="navsearch" class="navsearch" type="search" placeholder="Filter topics&hellip;" autocomplete="off">
    <nav><ul>__NAV__</ul></nav>
  </aside>
  <main>
    <header class="hero">
      <p class="eyebrow">__EYEBROW__</p>
      <h1>__H1__</h1>
      <p class="lede">__LEDE__</p>
      <div class="hero-meta">__CHIPS__</div>
    </header>
    <div class="wrap">
      __CONSTRAINTS__
      __ACTIONPANEL__
      __VERDICT__
      __TILES__
      __SNAPSHOT__
      <div class="bar">
        <button class="minibtn" id="expandall" type="button">Expand all</button>
        <button class="minibtn" id="collapseall" type="button">Collapse all</button>
        <button class="minibtn" id="evall" type="button">Show all evidence</button>
      </div>
      __SECTIONS__
      __ACTIONS__
      __SCORECARD__
      __SOURCES__
      __ASSUMPTIONS__
    </div>
    <footer class="foot">__FOOT__</footer>
  </main>
</div>
<script>__JS__</script>
</body></html>
`;

// ---------------------------------------------------------------- build

function build(report: Dict, brand: Dict): string {
  const meta: Dict = report.meta || {};
  const colors: Dict = brand.colors || FALLBACK_COLORS;
  const fonts: Dict = brand.fonts || {};

  const sections = ((report.sections || []) as any[]).filter(isDict);
  assignIds(sections);

  // Anchors the constraint board is allowed to point at.
  const validIds = new Set(RESERVED_IDS);
  for (const sec of sections) {
    validIds.add(sec.id);
    for (const sub of subsections(sec)) validIds.add(sub.id);
  }
  const boardHtml = renderConstraintBoard(report.constraints || [], validIds);
  const actionPanelHtml = renderActionPanel(report.actions || []);

  let navHtml = renderNav(sections);
  const secHtml = sections.map((sec, i) => renderSection(sec, i + 1));

  // --- hero chips
  const chips: string[] = [];
  const mode = String(meta.mode || "full").toLowerCase();
  chips.push(`<span class="chip on">${e(mode.startsWith("full") ? "Full report" : "Quick answer")}</span>`);
  if (meta.date) chips.push(`<span class="chip">${e(meta.date)}</span>`);
  let totalCites = 0;
  for (const s of sections) {
    for (const sub of subsections(s)) totalCites += ((sub.evidence || []) as any[]).length;
  }
  chips.push(`<span class="chip">${totalCites} citation${totalCites !== 1 ? "s" : ""}</span>`);

  // --- verdict
  const v: Dict = report.verdict || {};
  let verdictHtml = "";
  if (v.headline || v.summary) {
    const bits = ['<div class="verdict">', '<span class="lbl lbl-src">Executive diagnosis</span>'];
    if (v.headline) bits.push(`<h2>${rich(v.headline)}</h2>`);
    for (const p of paras(v.summary)) bits.push(`<p>${rich(p)}</p>`);
    if (v.constraint) {
      bits.push(`<p style="margin-top:14px"><strong>Primary constraint:</strong> ${rich(v.constraint)}`
        + (v.confidence ? ` &middot; <span style="color:#82829A">confidence: ${e(v.confidence)}</span>` : "")
        + "</p>");
    }
    bits.push("</div>");
    verdictHtml = bits.join("\n");
  }

  // --- metric tiles
  const tiles = (report.metrics || []) as Dict[];
  let tilesHtml = "";
  if (tiles.length) {
    const cards = tiles.map((t) => {
      const note = t.note ? `<span class="t-n">${rich(t.note)}</span>` : "";
      return `<div class="tile"><span class="t-l">${e(t.label)}</span>`
        + `<span class="t-v">${e(t.value)}</span>${note}</div>`;
    });
    tilesHtml = `<div class="tiles">${cards.join("")}</div>`;
  }

  // --- snapshot
  const snap = (report.snapshot || []) as Dict[];
  let snapshotHtml = "";
  if (snap.length) {
    const body = snap.map((r) => {
      const st = slug(r.status || "", "");
      const badge = st ? `<span class="st st-${e(st)}">${e(r.status)}</span>` : "";
      return `<tr><td>${rich(r.field)}</td><td>${rich(r.value)}</td><td>${badge}</td></tr>`;
    }).join("");
    snapshotHtml = '<section class="sec" id="snapshot"><header class="sec-head">'
      + '<span class="sec-num">00</span><h2>Verified business snapshot</h2>'
      + '<p class="sec-sum">Every value below is marked verified, inferred, or missing. '
      + "Recommendations that depend on an inferred or missing value are labelled where they appear.</p>"
      + '</header><div class="tw"><table><thead><tr><th>Field</th><th>Value</th><th>Status</th></tr></thead>'
      + `<tbody>${body}</tbody></table></div></section>`;
  }

  // --- actions
  const actions = (report.actions || []) as Dict[];
  let actionsHtml = "";
  if (actions.length) {
    actionsHtml = '<section class="sec" id="actions"><header class="sec-head">'
      + '<span class="sec-num">&#9679;</span><h2>Prioritised action plan</h2>'
      + '<p class="sec-sum">Ordered by expected impact on the primary constraint.</p></header>'
      + renderTable(actions, [["priority", "#"], ["action", "Action"],
        ["why", "Why it moves the constraint"], ["owner", "Owner"], ["due", "By"]])
      + "</section>";
  }

  // --- scorecard
  const score = (report.scorecard || []) as Dict[];
  let scoreHtml = "";
  if (score.length) {
    scoreHtml = '<section class="sec" id="scorecard"><header class="sec-head">'
      + '<span class="sec-num">&#9679;</span><h2>Scorecard</h2>'
      + '<p class="sec-sum">What gets reviewed, by whom, and how often.</p></header>'
      + renderTable(score, [["metric", "Metric"], ["baseline", "Baseline"], ["target", "Target"],
        ["owner", "Owner"], ["cadence", "Review cadence"]])
      + "</section>";
  }

  // --- sources appendix
  const cards: string[] = [];
  for (const s of collectSources(sections)) {
    // One pill per distinct URL: several passages quoted off one page would
    // otherwise render as a row of identical links.
    const urls = [...new Set((s.cites as Dict[]).map((c) => safeUrl(c.source_url)).filter(Boolean))];
    const stamps = urls.map((url) => `<a class="ts" href="${e(url)}" target="_blank" rel="noopener noreferrer">`
      + `<span class="play">&#8599;</span>${e(domainOf(url))}</a>`).join("");
    if (!stamps) continue; // a source card with no working link reads as a broken citation
    const pub = s.published ? `<span class="pub">${e(s.published)}</span>` : "";
    cards.push(`<div class="srccard"><h4>${e(s.title)}</h4>${pub}`
      + `<div class="stamps">${stamps}</div></div>`);
  }

  let sourcesHtml: string;
  if (cards.length) {
    sourcesHtml = '<section class="sec" id="sources"><header class="sec-head">'
      + '<span class="sec-num">&#9679;</span><h2>Sources</h2>'
      + `<p class="sec-sum">${cards.length} source${cards.length !== 1 ? "s" : ""} cited. `
      + "Every link opens the public page the passage was read from.</p></header>"
      + `<div class="srcgrid">${cards.join("")}</div></section>`;
  } else {
    // Deliberately loud rather than absent: a diagnosis with no citations is
    // a fact the reader needs, not an empty block to hide.
    sourcesHtml = '<section class="sec" id="sources"><header class="sec-head">'
      + '<span class="sec-num">&#9679;</span><h2>Sources</h2></header>'
      + '<p class="empty">No passages were cited in this report.</p></section>';
  }

  // --- assumptions
  const assumptions = (report.assumptions || []) as any[];
  let assumptionsHtml = "";
  if (assumptions.length) {
    const lis = assumptions.map((a) => `<li>${rich(a)}</li>`).join("");
    assumptionsHtml = '<section class="sec" id="assumptions"><header class="sec-head">'
      + '<span class="sec-num">&#9679;</span><h2>Risks, assumptions &amp; missing data</h2></header>'
      + `<div class="sub"><ul class="assumps">${lis}</ul></div></section>`;
  }

  // --- nav gets the appendix entries too
  const navEntry = ([i, l]: [string, string]) =>
    `<li class="nav-group"><a href="#${e(i)}" class="nav-top"><span class="nav-n">&#9679;</span>`
    + `<span>${e(l)}</span></a></li>`;
  const extraNav: [string, string][] = [];
  if (snapshotHtml) extraNav.push(["snapshot", "Verified snapshot"]);
  navHtml = extraNav.map(navEntry).join("") + navHtml;
  const tailNav: [string, string][] = [];
  if (actionsHtml) tailNav.push(["actions", "Action plan"]);
  if (scoreHtml) tailNav.push(["scorecard", "Scorecard"]);
  tailNav.push(["sources", "Sources"]);
  if (assumptionsHtml) tailNav.push(["assumptions", "Risks & assumptions"]);
  navHtml += tailNav.map(navEntry).join("");

  // --- brandmark
  const uri = logoUri(brand.logo_path);
  const brandmark = uri ? `<img src="${uri}" alt="">` : '<span class="bolt"></span>';

  // --- css tokens
  let css = CSS;
  const faces: [string, string | null][] = [
    ["__ANTARCTICAN_FACE__", fontFace("Antarctican Headline", fonts.antarctican_otf, "600")],
    ["__CARBON_FACE__", fontFace("Carbon", fonts.carbon_otf)],
  ];
  for (const [token, face] of faces) {
    const replacement = face || `/* ${token} unavailable — system fallback */`;
    css = css.replaceAll(token, () => replacement);
    if (face) console.log(`  + ${token} embedded`);
  }
  const colorTokens: [string, string][] = [
    ["__C_BG__", "bg"], ["__C_INK__", "ink"], ["__C_BLUE__", "crypto_blue"],
    ["__C_PURPLE__", "purple"], ["__C_YELLOW__", "neon_yellow"],
    ["__C_PINK__", "hot_pink"], ["__C_RED__", "red_pink"], ["__C_GREY__", "grey"],
  ];
  for (const [token, key] of colorTokens) {
    const value = colors[key] ?? FALLBACK_COLORS[key];
    css = css.replaceAll(token, () => value);
  }

  const title = meta.title || "Business Diagnosis";
  const subject = meta.subject || "Business Report";
  const foot = "Evidence is drawn from public web sources, each linked in full above; credit for the source "
    + "material belongs to its authors and publishers. This is an independent analysis, not affiliated with "
    + "or endorsed by anyone cited. Educational source retrieval &mdash; not legal, financial, or "
    + "individualised professional advice. A cited page may have changed or moved since it was read.";

  const tokens: Record<string, string> = {
    __CSS__: css, __JS__: JS, __TITLE__: e(title),
    __BRANDMARK__: brandmark, __SUBJECT__: e(subject),
    __KICKER__: e(meta.kicker || "Citation-backed diagnosis"),
    __NAV__: navHtml, __EYEBROW__: e(meta.eyebrow || "Business diagnosis"),
    __H1__: rich(title), __LEDE__: rich(meta.lede || ""),
    __CHIPS__: chips.join(""), __VERDICT__: verdictHtml, __TILES__: tilesHtml,
    __CONSTRAINTS__: boardHtml, __ACTIONPANEL__: actionPanelHtml,
    __SNAPSHOT__: snapshotHtml, __SECTIONS__: secHtml.join("\n"),
    __ACTIONS__: actionsHtml, __SCORECARD__: scoreHtml,
    __SOURCES__: sourcesHtml, __ASSUMPTIONS__: assumptionsHtml,
    __FOOT__: foot,
  };
  // Single pass. Sequential replace would re-scan already-injected content, so a
  // report whose prose contains a literal __SECTIONS__ would have the whole body
  // spliced into it by a later replace. One regex sweep is order-independent and
  // never revisits what it just wrote.
  return PAGE.replace(/__[A-Z0-9_]+__/g, (m) => (m in tokens ? tokens[m] : m));
}

// ---------------------------------------------------------------- markdown

function mdTable(rows: any[], cols: [string, string][]): string[] {
  if (!rows || !rows.length) return [];
  const out = ["| " + cols.map(([, label]) => label).join(" | ") + " |",
    "|" + cols.map(() => "---").join("|") + "|"];
  for (const r of rows) {
    out.push("| " + cols.map(([k]) => {
      const v = r?.[k];
      const s = v ? String(v) : "—";
      return s.replaceAll("|", "\\|");
    }).join(" | ") + " |");
  }
  return [...out, ""];
}

/*
 * The plain-text twin of the dashboard.
 *
 * This is NOT a deliverable - the HTML is. It exists so a later conversation
 * can answer questions about a finished report by reading ~4k words of clean
 * prose instead of a 200KB HTML file full of base64 font data, or the verbose
 * JSON. Always written alongside the render.
 */
function renderMarkdown(report: Dict): string {
  const meta: Dict = report.meta || {};
  const L: string[] = [`# ${meta.title || "Business Diagnosis"}`, ""];
  const sub = [meta.subject, meta.date, meta.eyebrow].filter(Boolean).join(" · ");
  if (sub) L.push(`*${sub}*`, "");
  if (meta.lede) L.push(meta.lede, "");

  const v: Dict = report.verdict || {};
  if (Object.keys(v).length) {
    L.push("---", "", "## Executive diagnosis", "");
    if (v.headline) L.push(`**${v.headline}**`, "");
    for (const p of paras(v.summary)) L.push(p, "");
    if (v.constraint) {
      const conf = v.confidence ? ` (confidence: ${v.confidence})` : "";
      L.push(`**Primary constraint:** ${v.constraint}${conf}`, "");
    }
  }

  if (report.metrics?.length) {
    L.push("## Key figures", "");
    for (const t of report.metrics as Dict[]) {
      const note = t.note ? ` — ${t.note}` : "";
      L.push(`- **${t.label}:** ${t.value}${note}`);
    }
    L.push("");
  }

  if (report.snapshot?.length) {
    L.push("## Verified business snapshot", "");
    L.push(...mdTable(report.snapshot, [["field", "Field"], ["value", "Value"], ["status", "Status"]]));
  }

  ((report.sections || []) as Dict[]).forEach((sec, idx) => {
    L.push("---", "", `## ${String(idx + 1).padStart(2, "0")}. ${sec.title || "Untitled"}`, "");
    if (sec.summary) L.push(`*${sec.summary}*`, "");
    for (const s of subsections(sec)) {
      L.push(`### ${s.title || "Untitled"}`, "");
      if (s.plain) L.push(`> **In plain terms.** ${s.plain}`, "");
      for (const p of paras(s.body)) L.push(p, "");
      for (const ev of (s.evidence || []) as Dict[]) {
        let quote = String(ev.quote || "").trim();
        if (quote.length > 480) quote = quote.slice(0, 477).replace(/\s+$/, "") + "…";
        // The markdown applies the same https gate as the HTML: report.md is
        // what a later conversation reads, so a rejected URL must not survive
        // here as a live link after the dashboard dropped it.
        const url = String(ev.source_url || "");
        const title = ev.title || "source";
        L.push(`> ${quote}`, ">", isHttps(url)
          ? `> — [${title} · ${domainOf(url)}](${url})`
          : `> — ${title}${url ? " · citation URL rejected (not https)" : ""}`, "");
      }
      if (s.synthesis) {
        L.push("**Our reading.**", "");
        for (const p of paras(s.synthesis)) L.push(p, "");
      }
      const call = s.callout;
      if (isDict(call) && call.text) {
        const kind = String(call.type ?? "Note");
        const titled = kind.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        L.push(`**${titled}:** ${call.text}`, "");
      }
    }
  });

  if (report.actions?.length) {
    L.push("---", "", "## Prioritised action plan", "");
    L.push(...mdTable(report.actions, [["priority", "#"], ["action", "Action"],
      ["why", "Why it moves the constraint"], ["owner", "Owner"], ["due", "By"]]));
  }

  if (report.scorecard?.length) {
    L.push("## Scorecard", "");
    L.push(...mdTable(report.scorecard, [["metric", "Metric"], ["baseline", "Baseline"],
      ["target", "Target"], ["owner", "Owner"], ["cadence", "Review cadence"]]));
  }

  const srcs = collectSources(((report.sections || []) as any[]).filter(isDict));
  if (srcs.length) {
    L.push("---", "", "## Sources", "");
    for (const s of srcs) {
      const urls = [...new Set((s.cites as Dict[]).map((c) => String(c.source_url || "")).filter(isHttps))];
      if (!urls.length) continue; // matches the HTML, which drops a card with no working link
      const stamps = urls.map((u) => `[${domainOf(u)}](${u})`).join(", ");
      const pub = s.published ? ` (${s.published})` : "";
      L.push(`- **${s.title}**${pub} — ${stamps}`);
    }
    L.push("");
  }

  if (report.assumptions?.length) {
    L.push("## Risks, assumptions & missing data", "");
    L.push(...(report.assumptions as any[]).map((a) => `- ${a}`), "");
  }

  L.push("---", "",
    "*Evidence is drawn from public web sources, each linked in full above; credit for the source "
    + "material belongs to its authors and publishers. Independent analysis, not affiliated with or "
    + "endorsed by anyone cited. Educational source retrieval — not legal, financial, or "
    + "individualised professional advice. A cited page may have changed or moved since it was read.*");
  return L.join("\n");
}

// ---------------------------------------------------------------- cli

const USAGE = "usage: node build_report.ts <report.json> [-o OUT.html] [--brand brand.config.json] [--no-markdown]";

function parseArgs(argv: string[]): { spec?: string; out?: string; brand: string; noMarkdown: boolean } {
  const parsed = { spec: undefined as string | undefined, out: undefined as string | undefined, brand: DEFAULT_BRAND, noMarkdown: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-o" || a === "--out") { parsed.out = argv[++i]; }
    else if (a.startsWith("--out=")) { parsed.out = a.slice(6); }
    else if (a === "--brand") { parsed.brand = argv[++i]; }
    else if (a.startsWith("--brand=")) { parsed.brand = a.slice(8); }
    else if (a === "--no-markdown") { parsed.noMarkdown = true; }
    else if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
    else if (a.startsWith("-")) { console.error(`unknown option: ${a}\n${USAGE}`); process.exit(2); }
    else if (parsed.spec === undefined) { parsed.spec = a; }
    else { console.error(`unexpected argument: ${a}\n${USAGE}`); process.exit(2); }
  }
  return parsed;
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) {
    console.error(USAGE);
    return 2;
  }

  const specPath = expand(args.spec);
  if (!existsSync(specPath)) {
    console.error(`spec not found: ${specPath}`);
    return 1;
  }
  let report: any;
  try {
    // The BOM is stripped explicitly: Windows editors and PowerShell 5.1's
    // Set-Content -Encoding utf8 write one, and JSON.parse rejects it.
    report = JSON.parse(readFileSync(specPath, "utf-8").replace(/^\uFEFF/, ""));
  } catch (exc: any) {
    console.error(`${specPath}: not valid JSON — ${exc.message}`);
    return 1;
  }

  if (!isDict(report)) {
    console.error(`${specPath}: top level must be a JSON object, got ${Array.isArray(report) ? "array" : typeof report}`);
    return 1;
  }
  if (report.sections !== undefined && report.sections !== null && !Array.isArray(report.sections)) {
    console.error(`${specPath}: 'sections' must be a list, got ${typeof report.sections}`);
    return 1;
  }

  const brand = loadBrand(args.brand);
  const htmlOut = build(report, brand);

  let outPath: string;
  if (args.out) {
    outPath = expand(args.out);
  } else {
    const meta: Dict = report.meta || {};
    const stamp = meta.date || new Date().toISOString().slice(0, 10);
    const name = `${meta.subject || "Business"} — Diagnosis — ${stamp}.html`;
    outPath = path.join(path.dirname(path.resolve(specPath)), name);
  }

  mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  writeFileSync(outPath, htmlOut, "utf-8");

  const kb = statSync(outPath).size / 1024;
  const secs = ((report.sections || []) as any[]).filter(isDict);
  let nCite = 0;
  for (const s of secs) {
    for (const sub of subsections(s)) nCite += ((sub.evidence || []) as any[]).length;
  }
  console.log(`done — ${outPath}`);
  console.log(`  ${secs.length} sections · ${nCite} citations · ${Math.round(kb)} KB · self-contained`);

  if (!args.noMarkdown) {
    const mdPath = path.join(path.dirname(path.resolve(outPath)), "report.md");
    const md = renderMarkdown(report);
    writeFileSync(mdPath, md, "utf-8");
    const words = md.trim().split(/\s+/).filter(Boolean).length;
    console.log(`  + report.md (${words.toLocaleString("en-US")} words) — read this to answer questions later`);
  }
  return 0;
}

process.exitCode = main();
