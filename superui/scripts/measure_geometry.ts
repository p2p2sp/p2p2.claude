/*
 * measure_geometry.ts - pixel-geometry sampler for handoff-bundle "measure,
 * never guess" foundation values (paddings, gaps, border widths, control
 * heights, corner radii, shadow extents, ink/cap-height bounds) that
 * sample_colors.ts's color/luminance measurement does not cover.
 *
 * Five independent measurement modes, one per invocation:
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
 *       given box edge (along the edge's midline), walking up to 32 samples
 *       and stopping early once 3 consecutive samples settle to within 1 of
 *       the far background (sampled well beyond the edge) - a fixed floor,
 *       independent of --tol. Reports the full falloff profile: `samples[]`
 *       (per-step `offset`/`delta`/`hex`, truncated after the last
 *       above-floor sample), `peakOffset` and `peakHex` (the offset/hex of
 *       the maximum-delta sample), plus `extent` (today's semantics: count
 *       of leading samples above --tol) and `bgHex`. `peakDelta` and
 *       `samples[]` are tolerance-independent - a shadow whose maximum
 *       per-channel delta is 3 is reported in full under the default
 *       `--tol 8` instead of vanishing.
 *   --gradient x,y,w,h --axis h|v   Walks the box's midline on the chosen
 *       axis (the same midline --edges uses), sampling every pixel along it.
 *       Reports `startHex`/`midHex`/`endHex` (first/middle/last sampled
 *       pixel), `totalDelta` (max per-channel delta between start and end),
 *       `maxDeviation` (the largest per-channel delta between any sampled
 *       pixel and the linear interpolation of start->end at that position),
 *       and a `verdict` of `flat` (totalDelta < 3), `linear` (maxDeviation
 *       within the larger of 2 or 25% of totalDelta), or `nonlinear`
 *       (otherwise). Tolerance-independent - --tol is not consulted.
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
 *      --edges/--radius/--shadow/--gradient/--ink selects the mode; each
 *      requires its listed companion flag (--axis / --corner / --side /
 *      --axis respectively; --ink has none).
 * Flags:
 *   --tol N     per-channel color tolerance (default 8); not consulted by
 *               --gradient, which is tolerance-independent
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
 *           | --gradient x,y,w,h --axis h|v
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

export interface ShadowSample {
  offset: number;
  delta: number;
  hex: string;
}

export interface ShadowResult {
  extent: number;
  peakDelta: number;
  peakOffset: number;
  peakHex: string;
  bgHex: string;
  samples: ShadowSample[];
}

export type GradientVerdict = "flat" | "linear" | "nonlinear";

export interface GradientResult {
  startHex: string;
  midHex: string;
  endHex: string;
  totalDelta: number;
  maxDeviation: number;
  verdict: GradientVerdict;
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

/** Consecutive walked steps whose delta must stay at or below SETTLE_DELTA to
 *  stop the walk early - a fixed floor, independent of --tol, so a low-delta
 *  falloff is walked to completion instead of vanishing under a high --tol. */
const SETTLE_RUN = 3;
const SETTLE_DELTA = 1;

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
  const bgHex = toHex(bg);

  // Walk outward at most `margin` samples, stopping early once the falloff
  // has settled (SETTLE_RUN consecutive steps at/under SETTLE_DELTA).
  const walked: ShadowSample[] = [];
  let x = startX;
  let y = startY;
  let settleCount = 0;
  for (let step = 0; step < margin; step++) {
    if (x < 0 || x >= img.width || y < 0 || y >= img.height) break;
    const px = pixelAt(img, x, y);
    const delta = maxChannelDelta(px, bg);
    walked.push({ offset: step, delta, hex: toHex(px) });
    if (delta <= SETTLE_DELTA) {
      settleCount++;
      if (settleCount >= SETTLE_RUN) break;
    } else {
      settleCount = 0;
    }
    x += dx;
    y += dy;
  }

  // extent: today's semantics unchanged - count of leading samples above --tol.
  let extent = 0;
  while (extent < walked.length && walked[extent].delta > tol) extent++;

  // peak*: tolerance-independent, over the full walked profile.
  let peakDelta = 0;
  let peakOffset = 0;
  let peakHex = bgHex;
  for (const s of walked) {
    if (s.delta > peakDelta) {
      peakDelta = s.delta;
      peakOffset = s.offset;
      peakHex = s.hex;
    }
  }

  // Truncate the reported profile after the last sample above SETTLE_DELTA -
  // the trailing settle steps proved the falloff ended but are not retained.
  let lastAbove = -1;
  for (let i = 0; i < walked.length; i++) {
    if (walked[i].delta > SETTLE_DELTA) lastAbove = i;
  }
  const samples = lastAbove === -1 ? [] : walked.slice(0, lastAbove + 1);

  return { extent, peakDelta, peakOffset, peakHex, bgHex, samples };
}

