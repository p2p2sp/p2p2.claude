/*
 * measure_geometry.ts - pixel-geometry sampler for handoff-bundle "measure,
 * never guess" foundation values (paddings, gaps, border widths, control
 * heights, corner radii, shadow extents, ink/cap-height bounds) that
 * sample_colors.ts's color/luminance measurement does not cover.
 *
 * Four independent measurement modes, one per invocation:
 *   --edges x,y,w,h --axis h|v   Run-length scan along the row/column that
 *       crosses the box's midline on the cross-axis: groups consecutive
 *       pixels whose per-channel delta from the run's start pixel stays
 *       within --tol, reporting `offset length #hex` per run (offsets are
 *       image-absolute). One primitive covers paddings, gaps, border widths,
 *       control heights, and divider widths.
 *   --radius x,y,w,h --corner tl|tr|bl|br   Fits the box's named corner to
 *       the largest quarter-circle radius r whose per-row boundary offsets
 *       (predicted via the same "first column inside the r-circle" test used
 *       to render a rounded corner) best match the row-by-row measured
 *       background -> foreground transition, selected by minimum total
 *       per-row error. Reports `radius=N` and a `confidence` (fraction of
 *       rows within 1px of the fit at the chosen radius).
 *   --shadow x,y,w,h --side top|right|bottom|left   Steps outward from the
 *       given box edge (along the edge's midline) until color returns to the
 *       far background (sampled well beyond the edge), reporting `extent`
 *       (pixel count before returning to background), `peakDelta` (max
 *       per-channel delta seen from that background) and `bgHex`.
 *   --ink x,y,w,h   Background = the modal color inside the rect (the
 *       surface the glyphs sit on); reports the bounding box of every pixel
 *       differing from that background by more than --tol, plus
 *       `capHeight` (bbox height), and for multi-row ink `lineStarts` (the y
 *       of each contiguous ink row-band) plus a derived `lineHeight`
 *       (average band height).
 *
 * IN : IMAGE - path to a PNG or JPEG image (non-interlaced PNG; baseline or
 *      progressive JPEG), decoded by the bundled vendor decoders (no
 *      third-party dependencies, Node built-ins only). Exactly one of
 *      --edges/--radius/--shadow/--ink selects the mode; each requires its
 *      listed companion flag (--axis / --corner / --side respectively;
 *      --ink has none).
 * Flags:
 *   --tol N     per-channel color tolerance (default 8)
 *   --json      emit structured JSON instead of human-readable lines
 * OUT: stdout - one measurement per mode, a human-readable line (or lines)
 *      by default, or a JSON object with --json.
 * Exit codes: 0 = ok; 1 = unreadable/unsupported image, or a box out of
 *      bounds / zero-sized, or a malformed x,y,w,h value (message on
 *      stderr, offending rect echoed for box errors); 2 = command-line
 *      usage errors (unknown flag, missing IMAGE, missing/duplicated mode
 *      flag, bad --axis/--corner/--side/--tol value).
 *
 * Tolerance and alpha: --tol (default 8) governs per-channel run grouping -
 * a run shorter than 1px cannot exist, so antialiased/subpixel edges report
 * as the nearest whole pixel; this is a measurement granularity limit, not a
 * bug. Alpha is discarded by both vendor decoders (see their headers) and
 * cannot be recovered here - a screenshot with transparency yields the raw
 * under-color, never a composited one.
 *
 * Usage: node measure_geometry.ts IMAGE
 *          (--edges x,y,w,h --axis h|v
 *           | --radius x,y,w,h --corner tl|tr|bl|br
 *           | --shadow x,y,w,h --side top|right|bottom|left
 *           | --ink x,y,w,h)
 *          [--tol N] [--json]
 */

import { basename, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng, isPng, PngDecodeError, PngUnsupportedError } from "./vendor/png-decode.ts";
import { decode as decodeJpeg } from "./vendor/jpeg-decode.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RgbImage {
  width: number;
  height: number;
  /** Row-major RGB, 3 bytes per pixel. */
  rgb: Uint8Array;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Rgb = [number, number, number];
type Axis = "h" | "v";
type Corner = "tl" | "tr" | "bl" | "br";
type Side = "top" | "right" | "bottom" | "left";

export interface Run {
  offset: number;
  length: number;
  hex: string;
}

