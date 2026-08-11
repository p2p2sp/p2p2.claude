/*
 * measure_geometry.test.ts - proves fitRadius's corner-radius fit matches the
 * constructed ground-truth radius on hard-edged fixtures, closing the
 * half-pixel bias in predictedOffset (measure_geometry.ts:217).
 *
 * Fixture: an in-memory RgbImage holding a rounded rectangle rasterised by
 * the standard pixel-centre rule - pixel (x,y) is painted foreground when
 * its centre (x+0.5, y+0.5) lies inside the shape, each corner's arc centre
 * inset by r from both edges of the box. A margin around the box gives
 * fitRadius's outsideRefPoint a true background pixel to sample.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/measure_geometry.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { fitRadius, scanShadow } from "../../superui/scripts/measure_geometry.ts";
import type { RgbImage } from "../../superui/scripts/measure_geometry.ts";

const FG: [number, number, number] = [20, 20, 20];
const BG: [number, number, number] = [240, 240, 240];
const MARGIN = 4;
const TOL = 8;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True when local pixel (x,y) - 0-based within a w x h box - is foreground
 *  under the pixel-centre rounded-rect rule for corner radius r. */
function isInsideRoundedRect(x: number, y: number, w: number, h: number, r: number): boolean {
  let arcX: number | null = null;
  let arcY: number | null = null;
  if (x < r && y < r) {
    arcX = r;
    arcY = r;
  } else if (x >= w - r && y < r) {
    arcX = w - r;
    arcY = r;
  } else if (x < r && y >= h - r) {
    arcX = r;
    arcY = h - r;
  } else if (x >= w - r && y >= h - r) {
    arcX = w - r;
    arcY = h - r;
  }
  if (arcX === null || arcY === null) return true;
  const dx = x + 0.5 - arcX;
  const dy = y + 0.5 - arcY;
  return dx * dx + dy * dy <= r * r;
}

/** Builds a square rounded-rect fixture of the given size and corner radius,
 *  surrounded by a background margin so every corner's outsideRefPoint
 *  samples a true background pixel. Returns the image and the box. */
function makeRoundedRectFixture(size: number, r: number): { img: RgbImage; box: Box } {
  const box: Box = { x: MARGIN, y: MARGIN, w: size, h: size };
  const width = size + MARGIN * 2;
  const height = size + MARGIN * 2;
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const localX = x - box.x;
      const localY = y - box.y;
      const inBox = localX >= 0 && localX < size && localY >= 0 && localY < size;
      const fg = inBox && isInsideRoundedRect(localX, localY, size, size, r);
      const color = fg ? FG : BG;
      const i = (y * width + x) * 3;
      rgb[i] = color[0];
      rgb[i + 1] = color[1];
      rgb[i + 2] = color[2];
    }
  }
  return { img: { width, height, rgb }, box };
}

test("fitRadius matches the constructed ground-truth radius on the tl corner", () => {
  for (const r of [0, 4, 8, 12, 16, 20]) {
    const { img, box } = makeRoundedRectFixture(60, r);
    const fit = fitRadius(img, box, "tl", TOL);
    assert.equal(fit.radius, r, `expected radius ${r}, got ${fit.radius}`);
    assert.equal(fit.confidence, 1, `expected confidence 1.00 at r=${r}, got ${fit.confidence}`);
  }
});

test("fitRadius matches the constructed ground-truth radius on every corner", () => {
  const r = 12;
  const { img, box } = makeRoundedRectFixture(60, r);
  for (const corner of ["tl", "tr", "bl", "br"] as const) {
    const fit = fitRadius(img, box, corner, TOL);
    assert.equal(fit.radius, r, `expected radius ${r} on ${corner}, got ${fit.radius}`);
    assert.equal(fit.confidence, 1, `expected confidence 1.00 on ${corner}, got ${fit.confidence}`);
  }
});

test("fitRadius resolves a full disc (diameter == box size) to radius == size/2", () => {
  const size = 60;
  const r = 30;
  const { img, box } = makeRoundedRectFixture(size, r);
  const fit = fitRadius(img, box, "tl", TOL);
  assert.equal(fit.radius, r, `expected radius ${r}, got ${fit.radius}`);
  assert.equal(fit.confidence, 1, `expected confidence 1.00, got ${fit.confidence}`);
});

// ---------------------------------------------------------------------------
// scanShadow
// ---------------------------------------------------------------------------

const SHADOW_BG: [number, number, number] = [240, 240, 240];

/** A width x height image filled entirely with `color`. */
function fillImage(width: number, height: number, color: [number, number, number]): RgbImage {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = color[0];
    rgb[i * 3 + 1] = color[1];
    rgb[i * 3 + 2] = color[2];
  }
  return { width, height, rgb };
}

function setPixel(img: RgbImage, x: number, y: number, color: [number, number, number]): void {
  const i = (y * img.width + x) * 3;
  img.rgb[i] = color[0];
  img.rgb[i + 1] = color[1];
  img.rgb[i + 2] = color[2];
}

test("scanShadow reports a tolerance-independent peakDelta and truncates samples after the falloff ends", () => {
  const img = fillImage(60, 1, SHADOW_BG);
  const box: Box = { x: 5, y: 0, w: 10, h: 1 };
  // Right-edge falloff: offsets 0-3 carry deltas 3,2,2,2 from bg, then settle to bg.
  setPixel(img, 15, 0, [237, 240, 240]); // offset 0, delta 3
  setPixel(img, 16, 0, [238, 240, 240]); // offset 1, delta 2
  setPixel(img, 17, 0, [238, 240, 240]); // offset 2, delta 2
  setPixel(img, 18, 0, [238, 240, 240]); // offset 3, delta 2
  const result = scanShadow(img, box, "right", 8);
  assert.equal(result.peakDelta, 3, "peakDelta must be tolerance-independent (max delta 3 under tol 8)");
  assert.equal(result.peakOffset, 0);
  assert.equal(result.peakHex, "#edf0f0");
  assert.equal(result.samples.length, 4, "falloff samples truncated after the last above-SETTLE_DELTA sample");
  assert.deepEqual(
    result.samples.map((s) => s.delta),
    [3, 2, 2, 2],
  );
});

test("scanShadow walks exactly margin (32) samples when the falloff never settles", () => {
  const img = fillImage(80, 1, SHADOW_BG);
  const box: Box = { x: 5, y: 0, w: 10, h: 1 };
  // Right-edge: every offset out to the margin carries a delta that never
  // settles (delta 5, always above SETTLE_DELTA), so the walk runs the full
  // margin rather than stopping early or overrunning it by one (today's
  // `steps <= margin` bug would admit 33). The far background pixel (offset
  // 32, used to derive bg) is left unmodified.
  for (let offset = 0; offset < 32; offset++) {
    setPixel(img, 15 + offset, 0, [235, 240, 240]); // delta 5
  }
  const result = scanShadow(img, box, "right", 8);
  assert.equal(result.samples.length, 32, "walk must stop at exactly margin samples, not 33");
});

test("scanShadow reports a zero profile when the box edge is flush against the image border", () => {
  const img = fillImage(20, 1, SHADOW_BG);
  const box: Box = { x: 0, y: 0, w: 10, h: 1 };
  // Left side: startX = box.x - 1 = -1, out of bounds before the first step.
  const result = scanShadow(img, box, "left", 8);
  assert.equal(result.extent, 0);
  assert.equal(result.peakDelta, 0);
  assert.equal(result.peakOffset, 0);
  assert.equal(result.peakHex, result.bgHex);
  assert.equal(result.samples.length, 0);
});
