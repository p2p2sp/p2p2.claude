/*
 * png-decode.test.ts - full functional coverage of the vendored, from-scratch
 * PNG decoder (superui/scripts/vendor/png-decode.ts): the documented
 * color-type x bit-depth support matrix, all five row filters, and the
 * documented error contract (PngDecodeError / PngUnsupportedError).
 *
 * decodePng/isPng are plain library functions over an in-memory Uint8Array -
 * no file I/O, no CLI - so every fixture here is a hand-built PNG buffer
 * assembled chunk-by-chunk (signature, IHDR, optional PLTE/tRNS, IDAT, IEND)
 * and decoded in-process; nothing is imported from the module under test
 * beyond decodePng/isPng/PngDecodeError/PngUnsupportedError themselves. The
 * row-filter encoder below (`applyFilter`) is written independently from the
 * PNG spec (the arithmetic inverse of png-decode's own `unfilter`), so a
 * round trip through it genuinely proves `unfilter` reconstructs the chosen
 * ground-truth pixel values rather than merely mirroring the source.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/png-decode.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, crc32 } from "node:zlib";

import { decodePng, isPng, PngDecodeError, PngUnsupportedError } from "../../superui/scripts/vendor/png-decode.ts";
import { writePng } from "../harness/png.ts";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer, opts: { badCrc?: boolean } = {}): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const computed = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  crcBuf.writeUInt32BE(opts.badCrc ? (computed ^ 0xffffffff) >>> 0 : computed, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function ihdrData(width: number, height: number, bitDepth: number, colorType: number, interlace = 0): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;
  data[9] = colorType;
  data[10] = 0; // compression method
  data[11] = 0; // filter method
  data[12] = interlace;
  return data;
}

function ihdrChunk(width: number, height: number, bitDepth: number, colorType: number, interlace = 0): Buffer {
  return chunk("IHDR", ihdrData(width, height, bitDepth, colorType, interlace));
}

/** Packs one scanline of raw (unfiltered), single-channel samples for
 *  depth < 8 (grayscale or palette index) - the inverse of png-decode's
 *  `unpackBits`. */
function packSubByteRow(values: number[], bitDepth: number): Buffer {
  const perByte = 8 / bitDepth;
  const rowBytes = Math.ceil(values.length / perByte);
  const out = Buffer.alloc(rowBytes);
  const mask = (1 << bitDepth) - 1;
  for (let x = 0; x < values.length; x++) {
    const shift = 8 - bitDepth * ((x % perByte) + 1);
    out[Math.floor(x / perByte)] |= (values[x] & mask) << shift;
  }
  return out;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Encode-side PNG row filters (None/Sub/Up/Average/Paeth), applying ONE
 *  filter type uniformly to every row of raw (unfiltered) sample bytes -
 *  written independently from the PNG spec, the inverse of `unfilter`. */
function applyFilter(rows: Buffer[], bpp: number, filterType: number): Buffer {
  const rowBytes = rows[0].length;
  const out = Buffer.alloc((rowBytes + 1) * rows.length);
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    const prev = y > 0 ? rows[y - 1] : null;
    out[y * (rowBytes + 1)] = filterType;
    for (let x = 0; x < rowBytes; x++) {
      const raw = row[x];
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let filt: number;
      switch (filterType) {
        case 0:
          filt = raw;
          break;
        case 1:
          filt = (raw - a) & 0xff;
          break;
        case 2:
          filt = (raw - b) & 0xff;
          break;
        case 3:
          filt = (raw - ((a + b) >> 1)) & 0xff;
          break;
        case 4:
          filt = (raw - paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`unknown filter type ${filterType}`);
      }
      out[y * (rowBytes + 1) + 1 + x] = filt;
    }
  }
  return out;
}

interface BuildOpts {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  /** Raw (unfiltered) sample bytes, one Buffer per row, each `rowBytes` long. */
  rows: Buffer[];
  bpp: number;
  filterType?: number;
  palette?: Buffer;
  trns?: Buffer;
}