export interface RadiusFit {
  radius: number;
  confidence: number;
}

export interface ShadowResult {
  extent: number;
  peakDelta: number;
  bgHex: string;
}

export interface InkResult {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  capHeight: number;
  lineStarts: number[];
  lineHeight: number | null;
}

// ---------------------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------------------

export function loadImage(path: string): RgbImage {
  const buf = readFileSync(path);
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (isPng(bytes)) {
    const png = decodePng(bytes); // PngDecodeError / PngUnsupportedError surface verbatim
    return { width: png.width, height: png.height, rgb: png.rgb };
  }
  if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const jpg = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: false }) as {
      width: number;
      height: number;
      data: Uint8Array;
    };
    return { width: jpg.width, height: jpg.height, rgb: jpg.data };
  }
  throw new Error(`cannot identify image file '${path}' (this port decodes PNG and JPEG only)`);
}

// ---------------------------------------------------------------------------
// Pixel helpers
// ---------------------------------------------------------------------------

function pixelAt(img: RgbImage, x: number, y: number): Rgb {
  const i = (y * img.width + x) * 3;
  return [img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]];
}

function withinTol(a: Rgb, b: Rgb, tol: number): boolean {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
}

function maxChannelDelta(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function toHex([r, g, b]: Rgb): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ---------------------------------------------------------------------------
// Mode 1 - scanRuns
// ---------------------------------------------------------------------------

export function scanRuns(img: RgbImage, box: Box, axis: Axis, tol: number): Run[] {
  const runs: Run[] = [];
  if (axis === "h") {
    const y = box.y + Math.floor((box.h - 1) / 2);
    let start = box.x;
    let startColor = pixelAt(img, box.x, y);
    for (let x = box.x + 1; x <= box.x + box.w; x++) {
      const atEnd = x >= box.x + box.w;
      const color = atEnd ? null : pixelAt(img, x, y);
      if (atEnd || !withinTol(color as Rgb, startColor, tol)) {
        runs.push({ offset: start, length: x - start, hex: toHex(startColor) });
        if (!atEnd) {
          start = x;
          startColor = color as Rgb;
        }
      }
    }
  } else {
    const x = box.x + Math.floor((box.w - 1) / 2);
    let start = box.y;
    let startColor = pixelAt(img, x, box.y);
    for (let y = box.y + 1; y <= box.y + box.h; y++) {
      const atEnd = y >= box.y + box.h;
      const color = atEnd ? null : pixelAt(img, x, y);
      if (atEnd || !withinTol(color as Rgb, startColor, tol)) {
        runs.push({ offset: start, length: y - start, hex: toHex(startColor) });
        if (!atEnd) {
          start = y;
          startColor = color as Rgb;
        }
      }
    }
  }
  return runs;
}

// ---------------------------------------------------------------------------
// Mode 2 - fitRadius
// ---------------------------------------------------------------------------

/** Smallest column index (0-based, from the corner) whose pixel falls inside
 *  a quarter-circle of radius r anchored at the corner - the same
 *  pixel-centre test used to rasterise a rounded corner (a pixel is painted
 *  when its centre lies inside the shape). Row/col are both 0-based,
 *  counted inward from the corner. */
function predictedOffset(row: number, r: number): number {
  if (r <= 0) return 0;
  const cy = row + 0.5;
  if (cy >= r) return 0;
  const d = r - cy;
  const inner = Math.max(0, r * r - d * d);
  return Math.max(0, Math.ceil(r - Math.sqrt(inner) - 0.5));
}

function rowForCorner(box: Box, corner: Corner, i: number): number {
  return corner[0] === "t" ? box.y + i : box.y + box.h - 1 - i;
}

function colForCorner(box: Box, corner: Corner, j: number): number {
  return corner[1] === "l" ? box.x + j : box.x + box.w - 1 - j;
}

function outsideRefPoint(box: Box, corner: Corner, img: RgbImage): [number, number] {
  const x = corner[1] === "l" ? box.x - 1 : box.x + box.w;
  const y = corner[0] === "t" ? box.y - 1 : box.y + box.h;
  return [clamp(x, 0, img.width - 1), clamp(y, 0, img.height - 1)];
}

export function fitRadius(img: RgbImage, box: Box, corner: Corner, tol: number): RadiusFit {
  const maxR = Math.max(1, Math.min(Math.floor(box.w / 2), Math.floor(box.h / 2)));
  const [refX, refY] = outsideRefPoint(box, corner, img);
  const bg = pixelAt(img, refX, refY);

  const measured: number[] = [];
  for (let i = 0; i < maxR; i++) {
    const y = rowForCorner(box, corner, i);
    let offset = maxR;
    for (let j = 0; j < maxR; j++) {
      const x = colForCorner(box, corner, j);
      if (!withinTol(pixelAt(img, x, y), bg, tol)) {
        offset = j;
        break;
      }
    }
    measured.push(offset);
  }

  let bestR = 0;
  let bestErr = Infinity;
  for (let r = 0; r <= maxR; r++) {
    let err = 0;
    for (let i = 0; i < maxR; i++) {
      err += Math.abs(predictedOffset(i, r) - measured[i]);
    }
    if (err < bestErr) {
      bestErr = err;
      bestR = r;
    }
  }

  let matches = 0;
  for (let i = 0; i < maxR; i++) {
    if (Math.abs(predictedOffset(i, bestR) - measured[i]) <= 1) matches++;
  }
  return { radius: bestR, confidence: matches / maxR };
}

// ---------------------------------------------------------------------------
// Mode 3 - scanShadow
// ---------------------------------------------------------------------------

export function scanShadow(img: RgbImage, box: Box, side: Side, tol: number): ShadowResult {
  const dx = side === "left" ? -1 : side === "right" ? 1 : 0;
  const dy = side === "top" ? -1 : side === "bottom" ? 1 : 0;

  let startX: number;
  let startY: number;
  if (side === "top" || side === "bottom") {
    startX = box.x + Math.floor(box.w / 2);
    startY = side === "top" ? box.y - 1 : box.y + box.h;
  } else {
    startY = box.y + Math.floor(box.h / 2);
    startX = side === "left" ? box.x - 1 : box.x + box.w;
  }

  const margin = 32;
  const farX = clamp(startX + dx * margin, 0, img.width - 1);
  const farY = clamp(startY + dy * margin, 0, img.height - 1);
  const bg = pixelAt(img, farX, farY);

  let extent = 0;
  let peakDelta = 0;
  let x = startX;
  let y = startY;
  let steps = 0;
  while (x >= 0 && x < img.width && y >= 0 && y < img.height && steps <= margin) {
    const delta = maxChannelDelta(pixelAt(img, x, y), bg);
    if (delta <= tol) break;
    extent++;
    if (delta > peakDelta) peakDelta = delta;
    x += dx;
    y += dy;
    steps++;
  }
  return { extent, peakDelta, bgHex: toHex(bg) };
}

// ---------------------------------------------------------------------------
// Mode 4 - inkBox
// ---------------------------------------------------------------------------

export function inkBox(img: RgbImage, box: Box, tol: number): InkResult {
  const counts = new Map<string, { color: Rgb; n: number }>();
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const c = pixelAt(img, x, y);
      const key = toHex(c);
      const entry = counts.get(key);
      if (entry) entry.n++;
      else counts.set(key, { color: c, n: 1 });
    }
  }
  let bg: Rgb = [255, 255, 255];
  let bestN = -1;
  for (const { color, n } of counts.values()) {
    if (n > bestN) {
      bestN = n;
      bg = color;
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const inkRows: number[] = [];
  for (let y = box.y; y < box.y + box.h; y++) {
    let rowHasInk = false;
    for (let x = box.x; x < box.x + box.w; x++) {
      if (!withinTol(pixelAt(img, x, y), bg, tol)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        rowHasInk = true;
      }
    }
    if (rowHasInk) inkRows.push(y);
  }

  const lineStarts: number[] = [];
  const lineHeights: number[] = [];
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < inkRows.length; i++) {
    const y = inkRows[i];
    if (curStart === -1) {
      curStart = y;
      curLen = 1;
    } else if (y === inkRows[i - 1] + 1) {
      curLen++;
    } else {
      lineStarts.push(curStart);
      lineHeights.push(curLen);
      curStart = y;
      curLen = 1;
    }
  }
  if (curStart !== -1) {
    lineStarts.push(curStart);
    lineHeights.push(curLen);
  }

  const capHeight = maxY >= minY ? maxY - minY + 1 : 0;
  const lineHeight =
    lineHeights.length > 0 ? Math.round(lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length) : null;

  return {
    x0: minX === Infinity ? box.x : minX,
    y0: minY === Infinity ? box.y : minY,
    x1: maxX === -Infinity ? box.x : maxX,
    y1: maxY === -Infinity ? box.y : maxY,
    capHeight,
    lineStarts,
    lineHeight,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "measure_geometry.ts");

const OPTION_NAMES = ["--help", "--edges", "--axis", "--radius", "--corner", "--shadow", "--side", "--ink", "--tol", "--json"];

function usageText(): string {
  const pad = " ".repeat(7 + PROG.length + 1);
  return (
    `usage: ${PROG} [-h] IMAGE\n` +
    `${pad}(--edges x,y,w,h --axis h|v\n` +
    `${pad} | --radius x,y,w,h --corner tl|tr|bl|br\n` +
    `${pad} | --shadow x,y,w,h --side top|right|bottom|left\n` +
    `${pad} | --ink x,y,w,h)\n` +
    `${pad}[--tol N] [--json]`
  );
}

function helpText(): string {
  return usageText() + "\n\nSee the top-of-file header comment for the full IN/OUT/exit-code contract.";
}

function argError(msg: string): never {
  process.stderr.write(usageText() + "\n");
  process.stderr.write(`${PROG}: error: ${msg}\n`);
  process.exit(2);
}

/** sys.exit(message)-equivalent: message on stderr, exit code 1. */
function exitErr(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function resolveOption(name: string): string {
  const exact = OPTION_NAMES.find((o) => o === name);
  if (exact !== undefined) return exact;
  const matches = OPTION_NAMES.filter((o) => o.startsWith(name));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) argError(`unrecognized arguments: ${name}`);
  argError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
}

interface ParsedArgs {
  image: string;
  edges: string | null;
  axis: string | null;
  radius: string | null;
  corner: string | null;
  shadow: string | null;
  side: string | null;
  ink: string | null;
  tol: number;
  json: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    image: "",
    edges: null,
    axis: null,
    radius: null,
    corner: null,
    shadow: null,
    side: null,
    ink: null,
    tol: 8,
    json: false,
  };
  const positionals: string[] = [];
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token !== "-h" && !token.startsWith("--")) {
      positionals.push(token);
      i++;
      continue;
    }
    let name = token;
    let explicit: string | null = null;
    const eq = token.indexOf("=");
    if (token.startsWith("--") && eq >= 0) {
      name = token.slice(0, eq);
      explicit = token.slice(eq + 1);
    }
    const resolved = name === "-h" ? "--help" : resolveOption(name);
    i++;
    if (resolved === "--help") {
      process.stdout.write(helpText() + "\n");
      process.exit(0);
    }
    if (resolved === "--json") {
      if (explicit !== null) argError(`argument --json: ignored explicit argument '${explicit}'`);
      args.json = true;
      continue;
    }
    let value: string;
    if (explicit !== null) {
      value = explicit;
    } else if (i < argv.length) {
      value = argv[i];
      i++;
    } else {
      argError(`argument ${resolved}: expected one argument`);
    }
    switch (resolved) {
      case "--edges":
        args.edges = value;
        break;
      case "--axis":
        args.axis = value;
        break;
      case "--radius":
        args.radius = value;
        break;
      case "--corner":
        args.corner = value;
        break;
      case "--shadow":
        args.shadow = value;
        break;
      case "--side":
        args.side = value;
        break;
      case "--ink":
        args.ink = value;
        break;
      case "--tol": {
        if (!/^[+-]?\d+$/.test(value)) argError(`argument --tol: invalid int value: '${value}'`);
        args.tol = parseInt(value, 10);
        break;
      }
    }
  }
  if (positionals.length === 0) argError("the following arguments are required: image");
  if (positionals.length > 1) argError(`unrecognized arguments: ${positionals.slice(1).join(" ")}`);
  args.image = positionals[0];
  return args;
}

