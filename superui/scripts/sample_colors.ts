/*
Extract exact colors from a layout image.

Three modes (combinable):
  - palette: k-means dominant colors over the whole image (or a crop)
  - points:  exact color at specific x,y pixel coordinates
  - regions: background color of named rectangles, ranked by WCAG luminance
             (darkest first = surface.base, lighter = raised/muted) so the
             surface/elevation order is MEASURED, not assumed

IN : IMAGE — path to a PNG or JPEG image (non-interlaced PNG; baseline or
     progressive JPEG). Decoded by the bundled vendor decoders — no
     third-party dependencies, Node built-ins only.
Flags:
  --k N               palette size (default 8; 0 skips the palette)
  --points x,y ...    pixel coordinates to sample exactly
  --crop x,y,w,h      crop applied before palette extraction
  --regions name=x,y,w,h ...  named rects, ranked by background luminance
  --json              emit DTCG-ready JSON instead of the table
OUT: stdout — human-readable table by default, JSON with --json. Each color is
     reported as hex, sRGB 0..1 components, and a coverage % (palette). The
     palette contains only real clusters: empty clusters (k larger than the
     number of distinct colors) are dropped and identical centroids are merged,
     so no duplicate or cov=0.0% entries are ever printed.
Exit codes: 0 = ok; 1 = bad mode arguments or unreadable image (message on
     stderr); 2 = command-line usage errors (unknown flag, missing IMAGE,
     non-integer --k).

Usage: node sample_colors.ts IMAGE [--k N] [--points x,y ...]
       [--crop x,y,w,h] [--regions name=x,y,w,h ...] [--json]

Byte-compatibility note: this is a 1:1 port of sample_colors.py. The k-means
(numpy PCG64 seeded 0, Floyd sampling for the initial centroids, 25 iteration
cap, argsort tie order) and all rounding/formatting (Python round-half-even,
repr-style floats, json.dumps indent=2 layout) are replicated exactly, so PNG
output is byte-identical to the Python original.
*/

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { decodePng, isPng, PngDecodeError, PngUnsupportedError } from "./vendor/png-decode.ts";
import { decode as decodeJpeg } from "./vendor/jpeg-decode.ts";

// ---------------------------------------------------------------------------
// Python-compatible number formatting
// ---------------------------------------------------------------------------

/** Marks a value that Python would carry as `float` (prints "1.0", not "1"). */
class F {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
}

interface MantExp {
  mant: bigint;
  e2: number;
}

/** Exact base-2 decomposition of a finite positive double: value = mant * 2^e2. */
function decompose(ax: number): MantExp {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, ax);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const expBits = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e2: number;
  if (expBits === 0) {
    e2 = -1074;
  } else {
    mant |= 1n << 52n;
    e2 = expBits - 1075;
  }
  return { mant, e2 };
}

/** round_half_even(|x| * 10^digits) computed exactly, as a BigInt. */
function scaledHalfEven(ax: number, digits: number): bigint {
  const { mant, e2 } = decompose(ax);
  const p10 = 10n ** BigInt(digits);
  if (e2 >= 0) {
    return mant * (1n << BigInt(e2)) * p10;
  }
  const num = mant * p10;
  const den = 1n << BigInt(-e2);
  let q = num / den;
  const twice = (num % den) * 2n;
  if (twice > den) {
    q += 1n;
  } else if (twice === den && q % 2n === 1n) {
    q += 1n;
  }
  return q;
}

/** Python round(x, ndigits) for floats: correct decimal rounding, half-even. */
function pyRound(x: number, ndigits: number): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const neg = x < 0;
  const ax = Math.abs(x);
  if (ax >= 1e16) return x; // double spacing already exceeds the rounding grain
  const q = scaledHalfEven(ax, ndigits);
  const result = Number(q) / Number(10n ** BigInt(ndigits));
  return neg ? -result : result;
}

/** Python round(x) to int: round-half-even (banker's rounding). */
function pyRoundInt(x: number): number {
  const fl = Math.floor(x);
  const diff = x - fl;
  if (diff > 0.5) return fl + 1;
  if (diff < 0.5) return fl;
  return fl % 2 === 0 ? fl : fl + 1;
}

/**
 * numpy round(x, 4) — NOT the same as CPython's round. In the original
 * script `cov` is an np.float64 (int64 count / int64 total), so `round(cov,
 * 4)` dispatches to np.round: multiply by 10^4 (IEEE-rounded product!), rint
 * half-even, divide back. This differs from CPython's exact-decimal rounding
 * at boundary values, and coverage parity requires the numpy behavior.
 */
function npRound4(x: number): number {
  const scaled = x * 10000.0;
  return pyRoundInt(scaled) / 10000.0;
}