function buildPng(opts: BuildOpts): Buffer {
  const parts: Buffer[] = [PNG_SIGNATURE, ihdrChunk(opts.width, opts.height, opts.bitDepth, opts.colorType)];
  if (opts.palette) parts.push(chunk("PLTE", opts.palette));
  if (opts.trns) parts.push(chunk("tRNS", opts.trns));
  const raw = applyFilter(opts.rows, opts.bpp, opts.filterType ?? 0);
  parts.push(chunk("IDAT", deflateSync(raw)));
  parts.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function rgbArray(buf: Uint8Array): number[] {
  return Array.from(buf);
}

// ---------------------------------------------------------------------------
// color-type x bit-depth support matrix
// ---------------------------------------------------------------------------

test("color type 0 (grayscale) depth 1: values scale x255", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 1,
    colorType: 0,
    bpp: 1,
    rows: [packSubByteRow([0, 1], 1)],
  });
  const decoded = decodePng(png);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 1);
  assert.deepEqual(rgbArray(decoded.rgb), [0, 0, 0, 255, 255, 255]);
});

test("color type 0 (grayscale) depth 2: values scale x85", () => {
  const png = buildPng({
    width: 4,
    height: 1,
    bitDepth: 2,
    colorType: 0,
    bpp: 1,
    rows: [packSubByteRow([0, 1, 2, 3], 2)],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [0, 0, 0, 85, 85, 85, 170, 170, 170, 255, 255, 255]);
});

test("color type 0 (grayscale) depth 4: values scale x17", () => {
  const values = Array.from({ length: 16 }, (_, i) => i);
  const png = buildPng({
    width: 16,
    height: 1,
    bitDepth: 4,
    colorType: 0,
    bpp: 1,
    rows: [packSubByteRow(values, 4)],
  });
  const decoded = decodePng(png);
  const expected: number[] = [];
  for (const v of values) {
    const g = v * 17;
    expected.push(g, g, g);
  }
  assert.deepEqual(rgbArray(decoded.rgb), expected);
});

test("color type 0 (grayscale) depth 8: values pass through unchanged", () => {
  const png = buildPng({
    width: 4,
    height: 1,
    bitDepth: 8,
    colorType: 0,
    bpp: 1,
    rows: [Buffer.from([0, 64, 128, 255])],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [0, 0, 0, 64, 64, 64, 128, 128, 128, 255, 255, 255]);
});

test("color type 0 (grayscale) depth 16: 16-bit value clamps to 255 when it exceeds it, else passes the low byte through", () => {
  // Each pair is (highByte, lowByte) of one big-endian 16-bit sample.
  const row = Buffer.from([0x00, 0x00, 0x00, 0xff, 0x01, 0x00, 0x00, 0x80]);
  const png = buildPng({
    width: 4,
    height: 1,
    bitDepth: 16,
    colorType: 0,
    bpp: 2,
    rows: [row],
  });
  const decoded = decodePng(png);
  // 0 -> 0; 255 -> 255; 256 (0x0100) clamps to 255; 128 -> 128.
  assert.deepEqual(rgbArray(decoded.rgb), [0, 0, 0, 255, 255, 255, 255, 255, 255, 128, 128, 128]);
});

test("color type 2 (RGB) depth 8: channels pass through unchanged", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 8,
    colorType: 2,
    bpp: 3,
    rows: [Buffer.from([10, 20, 30, 200, 150, 100])],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [10, 20, 30, 200, 150, 100]);
});

test("color type 2 (RGB) depth 16: only the HIGH byte of each 16-bit channel is kept", () => {
  const row = Buffer.from([
    0x12, 0x99, 0x34, 0x11, 0x56, 0x00, // pixel 0: R,G,B high/low pairs
    0xab, 0x01, 0xcd, 0x02, 0xef, 0x03, // pixel 1
  ]);
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 16,
    colorType: 2,
    bpp: 6,
    rows: [row],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [0x12, 0x34, 0x56, 0xab, 0xcd, 0xef]);
});

test("color type 3 (palette) depth 1: two-entry palette", () => {
  const palette = Buffer.from([10, 20, 30, 200, 210, 220]);
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 1,
    colorType: 3,
    bpp: 1,
    palette,
    rows: [packSubByteRow([0, 1], 1)],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [10, 20, 30, 200, 210, 220]);
});