/** Parse "x,y,w,h" into a Box, or exit(1) on a malformed value (never a usage error). */
function parseBox(s: string, label: string): Box {
  const parts = s.split(",");
  if (parts.length !== 4 || parts.some((p) => !/^[+-]?\d+$/.test(p))) {
    exitErr(`error: ${label} expects 4 integers like 'x,y,w,h', got '${s}'`);
  }
  const [x, y, w, h] = parts.map((p) => parseInt(p, 10));
  return { x, y, w, h };
}

function checkBox(box: Box, img: RgbImage): void {
  if (box.w <= 0 || box.h <= 0) {
    exitErr(`error: zero-size box rect=[${box.x},${box.y},${box.w},${box.h}]`);
  }
  if (box.x < 0 || box.y < 0 || box.x + box.w > img.width || box.y + box.h > img.height) {
    exitErr(`error: box out of bounds rect=[${box.x},${box.y},${box.w},${box.h}] image=${img.width}x${img.height}`);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const modeCount = [args.edges, args.radius, args.shadow, args.ink].filter((v) => v !== null).length;
  if (modeCount !== 1) {
    argError("exactly one of --edges, --radius, --shadow, --ink is required");
  }

  let img: RgbImage;
  try {
    img = loadImage(args.image);
  } catch (e) {
    exitErr((e as Error).message);
  }

  const tol = args.tol;
  let result: Record<string, unknown>;

  if (args.edges !== null) {
    if (args.axis !== "h" && args.axis !== "v") {
      argError("argument --axis: invalid choice (choose from 'h', 'v')");
    }
    const box = parseBox(args.edges, "--edges");
    checkBox(box, img);
    const runs = scanRuns(img, box, args.axis, tol);
    result = { mode: "edges", axis: args.axis, box: [box.x, box.y, box.w, box.h], tol, runs };
  } else if (args.radius !== null) {
    if (!["tl", "tr", "bl", "br"].includes(args.corner ?? "")) {
      argError("argument --corner: invalid choice (choose from 'tl', 'tr', 'bl', 'br')");
    }
    const box = parseBox(args.radius, "--radius");
    checkBox(box, img);
    const fit = fitRadius(img, box, args.corner as Corner, tol);
    result = {
      mode: "radius",
      corner: args.corner,
      box: [box.x, box.y, box.w, box.h],
      tol,
      radius: fit.radius,
      confidence: fit.confidence,
    };
  } else if (args.shadow !== null) {
    if (!["top", "right", "bottom", "left"].includes(args.side ?? "")) {
      argError("argument --side: invalid choice (choose from 'top', 'right', 'bottom', 'left')");
    }
    const box = parseBox(args.shadow, "--shadow");
    checkBox(box, img);
    const sh = scanShadow(img, box, args.side as Side, tol);
    result = {
      mode: "shadow",
      side: args.side,
      box: [box.x, box.y, box.w, box.h],
      tol,
      extent: sh.extent,
      peakDelta: sh.peakDelta,
      bgHex: sh.bgHex,
    };
  } else {
    const box = parseBox(args.ink as string, "--ink");
    checkBox(box, img);
    const ink = inkBox(img, box, tol);
    result = {
      mode: "ink",
      box: [box.x, box.y, box.w, box.h],
      tol,
      x0: ink.x0,
      y0: ink.y0,
      x1: ink.x1,
      y1: ink.y1,
      capHeight: ink.capHeight,
      lineStarts: ink.lineStarts,
      lineHeight: ink.lineHeight,
    };
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ image: args.image, size: [img.width, img.height], ...result }, null, 2) + "\n");
    return;
  }

  const lines: string[] = [];
  switch (result.mode) {
    case "edges":
      for (const run of result.runs as Run[]) {
        lines.push(`${run.offset} ${run.length} ${run.hex}`);
      }
      break;
    case "radius":
      lines.push(`radius=${result.radius} confidence=${(result.confidence as number).toFixed(2)}`);
      break;
    case "shadow":
      lines.push(`extent=${result.extent} peakDelta=${result.peakDelta} bgHex=${result.bgHex}`);
      break;
    case "ink":
      lines.push(
        `x0=${result.x0} y0=${result.y0} x1=${result.x1} y1=${result.y1} capHeight=${result.capHeight} ` +
          `lineStarts=[${(result.lineStarts as number[]).join(",")}] lineHeight=${result.lineHeight}`,
      );
      break;
  }
  process.stdout.write(lines.join("\n") + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