/** Python format(x, ".<prec>f"): fixed-point, correctly rounded half-even. */
function pyFixed(x: number, prec: number): string {
  const neg = x < 0;
  const ax = Math.abs(x);
  const q = scaledHalfEven(ax, prec);
  let s = q.toString();
  if (prec > 0) {
    s = s.padStart(prec + 1, "0");
    s = s.slice(0, s.length - prec) + "." + s.slice(s.length - prec);
  }
  return (neg ? "-" : "") + s;
}

/** Python repr() of a float (shortest round-trip; integral values keep ".0"). */
function floatRepr(v: number): string {
  if (Number.isInteger(v) && Math.abs(v) < 1e16) {
    return v.toFixed(1);
  }
  return String(v);
}

/** Python repr() of a str (as far as the characters used here need). */
function pyRepr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const code = ch.codePointAt(0) as number;
    if (ch === "\\" || ch === quote) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += "\\x" + code.toString(16).padStart(2, "0");
    else out += ch;
  }
  return out + quote;
}

/** JSON string per Python json.dumps (ensure_ascii=True). */
function jsonString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const ch = s[i];
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (c < 0x20 || c > 0x7e) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}

/** Python json.dumps(value, indent=2) — same layout, key order, and floats. */
function pyJson(v: unknown, indent: number = 0): string {
  if (v instanceof F) return floatRepr(v.v);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return jsonString(v);
  const pad = " ".repeat(indent);
  const padIn = " ".repeat(indent + 2);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "[\n" + v.map((x) => padIn + pyJson(x, indent + 2)).join(",\n") + "\n" + pad + "]";
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return (
    "{\n" +
    entries.map(([k, x]) => padIn + jsonString(k) + ": " + pyJson(x, indent + 2)).join(",\n") +
    "\n" +
    pad +
    "}"
  );
}

// ---------------------------------------------------------------------------
// numpy-compatible RNG: SeedSequence + PCG64 + Generator.choice(replace=False)
// Ported from numpy 2.0.2 (bit_generator.pyx, pcg64.{c,h}, distributions.c,
// _generator.pyx) so the k-means seeding matches np.random.default_rng(0)
// bit for bit.
// ---------------------------------------------------------------------------

const MASK64: bigint = (1n << 64n) - 1n;
const MASK128: bigint = (1n << 128n) - 1n;
const PCG_MULT: bigint = (2549297995355413924n << 64n) | 4865540595714422341n;

const INIT_A = 0x43b0d7e5;
const MULT_A = 0x931e8875;
const INIT_B = 0x8b51f9dd;
const MULT_B = 0x58f38ded;
const MIX_MULT_L = 0xca01f9dd;
const MIX_MULT_R = 0x4973f715;

interface HashConst {
  v: number;
}

function u32(x: number): number {
  return x >>> 0;
}

function hashmix(value: number, hc: HashConst): number {
  value = u32(value ^ hc.v);
  hc.v = u32(Math.imul(hc.v, MULT_A));
  value = u32(Math.imul(value, hc.v));
  return u32(value ^ (value >>> 16));
}

function mix(x: number, y: number): number {
  const result = u32(Math.imul(MIX_MULT_L, x) - Math.imul(MIX_MULT_R, y));
  return u32(result ^ (result >>> 16));
}

/** np.random.SeedSequence(entropy).pool for a non-negative int entropy. */
function seedSeqPool(entropy: bigint): number[] {
  // _int_to_uint32_array: lowest 32-bit words first; 0 -> [0]
  const words: number[] = [];
  if (entropy === 0n) {
    words.push(0);
  } else {
    let n = entropy;
    while (n > 0n) {
      words.push(Number(n & 0xffffffffn));
      n >>= 32n;
    }
  }
  const pool: number[] = [0, 0, 0, 0];
  const hc: HashConst = { v: INIT_A };
  for (let i = 0; i < pool.length; i++) {
    pool[i] = hashmix(i < words.length ? words[i] : 0, hc);
  }
  for (let iSrc = 0; iSrc < pool.length; iSrc++) {
    for (let iDst = 0; iDst < pool.length; iDst++) {
      if (iSrc !== iDst) {
        pool[iDst] = mix(pool[iDst], hashmix(pool[iSrc], hc));
      }
    }
  }
  for (let iSrc = pool.length; iSrc < words.length; iSrc++) {
    for (let iDst = 0; iDst < pool.length; iDst++) {
      pool[iDst] = mix(pool[iDst], hashmix(words[iSrc], hc));
    }
  }
  return pool;
}

/** SeedSequence.generate_state(nWords, uint32). */
function generateState(pool: number[], nWords: number): number[] {
  let hashConst = INIT_B;
  const state: number[] = [];
  for (let i = 0; i < nWords; i++) {
    let dataVal = pool[i % pool.length];
    dataVal = u32(dataVal ^ hashConst);
    hashConst = u32(Math.imul(hashConst, MULT_B));
    dataVal = u32(Math.imul(dataVal, hashConst));
    dataVal = u32(dataVal ^ (dataVal >>> 16));
    state.push(dataVal);
  }
  return state;
}