test("color type 3 (palette) depth 2: four-entry palette", () => {
  const palette = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const png = buildPng({
    width: 4,
    height: 1,
    bitDepth: 2,
    colorType: 3,
    bpp: 1,
    palette,
    rows: [packSubByteRow([0, 1, 2, 3], 2)],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("color type 3 (palette) depth 4: an index past the end of a short palette maps to black", () => {
  const palette = Buffer.from([50, 60, 70]); // one entry only
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 4,
    colorType: 3,
    bpp: 1,
    palette,
    rows: [packSubByteRow([0, 5], 4)], // index 5 is out of range
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [50, 60, 70, 0, 0, 0]);
});

test("color type 3 (palette) depth 8: a tRNS chunk is ignored (transparency never affects the decoded RGB)", () => {
  const palette = Buffer.from([50, 60, 70, 80, 90, 100]);
  const trns = Buffer.from([0, 128]); // per-entry alpha - must be ignored entirely
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 8,
    colorType: 3,
    bpp: 1,
    palette,
    trns,
    rows: [Buffer.from([0, 1])],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [50, 60, 70, 80, 90, 100]);
});

test("color type 4 (gray+alpha) depth 8: alpha is dropped regardless of its value", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 8,
    colorType: 4,
    bpp: 2,
    rows: [Buffer.from([100, 0, 200, 255])], // (gray,alpha) pairs
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [100, 100, 100, 200, 200, 200]);
});

test("color type 4 (gray+alpha) depth 16: the high byte of the gray channel is kept, alpha dropped", () => {
  const row = Buffer.from([0x30, 0xff, 0x00, 0x00, 0x7f, 0x01, 0xff, 0xff]); // (grayHi,grayLo,alphaHi,alphaLo) x2
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 16,
    colorType: 4,
    bpp: 4,
    rows: [row],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [0x30, 0x30, 0x30, 0x7f, 0x7f, 0x7f]);
});

test("color type 6 (RGBA) depth 8: alpha is dropped regardless of its value", () => {
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 8,
    colorType: 6,
    bpp: 4,
    rows: [Buffer.from([10, 20, 30, 0, 200, 210, 220, 255])],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [10, 20, 30, 200, 210, 220]);
});

test("color type 6 (RGBA) depth 16: only the HIGH byte of each 16-bit channel is kept, alpha dropped", () => {
  const row = Buffer.from([
    0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // pixel 0: R,G,B,A high/low pairs
    0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, // pixel 1
  ]);
  const png = buildPng({
    width: 2,
    height: 1,
    bitDepth: 16,
    colorType: 6,
    bpp: 8,
    rows: [row],
  });
  const decoded = decodePng(png);
  assert.deepEqual(rgbArray(decoded.rgb), [0x11, 0x33, 0x55, 0x99, 0xbb, 0xdd]);
});