// ---------------------------------------------------------------------------
// Mode 4 - scanGradient
// ---------------------------------------------------------------------------

/** Fixed classification thresholds - not flags. A gradient's verdict is
 *  tolerance-independent (--tol is not consulted here). */
const GRADIENT_FLAT_DELTA = 3;
const GRADIENT_LINEAR_FLOOR = 2;
const GRADIENT_LINEAR_FRACTION = 0.25;

export function scanGradient(img: RgbImage, box: Box, axis: Axis): GradientResult {
  const n = axis === "h" ? box.w : box.h;
  const samples: Rgb[] = [];
  if (axis === "h") {
    const y = box.y + Math.floor((box.h - 1) / 2);
    for (let i = 0; i < n; i++) samples.push(pixelAt(img, box.x + i, y));
  } else {
    const x = box.x + Math.floor((box.w - 1) / 2);
    for (let i = 0; i < n; i++) samples.push(pixelAt(img, x, box.y + i));
  }

  const start = samples[0];
  const end = samples[n - 1];
  const mid = samples[Math.floor((n - 1) / 2)];
  const totalDelta = maxChannelDelta(start, end);

  let maxDeviation = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const predicted: Rgb = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ];
    const deviation = maxChannelDelta(samples[i], predicted);
    if (deviation > maxDeviation) maxDeviation = deviation;
  }

  let verdict: GradientVerdict;
  if (totalDelta < GRADIENT_FLAT_DELTA) {
    verdict = "flat";
  } else if (maxDeviation <= Math.max(GRADIENT_LINEAR_FLOOR, totalDelta * GRADIENT_LINEAR_FRACTION)) {
    verdict = "linear";
  } else {
    verdict = "nonlinear";
  }

  return {
    startHex: toHex(start),
    midHex: toHex(mid),
    endHex: toHex(end),
    totalDelta,
    maxDeviation,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// Mode 5 - inkBox
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

const OPTION_NAMES = [
  "--help",
  "--edges",
  "--axis",
  "--radius",
  "--corner",
  "--shadow",
  "--side",
  "--gradient",
  "--ink",
  "--tol",
  "--json",
];

function usageText(): string {
  const pad = " ".repeat(7 + PROG.length + 1);
  return (
    `usage: ${PROG} [-h] IMAGE\n` +
    `${pad}(--edges x,y,w,h --axis h|v\n` +
    `${pad} | --radius x,y,w,h --corner tl|tr|bl|br\n` +
    `${pad} | --shadow x,y,w,h --side top|right|bottom|left\n` +
    `${pad} | --gradient x,y,w,h --axis h|v\n` +
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
  gradient: string | null;
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
    gradient: null,
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
      case "--gradient":
        args.gradient = value;
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

  const modeCount = [args.edges, args.radius, args.shadow, args.gradient, args.ink].filter((v) => v !== null).length;
  if (modeCount !== 1) {
    argError("exactly one of --edges, --radius, --shadow, --gradient, --ink is required");
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
      peakOffset: sh.peakOffset,
      peakHex: sh.peakHex,
      bgHex: sh.bgHex,
      samples: sh.samples,
    };
  } else if (args.gradient !== null) {
    if (args.axis !== "h" && args.axis !== "v") {
      argError("argument --axis: invalid choice (choose from 'h', 'v')");
    }
    const box = parseBox(args.gradient, "--gradient");
    checkBox(box, img);
    const gr = scanGradient(img, box, args.axis);
    result = {
      mode: "gradient",
      axis: args.axis,
      box: [box.x, box.y, box.w, box.h],
      startHex: gr.startHex,
      midHex: gr.midHex,
      endHex: gr.endHex,
      totalDelta: gr.totalDelta,
      maxDeviation: gr.maxDeviation,
      verdict: gr.verdict,
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
      lines.push(
        `extent=${result.extent} peakDelta=${result.peakDelta} peakOffset=${result.peakOffset} ` +
          `peakHex=${result.peakHex} bgHex=${result.bgHex}`,
      );
      for (const s of result.samples as ShadowSample[]) {
        lines.push(`sample ${s.offset} ${s.delta} ${s.hex}`);
      }
      break;
    case "gradient":
      lines.push(
        `startHex=${result.startHex} midHex=${result.midHex} endHex=${result.endHex} ` +
          `totalDelta=${result.totalDelta} maxDeviation=${result.maxDeviation} verdict=${result.verdict}`,
      );
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
