/*
 * jpeg-decode.test.ts - boundary-depth coverage of the vendored jpeg-js
 * decoder (superui/scripts/vendor/jpeg-decode.ts), per the agreed scope: this
 * is a byte-for-byte port of upstream jpeg-js, so this file proves the ESM
 * conversion works and the documented call contract holds - it does not
 * re-test the upstream decoder's own JPEG-format test suite (progressive
 * scans, CMYK/Adobe transforms, restart intervals, malformed markers, etc).
 *
 * The fixture is a real baseline (SOF0, not progressive - verified below) 8x8
 * solid-color JPEG, produced once with Pillow at 4:4:4 (no chroma
 * subsampling) and embedded as base64 so the test never shells out to an
 * image tool or touches the filesystem. Lossy DCT/quantization moves the
 * decoded color slightly off the source (200,80,40) - the expected pixel
 * below is the decoder's own deterministic, measured output for these exact
 * bytes, not the pre-encode color.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/jpeg-decode.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { decode } from "../../superui/scripts/vendor/jpeg-decode.ts";

// 8x8, solid RGB (200,80,40), baseline DCT (SOF0 0xFFC0), 4:4:4 subsampling -
// generated with Pillow (`Image.new("RGB",(8,8),(200,80,40)).save(...,
// format="JPEG", quality=90, progressive=False, subsampling=0)`).
const SOLID_8X8_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAIAAgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkq/FD+qD/2Q==";

const SOLID_8X8_JPEG = Buffer.from(SOLID_8X8_JPEG_BASE64, "base64");

// Decoder's own deterministic output for these exact bytes (measured once,
// see the module doc above) - RGB, not the pre-encode (200,80,40) source.
const EXPECTED_WIDTH = 8;
const EXPECTED_HEIGHT = 8;
const EXPECTED_RGB: [number, number, number] = [199, 79, 40];

test("the fixture is a baseline (non-progressive) JPEG", () => {
  // SOF0 (0xFFC0) marks baseline DCT; SOF2 (0xFFC2) would mark progressive.
  let sawSOF0 = false;
  let sawSOF2 = false;
  for (let i = 0; i < SOLID_8X8_JPEG.length - 1; i++) {
    if (SOLID_8X8_JPEG[i] !== 0xff) continue;
    if (SOLID_8X8_JPEG[i + 1] === 0xc0) sawSOF0 = true;
    if (SOLID_8X8_JPEG[i + 1] === 0xc2) sawSOF2 = true;
  }
  assert.ok(sawSOF0, "fixture must carry a baseline SOF0 marker");
  assert.ok(!sawSOF2, "fixture must not carry a progressive SOF2 marker");
});

test("decode() exposes the ESM conversion as a callable function", () => {
  assert.equal(typeof decode, "function", "jpeg-decode.ts should export decode as a function");
});

test("decode(buf, {useTArray: true, formatAsRGBA: false}) returns the expected width, height and RGB bytes", () => {
  const image = decode(new Uint8Array(SOLID_8X8_JPEG), { useTArray: true, formatAsRGBA: false });

  assert.equal(image.width, EXPECTED_WIDTH);
  assert.equal(image.height, EXPECTED_HEIGHT);
  assert.ok(image.data instanceof Uint8Array, "useTArray: true must yield a Uint8Array, never a Buffer");
  assert.equal(image.data.length, EXPECTED_WIDTH * EXPECTED_HEIGHT * 3, "formatAsRGBA: false must pack 3 bytes/pixel");

  const [r, g, b] = EXPECTED_RGB;
  const expected = new Uint8Array(EXPECTED_WIDTH * EXPECTED_HEIGHT * 3);
  for (let i = 0; i < expected.length; i += 3) {
    expected[i] = r;
    expected[i + 1] = g;
    expected[i + 2] = b;
  }
  assert.deepEqual(Array.from(image.data), Array.from(expected));
});