class Pcg64 {
  state: bigint = 0n;
  inc: bigint = 0n;
  hasUint32: boolean = false;
  uinteger: number = 0;

  constructor(seedEntropy: bigint) {
    const pool = seedSeqPool(seedEntropy);
    const w = generateState(pool, 8); // 4 uint64 words, little-endian pairing
    const u64: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      u64.push(BigInt(w[2 * i]) | (BigInt(w[2 * i + 1]) << 32n));
    }
    const initstate = (u64[0] << 64n) | u64[1];
    const initseq = (u64[2] << 64n) | u64[3];
    this.inc = ((initseq << 1n) | 1n) & MASK128;
    this.step();
    this.state = (this.state + initstate) & MASK128;
    this.step();
  }

  step(): void {
    this.state = (this.state * PCG_MULT + this.inc) & MASK128;
  }

  next64(): bigint {
    this.step();
    const hi = this.state >> 64n;
    const lo = this.state & MASK64;
    const rot = hi >> 58n;
    const val = hi ^ lo;
    if (rot === 0n) return val;
    return ((val >> rot) | (val << (64n - rot))) & MASK64;
  }

  next32(): number {
    if (this.hasUint32) {
      this.hasUint32 = false;
      return this.uinteger;
    }
    const next = this.next64();
    this.hasUint32 = true;
    this.uinteger = Number(next >> 32n);
    return Number(next & 0xffffffffn);
  }
}

function boundedLemireUint32(bg: Pcg64, rng: number): number {
  const rngExcl = u32(rng + 1);
  let m = BigInt(bg.next32()) * BigInt(rngExcl);
  let leftover = Number(m & 0xffffffffn);
  if (leftover < rngExcl) {
    const threshold = (0xffffffff - rng) % rngExcl;
    while (leftover < threshold) {
      m = BigInt(bg.next32()) * BigInt(rngExcl);
      leftover = Number(m & 0xffffffffn);
    }
  }
  return Number(m >> 32n);
}

function boundedLemireUint64(bg: Pcg64, rng: bigint): bigint {
  const rngExcl = (rng + 1n) & MASK64;
  let m = bg.next64() * rngExcl;
  let leftover = m & MASK64;
  if (leftover < rngExcl) {
    const threshold = (MASK64 - rng) % rngExcl;
    while (leftover < threshold) {
      m = bg.next64() * rngExcl;
      leftover = m & MASK64;
    }
  }
  return m >> 64n;
}

/** numpy random_bounded_uint64(off, rng, mask=0, use_masked=false). */
function randomBoundedUint64(bg: Pcg64, off: number, rng: number): number {
  if (rng === 0) return off;
  if (rng <= 0xffffffff) {
    if (rng === 0xffffffff) return off + bg.next32();
    return off + boundedLemireUint32(bg, rng);
  }
  return off + Number(boundedLemireUint64(bg, BigInt(rng)));
}

/** numpy _shuffle_int: Fisher-Yates over data[first..n-1]. */
function shuffleInt(bg: Pcg64, n: number, first: number, data: number[]): void {
  for (let i = n - 1; i >= first; i--) {
    const j = randomBoundedUint64(bg, 0, i);
    const tmp = data[j];
    data[j] = data[i];
    data[i] = tmp;
  }
}

function genMask(maxVal: number): number {
  let mask = maxVal >>> 0;
  mask |= mask >>> 1;
  mask |= mask >>> 2;
  mask |= mask >>> 4;
  mask |= mask >>> 8;
  mask |= mask >>> 16;
  return mask >>> 0;
}

/** Generator.choice(popSize, size, replace=False, shuffle=True), p=None. */
function choiceNoReplace(bg: Pcg64, popSize: number, size: number): number[] {
  const cutoff = 50; // shuffle=True heuristic from _generator.pyx
  if (popSize > 10000 && size > Math.floor(popSize / cutoff)) {
    // Tail-shuffle path
    const idx = new Array<number>(popSize);
    for (let i = 0; i < popSize; i++) idx[i] = i;
    shuffleInt(bg, popSize, Math.max(popSize - size, 1), idx);
    return idx.slice(popSize - size);
  }
  // Floyd's algorithm with a masked open-addressing hash set
  const idxOut = new Array<number>(size);
  let setSize = Math.trunc(1.2 * size); // C cast (uint64_t)(1.2 * size)
  const mask = genMask(setSize);
  setSize = 1 + mask;
  const hashSet = new Array<number>(setSize).fill(-1);
  for (let j = popSize - size; j < popSize; j++) {
    const val = randomBoundedUint64(bg, 0, j);
    let loc = val & mask;
    while (hashSet[loc] !== -1 && hashSet[loc] !== val) {
      loc = (loc + 1) & mask;
    }
    if (hashSet[loc] === -1) {
      hashSet[loc] = val;
      idxOut[j - popSize + size] = val;
    } else {
      loc = j & mask;
      while (hashSet[loc] !== -1) {
        loc = (loc + 1) & mask;
      }
      hashSet[loc] = j;
      idxOut[j - popSize + size] = j;
    }
  }
  shuffleInt(bg, size, 1, idxOut);
  return idxOut;
}