test("a PNG built with the harness's own writePng (RGBA depth 8) round-trips through decodePng", () => {
  const rgba = new Uint8Array([1, 2, 3, 0, 4, 5, 6, 128, 7, 8, 9, 255, 10, 11, 12, 64]);
  const png = writePng(2, 2, rgba);
  const decoded = decodePng(png);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 2);
  assert.deepEqual(rgbArray(decoded.rgb), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

// ---------------------------------------------------------------------------
// all five row filter types
// ---------------------------------------------------------------------------

const FILTER_NAMES = ["None", "Sub", "Up", "Average", "Paeth"];
const FILTER_FIXTURE_ROWS = [
  [10, 20, 30, 40],
  [15, 25, 200, 45],
  [5, 250, 60, 90],
];

for (let filterType = 0; filterType < 5; filterType++) {
  test(`filter type ${filterType} (${FILTER_NAMES[filterType]}) round-trips the ground-truth pixel matrix`, () => {
    const rows = FILTER_FIXTURE_ROWS.map((r) => Buffer.from(r));
    const png = buildPng({
      width: 4,
      height: 3,
      bitDepth: 8,
      colorType: 0,
      bpp: 1,
      filterType,
      rows,
    });
    const decoded = decodePng(png);
    const expected: number[] = [];
    for (const row of FILTER_FIXTURE_ROWS) {
      for (const v of row) expected.push(v, v, v);
    }
    assert.deepEqual(rgbArray(decoded.rgb), expected);
  });
}

// ---------------------------------------------------------------------------
// edge cases
// ---------------------------------------------------------------------------

test("a 1x1 image decodes correctly", () => {
  const png = buildPng({
    width: 1,
    height: 1,
    bitDepth: 8,
    colorType: 2,
    bpp: 3,
    rows: [Buffer.from([50, 100, 150])],
  });
  const decoded = decodePng(png);
  assert.equal(decoded.width, 1);
  assert.equal(decoded.height, 1);
  assert.deepEqual(rgbArray(decoded.rgb), [50, 100, 150]);
});

test("a grayscale depth-1 image with an odd width packs the last byte's padding bits correctly", () => {
  const values = [1, 0, 1, 0, 1, 0, 1, 0, 1]; // width 9 - not a multiple of 8
  const png = buildPng({
    width: 9,
    height: 1,
    bitDepth: 1,
    colorType: 0,
    bpp: 1,
    rows: [packSubByteRow(values, 1)],
  });
  const decoded = decodePng(png);
  assert.equal(decoded.width, 9);
  const expected: number[] = [];
  for (const v of values) {
    const g = v * 255;
    expected.push(g, g, g);
  }
  assert.deepEqual(rgbArray(decoded.rgb), expected);
});

// ---------------------------------------------------------------------------
// error contract
// ---------------------------------------------------------------------------

test("isPng rejects a buffer shorter than the signature", () => {
  assert.equal(isPng(Buffer.alloc(0)), false);
  assert.equal(isPng(Buffer.from([0x89, 0x50, 0x4e])), false);
});

test("isPng rejects a buffer with the wrong signature bytes", () => {
  assert.equal(isPng(Buffer.from("not a png at all!!")), false);
});

test("isPng accepts a well-formed PNG buffer", () => {
  const png = buildPng({ width: 1, height: 1, bitDepth: 8, colorType: 0, bpp: 1, rows: [Buffer.from([0])] });
  assert.equal(isPng(png), true);
});

test("decodePng on an empty buffer raises PngDecodeError, header phase", () => {
  assert.throws(
    () => decodePng(Buffer.alloc(0)),
    (err: unknown) => {
      assert.ok(err instanceof PngDecodeError);
      assert.equal(err.headerPhase, true);
      assert.match(err.message, /not a PNG file/);
      return true;
    },
  );
});

test("decodePng on a non-PNG buffer raises PngDecodeError, header phase", () => {
  assert.throws(
    () => decodePng(Buffer.from("this is definitely not a png buffer")),
    (err: unknown) => err instanceof PngDecodeError && err.headerPhase === true,
  );
});

test("an interlaced image raises PngUnsupportedError explicitly rather than decoding wrongly", () => {
  const png = Buffer.concat([PNG_SIGNATURE, ihdrChunk(2, 2, 8, 0, 1)]);
  assert.throws(
    () => decodePng(png),
    (err: unknown) => {
      assert.ok(err instanceof PngUnsupportedError);
      assert.match(err.message, /interlaced/);
      return true;
    },
  );
});

test("a truncated IDAT stream raises PngDecodeError naming the truncation", () => {
  const rows = [Buffer.from([10, 20, 30, 40]), Buffer.from([50, 60, 70, 80])];
  const fullRaw = applyFilter(rows, 1, 0);
  const truncatedRaw = fullRaw.subarray(0, fullRaw.length - 3); // drop part of the last row
  const png = Buffer.concat([
    PNG_SIGNATURE,
    ihdrChunk(4, 2, 8, 0),
    chunk("IDAT", deflateSync(truncatedRaw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  assert.throws(
    () => decodePng(png),
    (err: unknown) => {
      assert.ok(err instanceof PngDecodeError);
      assert.match(err.message, /truncated image data/);
      return true;
    },
  );
});

test("a bad checksum on a critical header chunk (IHDR) raises PngDecodeError", () => {
  const png = Buffer.concat([PNG_SIGNATURE, chunk("IHDR", ihdrData(2, 2, 8, 0), { badCrc: true })]);
  assert.throws(
    () => decodePng(png),
    (err: unknown) => {
      assert.ok(err instanceof PngDecodeError);
      assert.match(err.message, /bad checksum in IHDR/);
      return true;
    },
  );
});

test("a zero-width IHDR raises PngDecodeError", () => {
  const png = Buffer.concat([PNG_SIGNATURE, ihdrChunk(0, 2, 8, 0)]);
  assert.throws(
    () => decodePng(png),
    (err: unknown) => {
      assert.ok(err instanceof PngDecodeError);
      assert.match(err.message, /zero-size image/);
      return true;
    },
  );
});

test("an unrecognized chunk with the critical bit set and a bad checksum raises PngDecodeError", () => {
  // "TEST" - uppercase first letter, so the ancillary bit is clear (critical),
  // but it is not one of IHDR/PLTE/IDAT/IEND: the decoder must still verify
  // its checksum rather than silently ignore it like a true ancillary chunk.
  const png = Buffer.concat([
    PNG_SIGNATURE,
    ihdrChunk(2, 2, 8, 0),
    chunk("TEST", Buffer.from([1, 2, 3]), { badCrc: true }),
  ]);
  assert.throws(
    () => decodePng(png),
    (err: unknown) => {
      assert.ok(err instanceof PngDecodeError);
      assert.match(err.message, /bad checksum in TEST/);
      return true;
    },
  );
});