// ---------------------------------------------------------------------------
// numpy-compatible argsort (introsort from npysort/quicksort.cpp), needed so
// counts.argsort() tie order matches numpy exactly.
// ---------------------------------------------------------------------------

function npyGetMsb(n: number): number {
  let depth = 0;
  let unum = n >>> 1;
  while (unum) {
    depth++;
    unum >>>= 1;
  }
  return depth;
}

function aheapsortArg(v: ArrayLike<number>, tosort: number[], offset: number, n: number): void {
  // 1-based indexing into tosort[offset - 1 + i], mirroring the C code
  for (let l = n >> 1; l > 0; l--) {
    const tmp = tosort[offset + l - 1];
    let i = l;
    let j = l << 1;
    while (j <= n) {
      if (j < n && v[tosort[offset + j - 1]] < v[tosort[offset + j]]) j++;
      if (v[tmp] < v[tosort[offset + j - 1]]) {
        tosort[offset + i - 1] = tosort[offset + j - 1];
        i = j;
        j += j;
      } else {
        break;
      }
    }
    tosort[offset + i - 1] = tmp;
  }
  for (; n > 1; ) {
    const tmp = tosort[offset + n - 1];
    tosort[offset + n - 1] = tosort[offset];
    n -= 1;
    let i = 1;
    let j = 2;
    while (j <= n) {
      if (j < n && v[tosort[offset + j - 1]] < v[tosort[offset + j]]) j++;
      if (v[tmp] < v[tosort[offset + j - 1]]) {
        tosort[offset + i - 1] = tosort[offset + j - 1];
        i = j;
        j += j;
      } else {
        break;
      }
    }
    tosort[offset + i - 1] = tmp;
  }
}

/** numpy ndarray.argsort(kind="quicksort") for an integer array. */
function argsortNumpy(v: ArrayLike<number>): number[] {
  const num = v.length;
  const tosort: number[] = new Array(num);
  for (let i = 0; i < num; i++) tosort[i] = i;
  if (num < 2) return tosort;
  const SMALL_QUICKSORT = 15;
  let pl = 0;
  let pr = num - 1;
  const stack: number[] = [];
  const depthStack: number[] = [];
  let cdepth = npyGetMsb(num) * 2;
  const swap = (a: number, b: number): void => {
    const t = tosort[a];
    tosort[a] = tosort[b];
    tosort[b] = t;
  };
  for (;;) {
    if (cdepth < 0) {
      aheapsortArg(v, tosort, pl, pr - pl + 1);
      if (stack.length === 0) break;
      pr = stack.pop() as number;
      pl = stack.pop() as number;
      cdepth = depthStack.pop() as number;
      continue;
    }
    while (pr - pl > SMALL_QUICKSORT) {
      const pm = pl + ((pr - pl) >> 1);
      if (v[tosort[pm]] < v[tosort[pl]]) swap(pm, pl);
      if (v[tosort[pr]] < v[tosort[pm]]) swap(pr, pm);
      if (v[tosort[pm]] < v[tosort[pl]]) swap(pm, pl);
      const vp = v[tosort[pm]];
      let pi = pl;
      let pj = pr - 1;
      swap(pm, pj);
      for (;;) {
        do {
          pi++;
        } while (v[tosort[pi]] < vp);
        do {
          pj--;
        } while (vp < v[tosort[pj]]);
        if (pi >= pj) break;
        swap(pi, pj);
      }
      swap(pi, pr - 1);
      if (pi - pl < pr - pi) {
        stack.push(pi + 1, pr);
        pr = pi - 1;
      } else {
        stack.push(pl, pi - 1);
        pl = pi + 1;
      }
      depthStack.push(--cdepth);
    }
    for (let pi = pl + 1; pi <= pr; pi++) {
      const vi = tosort[pi];
      const vp = v[vi];
      let pj = pi;
      let pk = pi - 1;
      while (pj > pl && vp < v[tosort[pk]]) {
        tosort[pj--] = tosort[pk--];
      }
      tosort[pj] = vi;
    }
    if (stack.length === 0) break;
    pr = stack.pop() as number;
    pl = stack.pop() as number;
    cdepth = depthStack.pop() as number;
  }
  return tosort;
}

// ---------------------------------------------------------------------------
// Image loading (Pillow convert("RGB") equivalent, PNG + JPEG)
// ---------------------------------------------------------------------------

interface RgbImage {
  width: number;
  height: number;
  data: Uint8Array; // row-major RGB
  pad: [number, number, number]; // Pillow's raw-0 fill for out-of-bounds crops
}

/** Raised when the image cannot be read/decoded; message mirrors Pillow's. */
class ImageOpenError extends Error {}

function openImage(path: string): RgbImage {
  let buf: Buffer;
  try {
    buf = readFileSync(path);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new ImageOpenError(`[Errno 2] No such file or directory: ${pyRepr(path)}`);
    if (code === "EACCES") throw new ImageOpenError(`[Errno 13] Permission denied: ${pyRepr(path)}`);
    if (code === "EISDIR") throw new ImageOpenError(`[Errno 21] Is a directory: ${pyRepr(path)}`);
    throw new ImageOpenError(String((e as Error).message));
  }
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (isPng(bytes)) {
    try {
      const png = decodePng(bytes);
      return { width: png.width, height: png.height, data: png.rgb, pad: png.pad };
    } catch (e) {
      if (e instanceof PngDecodeError) {
        // Header-phase corruption fails Pillow's Image.open() itself, which
        // reports "cannot identify image file"; decode-phase errors keep the
        // decoder's own message.
        throw new ImageOpenError(e.headerPhase ? `cannot identify image file ${pyRepr(path)}` : e.message);
      }
      if (e instanceof PngUnsupportedError) {
        throw new ImageOpenError(e.message);
      }
      throw e;
    }
  }
  if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    try {
      const jpg = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: false }) as {
        width: number;
        height: number;
        data: Uint8Array;
      };
      return { width: jpg.width, height: jpg.height, data: jpg.data, pad: [0, 0, 0] };
    } catch (e) {
      throw new ImageOpenError(String((e as Error).message));
    }
  }
  // Formats Pillow would open but this port does not ship a decoder for.
  const ascii = String.fromCharCode(...bytes.subarray(0, Math.min(12, bytes.length)));
  if (
    ascii.startsWith("GIF8") ||
    ascii.startsWith("BM") ||
    ascii.startsWith("II*\x00") ||
    ascii.startsWith("MM\x00*") ||
    (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")
  ) {
    throw new ImageOpenError("unsupported image format (this port decodes PNG and JPEG only)");
  }
  throw new ImageOpenError(`cannot identify image file ${pyRepr(path)}`);
}

/** Pillow-style crop: box may extend beyond the image; padding is `pad`. */
function cropImage(img: RgbImage, left: number, upper: number, right: number, lower: number): RgbImage {
  if (right < left) throw new Error("Coordinate 'right' is less than 'left'");
  if (lower < upper) throw new Error("Coordinate 'lower' is less than 'upper'");
  const w = right - left;
  const h = lower - upper;
  const out = new Uint8Array(w * h * 3);
  const [pr, pg, pb] = img.pad;
  for (let y = 0; y < h; y++) {
    const sy = upper + y;
    for (let x = 0; x < w; x++) {
      const sx = left + x;
      const d = (y * w + x) * 3;
      if (sx >= 0 && sx < img.width && sy >= 0 && sy < img.height) {
        const s = (sy * img.width + sx) * 3;
        out[d] = img.data[s];
        out[d + 1] = img.data[s + 1];
        out[d + 2] = img.data[s + 2];
      } else {
        out[d] = pr;
        out[d + 1] = pg;
        out[d + 2] = pb;
      }
    }
  }
  return { width: w, height: h, data: out, pad: img.pad };
}

// ---------------------------------------------------------------------------
// k-means (exact port of _kmeans + palette from sample_colors.py)
// ---------------------------------------------------------------------------

interface KmeansResult {
  centroids: Float64Array; // numCentroids * 3
  counts: number[];
}

function kmeans(pixels: Float64Array, n: number, k: number): KmeansResult {
  const iters = 25;
  const bg = new Pcg64(0n); // seed=0, matching np.random.default_rng(seed)
  const size = Math.min(k, n);
  if (size === 0) {
    // The Python original crashes here (d.argmin on an empty pixel array);
    // mirror the uncaught-exception behavior: message on stderr, exit 1.
    process.stderr.write("ValueError: attempt to get argmin of an empty sequence\n");
    process.exit(1);
  }
  const idx = choiceNoReplace(bg, n, size);
  const centroids = new Float64Array(size * 3);
  for (let c = 0; c < size; c++) {
    const p = idx[c] * 3;
    centroids[c * 3] = pixels[p];
    centroids[c * 3 + 1] = pixels[p + 1];
    centroids[c * 3 + 2] = pixels[p + 2];
  }
  let labels = new Int32Array(n);
  const sums = new Float64Array(size * 3);
  const memberCounts = new Int32Array(size);
  for (let iter = 0; iter < iters; iter++) {
    // assign: argmin over sqrt((dx^2+dy^2)+dz^2), first index wins ties
    const newLabels = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const px = pixels[i * 3];
      const py = pixels[i * 3 + 1];
      const pz = pixels[i * 3 + 2];
      let best = Infinity;
      let arg = 0;
      for (let c = 0; c < size; c++) {
        const dx = px - centroids[c * 3];
        const dy = py - centroids[c * 3 + 1];
        const dz = pz - centroids[c * 3 + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < best) {
          best = d;
          arg = c;
        }
      }
      newLabels[i] = arg;
    }
    let equal = true;
    for (let i = 0; i < n; i++) {
      if (newLabels[i] !== labels[i]) {
        equal = false;
        break;
      }
    }
    if (equal && iter > 0) {
      labels = newLabels;
      break;
    }
    labels = newLabels;
    // update: per-cluster mean, accumulated in pixel-index order (numpy order)
    sums.fill(0);
    memberCounts.fill(0);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      sums[c * 3] += pixels[i * 3];
      sums[c * 3 + 1] += pixels[i * 3 + 1];
      sums[c * 3 + 2] += pixels[i * 3 + 2];
      memberCounts[c]++;
    }
    for (let c = 0; c < size; c++) {
      const m = memberCounts[c];
      if (m > 0) {
        centroids[c * 3] = sums[c * 3] / m;
        centroids[c * 3 + 1] = sums[c * 3 + 1] / m;
        centroids[c * 3 + 2] = sums[c * 3 + 2] / m;
      }
    }
  }
  const counts = new Array<number>(size).fill(0);
  for (let i = 0; i < n; i++) counts[labels[i]]++;
  return { centroids, counts };
}

interface ColorRecord {
  [key: string]: unknown;
  hex: string;
  colorSpace: string;
  components: F[];
  rgb255: number[];
}

function toRecord(r0: number, g0: number, b0: number): ColorRecord {
  const r = pyRoundInt(r0);
  const g = pyRoundInt(g0);
  const b = pyRoundInt(b0);
  const hex = "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0");
  return {
    hex,
    colorSpace: "srgb",
    components: [new F(pyRound(r / 255, 4)), new F(pyRound(g / 255, 4)), new F(pyRound(b / 255, 4))],
    rgb255: [r, g, b],
  };
}

function paletteOf(img: RgbImage, k: number): ColorRecord[] {
  const total0 = img.width * img.height;
  let m = total0;
  let step = 1;
  if (total0 > 60000) {
    step = Math.floor(total0 / 60000);
    m = Math.ceil(total0 / step);
  }
  const pixels = new Float64Array(m * 3);
  for (let i = 0; i < m; i++) {
    const s = i * step * 3;
    pixels[i * 3] = img.data[s];
    pixels[i * 3 + 1] = img.data[s + 1];
    pixels[i * 3 + 2] = img.data[s + 2];
  }
  const { centroids, counts } = kmeans(pixels, m, k);
  let total = 0;
  for (const c of counts) total += c;
  const order = argsortNumpy(counts).reverse();
  const byHex = new Map<string, ColorRecord>();
  const out: ColorRecord[] = [];
  for (const i of order) {
    if (counts[i] === 0) continue;
    const rec = toRecord(centroids[i * 3], centroids[i * 3 + 1], centroids[i * 3 + 2]);
    const cov = counts[i] / total;
    const prev = byHex.get(rec.hex);
    if (prev !== undefined) {
      prev.coverage = new F(npRound4((prev.coverage as F).v + cov));
    } else {
      rec.coverage = new F(npRound4(cov));
      byHex.set(rec.hex, rec);
      out.push(rec);
    }
  }
  out.sort((a, b) => (b.coverage as F).v - (a.coverage as F).v); // stable, desc
  return out;
}

function pointsOf(img: RgbImage, pts: Array<[number, number]>): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const [x, y] of pts) {
    if (!(x >= 0 && x < img.width && y >= 0 && y < img.height)) {
      out.push({ point: [x, y], error: "out of bounds" });
      continue;
    }
    const s = (y * img.width + x) * 3;
    const rec = toRecord(img.data[s], img.data[s + 1], img.data[s + 2]);
    rec.point = [x, y];
    out.push(rec);
  }
  return out;
}

/** WCAG relative luminance from an 8-bit sRGB triple (gamma-expanded). */
function relativeLuminance(rgb255: number[]): number {
  const lin = (v: number): number => {
    const c = v / 255.0;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb255[0]) + 0.7152 * lin(rgb255[1]) + 0.0722 * lin(rgb255[2]);
}

type RegionSpec = [string, number, number, number, number];

function regionsOf(img: RgbImage, specs: RegionSpec[], k: number): Array<Record<string, unknown>> {
  const w = img.width;
  const h = img.height;
  const valid: Array<Record<string, unknown>> = [];
  const errs: Array<Record<string, unknown>> = [];
  for (const [name, x, y, rw, rh] of specs) {
    if (rw <= 0 || rh <= 0 || x < 0 || y < 0 || x + rw > w || y + rh > h) {
      errs.push({ region: name, rect: [x, y, rw, rh], error: "out of bounds" });
      continue;
    }
    const crop = cropImage(img, x, y, x + rw, y + rh);
    const bg = paletteOf(crop, k)[0]; // highest-coverage cluster = background
    const rec: Record<string, unknown> = { region: name, rect: [x, y, rw, rh] };
    Object.assign(rec, bg);
    rec.luminance = new F(pyRound(relativeLuminance(bg.rgb255), 4));
    valid.push(rec);
  }
  valid.sort((a, b) => (a.luminance as F).v - (b.luminance as F).v); // stable asc
  for (let i = 0; i < valid.length; i++) {
    valid[i].rank = i; // 0 = darkest = surface.base
  }
  return valid.concat(errs);
}

// ---------------------------------------------------------------------------
// CLI (argparse-compatible: same messages and exit codes, CPython 3.9 wording)
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "sample_colors.ts");

function usageText(): string {
  const pad = " ".repeat(7 + PROG.length + 1);
  return (
    `usage: ${PROG} [-h] [--k K] [--points [POINTS ...]] [--crop CROP]\n` +
    `${pad}[--regions [REGIONS ...]] [--json]\n` +
    `${pad}image`
  );
}

function helpText(): string {
  return (
    usageText() +
    `

positional arguments:
  image

optional arguments:
  -h, --help            show this help message and exit
  --k K                 number of palette colors
  --points [POINTS ...]
                        x,y coords to sample
  --crop CROP           x,y,w,h crop before palette extraction
  --regions [REGIONS ...]
                        name=x,y,w,h rects; ranks region backgrounds by
                        luminance
  --json`
  );
}

function argError(msg: string): never {
  process.stderr.write(usageText() + "\n");
  process.stderr.write(`${PROG}: error: ${msg}\n`);
  process.exit(2);
}

/** sys.exit(message) equivalent: message on stderr, exit code 1. */
function exitErr(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(1);
}

/** Python int() (base 10): optional sign, underscores between digits. */
function parsePyInt(s: string): number | null {
  const t = s.trim();
  if (!/^[+-]?\d(?:_?\d)*$/.test(t)) return null;
  return parseInt(t.replace(/_/g, ""), 10);
}

interface ParsedArgs {
  image: string;
  k: number;
  points: string[];
  crop: string | null;
  regions: string[];
  json: boolean;
}

const NEGATIVE_NUMBER_RE = /^-\d+$|^-\d*\.\d+$/;

function looksLikeOption(token: string): boolean {
  return token.length > 1 && token.startsWith("-") && !NEGATIVE_NUMBER_RE.test(token);
}

function parseArgs(argv: string[]): ParsedArgs {
  const optionNames = ["--help", "--k", "--points", "--crop", "--regions", "--json"];
  const args: ParsedArgs = { image: "", k: 8, points: [], crop: null, regions: [], json: false };
  const positionals: Array<{ idx: number; token: string }> = [];
  const extras: Array<{ idx: number; token: string }> = [];
  let onlyPositionals = false;
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (onlyPositionals || !looksLikeOption(token)) {
      if (token === "--" && !onlyPositionals) {
        onlyPositionals = true;
        i++;
        continue;
      }
      positionals.push({ idx: i, token });
      i++;
      continue;
    }
    if (token === "--" ) {
      onlyPositionals = true;
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
    let resolved: string | null = null;
    if (name === "-h") {
      resolved = "--help";
    } else if (token.startsWith("--")) {
      const matches = optionNames.filter((o) => o === name || o.startsWith(name));
      const exact = optionNames.find((o) => o === name);
      if (exact !== undefined) {
        resolved = exact;
      } else if (matches.length === 1) {
        resolved = matches[0];
      } else if (matches.length > 1) {
        argError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      }
    }
    if (resolved === null) {
      extras.push({ idx: i, token });
      i++;
      continue;
    }
    i++;
    switch (resolved) {
      case "--help":
        process.stdout.write(helpText() + "\n");
        process.exit(0);
        break;
      case "--json":
        if (explicit !== null) argError(`argument --json: ignored explicit argument ${pyRepr(explicit)}`);
        args.json = true;
        break;
      case "--k":
      case "--crop": {
        let value: string;
        if (explicit !== null) {
          value = explicit;
        } else if (i < argv.length && !looksLikeOption(argv[i])) {
          value = argv[i];
          i++;
        } else {
          argError(`argument ${resolved}: expected one argument`);
        }
        if (resolved === "--k") {
          const parsed = parsePyInt(value);
          if (parsed === null) argError(`argument --k: invalid int value: ${pyRepr(value)}`);
          args.k = parsed;
        } else {
          args.crop = value;
        }
        break;
      }
      default: {
        // --points / --regions, nargs="*"
        const list: string[] = [];
        if (explicit !== null) {
          list.push(explicit);
        } else {
          while (i < argv.length && !looksLikeOption(argv[i]) && argv[i] !== "--") {
            list.push(argv[i]);
            i++;
          }
        }
        if (resolved === "--points") args.points = list;
        else args.regions = list;
        break;
      }
    }
  }
  if (positionals.length === 0) {
    argError("the following arguments are required: image");
  }
  args.image = positionals[0].token;
  // argparse reports leftovers in original argv order
  const leftover = positionals
    .slice(1)
    .concat(extras)
    .sort((a, b) => a.idx - b.idx)
    .map((e) => e.token);
  if (leftover.length > 0) {
    argError(`unrecognized arguments: ${leftover.join(" ")}`);
  }
  return args;
}

/** Parse a comma-separated int tuple, or exit with a clear message. */
function ints(s: string, n: number, what: string): number[] {
  const parts = s.split(",");
  const vals: number[] = [];
  for (const p of parts) {
    const v = parsePyInt(p);
    if (v === null) {
      exitErr(`error: ${what} expects ${n} integers like 'a,b,...', got ${pyRepr(s)}`);
    }
    vals.push(v);
  }
  if (vals.length !== n) {
    exitErr(`error: ${what} expects ${n} integers, got ${vals.length} in ${pyRepr(s)}`);
  }
  return vals;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  let img: RgbImage;
  try {
    img = openImage(args.image);
  } catch (e) {
    if (e instanceof ImageOpenError) {
      exitErr(`error: cannot open image ${pyRepr(args.image)}: ${e.message}`);
    }
    throw e;
  }

  let imgForPalette = img;
  if (args.crop !== null && args.crop !== "") {
    const [x, y, w, h] = ints(args.crop, 4, "--crop x,y,w,h");
    imgForPalette = cropImage(img, x, y, x + w, y + h);
  }

  const result: Record<string, unknown> = { image: args.image, size: [img.width, img.height] };
  if (args.k > 0) {
    result.palette = paletteOf(imgForPalette, args.k);
  }
  if (args.points.length > 0) {
    const pts = args.points.map((p) => {
      const [x, y] = ints(p, 2, "--points x,y");
      return [x, y] as [number, number];
    });
    result.points = pointsOf(img, pts);
  }
  if (args.regions.length > 0) {
    const rk = args.k > 0 ? args.k : 5;
    const specs: RegionSpec[] = [];
    for (const r of args.regions) {
      const eq = r.indexOf("=");
      const name = eq >= 0 ? r.slice(0, eq) : r;
      if (eq < 0 || name === "") {
        exitErr(`error: --regions expects name=x,y,w,h, got ${pyRepr(r)}`);
      }
      const rect = r.slice(eq + 1);
      const [x, y, w, h] = ints(rect, 4, "--regions name=x,y,w,h");
      specs.push([name, x, y, w, h]);
    }
    result.regions = regionsOf(img, specs, rk);
  }

  const lines: string[] = [];
  if (args.json) {
    lines.push(pyJson(result));
  } else {
    lines.push(`# ${args.image}  (${img.width}x${img.height})`);
    if ("palette" in result) {
      lines.push("");
      lines.push("Palette (by coverage):");
      for (const c of result.palette as ColorRecord[]) {
        const cov = (c.coverage as F).v * 100;
        const comps = (c.components as F[]).map((f) => floatRepr(f.v)).join(", ");
        lines.push(`  ${c.hex}  cov=${pyFixed(cov, 1).padStart(5)}%  srgb=[${comps}]`);
      }
    }
    if ("points" in result) {
      lines.push("");
      lines.push("Sampled points:");
      for (const c of result.points as Array<Record<string, unknown>>) {
        const pt = c.point as number[];
        if ("error" in c) {
          lines.push(`  [${pt.join(", ")}]: ${c.error}`);
        } else {
          const comps = (c.components as F[]).map((f) => floatRepr(f.v)).join(", ");
          lines.push(`  (${pt.join(", ")}): ${c.hex}  srgb=[${comps}]`);
        }
      }
    }
    if ("regions" in result) {
      lines.push("");
      lines.push("Regions (by luminance, darkest first = surface.base):");
      for (const c of result.regions as Array<Record<string, unknown>>) {
        const rect = c.rect as number[];
        if ("error" in c) {
          lines.push(`  ${c.region}: ${c.error}  rect=[${rect.join(", ")}]`);
        } else {
          const cov = (c.coverage as F).v * 100;
          lines.push(
            `  #${c.rank} ${(c.region as string).padEnd(14)} ${c.hex}  ` +
              `lum=${pyFixed((c.luminance as F).v, 4)}  cov=${pyFixed(cov, 1).padStart(5)}%`,
          );
        }
      }
    }
  }
  process.stdout.write(lines.join("\n") + "\n");
}

main();
