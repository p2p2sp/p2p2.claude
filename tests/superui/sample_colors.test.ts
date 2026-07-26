/*
 * sample_colors.test.ts - covers sample_colors.ts at module-boundary depth
 * per the agreed scope (byte-for-byte k-means centroid quality is out of
 * scope; see the header comment): argument parsing and mode selection
 * (--k, --points, --crop, --regions, --json), combining multiple modes in
 * one invocation, exit 2 on usage errors, exit 1 on an unreadable image and
 * on out-of-range mode arguments, and determinism - the same input yields
 * byte-identical stdout across two independent runs.
 *
 * Every fixture is a real PNG built with the harness's writePng, so the
 * script's own vendor PNG decoder is exercised end to end, never mocked.
 * Every fixture color is chosen so its behavior is deterministic regardless
 * of the k-means RNG (a single solid color always converges to one merged
 * cluster, whatever indices the RNG happens to pick) - cluster QUALITY on a
 * multi-cluster photograph is never asserted here.
 *
 * sample_colors.ts carries no importable symbols beyond its CLI, so every
 * case here drives it as a real subprocess via runScript, never imported.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/sample_colors.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { writePng } from "../harness/png.ts";

const SUT = path.resolve(import.meta.dirname, "../../superui/scripts/sample_colors.ts");

function run(args: string[]): RunResult {
  return runScript(SUT, args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

/** A solid rgb (+ optional alpha) canvas of the given size. */
function solidPng(width: number, height: number, rgb: [number, number, number], alpha = 255): Buffer {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba.set([rgb[0], rgb[1], rgb[2], alpha], i * 4);
  }
  return writePng(width, height, rgba);
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  rgb: [number, number, number];
}

/** A canvas painted with disjoint solid-color rectangles over a white background. */
function blocksPng(width: number, height: number, blocks: Block[]): Buffer {
  const rgba = new Uint8Array(width * height * 4).fill(255);
  for (const b of blocks) {
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const i = (y * width + x) * 4;
        rgba.set([b.rgb[0], b.rgb[1], b.rgb[2], 255], i);
      }
    }
  }
  return writePng(width, height, rgba);
}

function writePngFile(dir: string, name: string, png: Buffer): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, png);
  return p;
}

// ---------------------------------------------------------------------------
// palette mode (--k), default and --json
// ---------------------------------------------------------------------------

test("a solid-color image yields exactly one merged palette entry at 100% coverage", () => {
  withTempDir("p2p2-sample-colors-solid-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [51, 102, 153]));
    const result = run(["--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal(json.image, imagePath);
    assert.deepEqual(json.size, [4, 4]);
    assert.equal(json.palette.length, 1);
    assert.equal(json.palette[0].hex, "#336699");
    assert.deepEqual(json.palette[0].rgb255, [51, 102, 153]);
    assert.deepEqual(json.palette[0].components, [0.2, 0.4, 0.6]);
    assert.equal(json.palette[0].coverage, 1);
  });
});

test("the human-readable (non-JSON) table matches the documented format", () => {
  withTempDir("p2p2-sample-colors-table-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [51, 102, 153]));
    const result = run([imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const expected = [
      `# ${imagePath}  (4x4)`,
      "",
      "Palette (by coverage):",
      "  #336699  cov=100.0%  srgb=[0.2, 0.4, 0.6]",
      "",
    ].join("\n");
    assert.equal(result.stdout, expected);
  });
});

test("--k 0 skips the palette entirely", () => {
  withTempDir("p2p2-sample-colors-k0-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(2, 2, [10, 20, 30]));
    const result = run(["--k", "0", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal("palette" in json, false, "palette must be absent when --k 0");
  });
});

// ---------------------------------------------------------------------------
// points mode (--points), nargs="*" and the "=" explicit form
// ---------------------------------------------------------------------------

test("--points samples exact pixel colors at each given coordinate, in order", () => {
  withTempDir("p2p2-sample-colors-points-", (dir) => {
    const rgba = new Uint8Array(3 * 1 * 4);
    rgba.set([255, 0, 0, 255], 0);
    rgba.set([0, 255, 0, 255], 4);
    rgba.set([0, 0, 255, 255], 8);
    const imagePath = writePngFile(dir, "points.png", writePng(3, 1, rgba));
    const result = run(["--k", "0", "--points", "0,0", "1,0", "2,0", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal("palette" in json, false);
    assert.equal(json.points.length, 3);
    assert.deepEqual(
      json.points.map((p: Record<string, unknown>) => p.hex),
      ["#ff0000", "#00ff00", "#0000ff"],
    );
    assert.deepEqual(json.points[0].point, [0, 0]);
  });
});

test("an out-of-bounds point reports {error: 'out of bounds'} instead of crashing", () => {
  withTempDir("p2p2-sample-colors-oob-point-", (dir) => {
    const imagePath = writePngFile(dir, "small.png", solidPng(3, 1, [1, 2, 3]));
    const result = run(["--k", "0", "--points", "10,10", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.points[0], { point: [10, 10], error: "out of bounds" });
  });
});

test("--points=x,y (explicit '=' form) accepts a single coordinate", () => {
  withTempDir("p2p2-sample-colors-points-eq-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(2, 2, [1, 2, 3]));
    const result = run(["--k", "0", "--points=0,0", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal(json.points.length, 1);
  });
});

// ---------------------------------------------------------------------------
// crop mode (--crop), explicit "=" form
// ---------------------------------------------------------------------------

test("--crop=x,y,w,h restricts the palette to the cropped region", () => {
  withTempDir("p2p2-sample-colors-crop-", (dir) => {
    const imagePath = writePngFile(
      dir,
      "blocks.png",
      blocksPng(8, 4, [
        { x: 0, y: 0, w: 4, h: 4, rgb: [16, 16, 16] },
        { x: 4, y: 0, w: 4, h: 4, rgb: [240, 240, 240] },
      ]),
    );
    const result = run(["--crop=0,0,2,2", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal(json.palette.length, 1);
    assert.equal(json.palette[0].hex, "#101010");
    assert.equal(json.palette[0].coverage, 1);
  });
});

// ---------------------------------------------------------------------------
// regions mode (--regions), luminance ranking
// ---------------------------------------------------------------------------

test("--regions ranks named rects by luminance, darkest first (rank 0)", () => {
  withTempDir("p2p2-sample-colors-regions-", (dir) => {
    const imagePath = writePngFile(
      dir,
      "blocks.png",
      blocksPng(8, 4, [
        { x: 0, y: 0, w: 4, h: 4, rgb: [16, 16, 16] },
        { x: 4, y: 0, w: 4, h: 4, rgb: [240, 240, 240] },
      ]),
    );
    const result = run(["--k", "0", "--regions", "dark=0,0,4,4", "light=4,0,4,4", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal(json.regions.length, 2);
    const byRank = [...json.regions].sort((a: Rec, b: Rec) => a.rank - b.rank);
    assert.equal(byRank[0].region, "dark");
    assert.equal(byRank[0].rank, 0);
    assert.equal(byRank[0].hex, "#101010");
    assert.equal(byRank[1].region, "light");
    assert.equal(byRank[1].rank, 1);
    assert.equal(byRank[1].hex, "#f0f0f0");
    assert.ok(byRank[0].luminance < byRank[1].luminance, "darker region must rank with lower luminance");
  });
});

test("a --regions rect outside the image bounds reports {error: 'out of bounds'} instead of crashing", () => {
  withTempDir("p2p2-sample-colors-oob-region-", (dir) => {
    const imagePath = writePngFile(dir, "small.png", solidPng(4, 4, [1, 2, 3]));
    const result = run(["--regions", "outside=0,0,10,10", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.regions[0], { region: "outside", rect: [0, 0, 10, 10], error: "out of bounds" });
  });
});

// ---------------------------------------------------------------------------
// mode combination - modes stack rather than exclude one another
// ---------------------------------------------------------------------------

test("--k, --points and --regions may all be supplied together and all three appear in the result", () => {
  withTempDir("p2p2-sample-colors-combo-", (dir) => {
    const imagePath = writePngFile(
      dir,
      "blocks.png",
      blocksPng(8, 4, [
        { x: 0, y: 0, w: 4, h: 4, rgb: [16, 16, 16] },
        { x: 4, y: 0, w: 4, h: 4, rgb: [240, 240, 240] },
      ]),
    );
    const result = run([
      "--k",
      "2",
      "--points",
      "0,0",
      "--regions",
      "dark=0,0,4,4",
      "--json",
      imagePath,
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.ok("palette" in json);
    assert.ok("points" in json);
    assert.ok("regions" in json);
  });
});

// ---------------------------------------------------------------------------
// exit 2: usage errors
// ---------------------------------------------------------------------------

test("a missing image argument prints usage and exits 2", () => {
  const result = run([]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^usage: sample_colors\.ts /);
  assert.match(result.stderr, /the following arguments are required: image/);
});

test("a second positional argument is rejected as unrecognized and exits 2", () => {
  const result = run(["a.png", "b.png"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unrecognized arguments: b\.png/);
});

test("an unknown flag is rejected as unrecognized and exits 2", () => {
  const result = run(["--bogus", "a.png"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unrecognized arguments: --bogus/);
});

test("--k with a non-integer value exits 2", () => {
  const result = run(["--k", "abc", "a.png"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /argument --k: invalid int value: 'abc'/);
});

test("--json with an explicit argument exits 2", () => {
  const result = run(["--json=true", "a.png"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /argument --json: ignored explicit argument 'true'/);
});

// ---------------------------------------------------------------------------
// exit 1: unreadable image / out-of-range mode arguments
// ---------------------------------------------------------------------------

test("a non-existent image exits 1 with a Pillow-style error message", () => {
  withTempDir("p2p2-sample-colors-missing-", (dir) => {
    const missing = path.join(dir, "no-such.png");
    const result = run([missing]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot open image/);
    assert.match(result.stderr, /No such file or directory/);
  });
});

test("a zero-size --crop (empty pixel set fed to k-means) exits 1", () => {
  withTempDir("p2p2-sample-colors-emptycrop-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [1, 2, 3]));
    const result = run(["--crop", "0,0,0,0", imagePath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /attempt to get argmin of an empty sequence/);
  });
});

test("a malformed --regions rect (wrong integer count) exits 1", () => {
  withTempDir("p2p2-sample-colors-badregion-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [1, 2, 3]));
    const result = run([imagePath, "--regions", "bg=0,0,4"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--regions name=x,y,w,h expects 4 integers, got 3/);
  });
});

test("a --regions entry missing the name= prefix exits 1", () => {
  withTempDir("p2p2-sample-colors-badregion2-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [1, 2, 3]));
    const result = run([imagePath, "--regions", "justarect"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--regions expects name=x,y,w,h, got 'justarect'/);
  });
});

test("a non-numeric --crop exits 1", () => {
  withTempDir("p2p2-sample-colors-badcrop-", (dir) => {
    const imagePath = writePngFile(dir, "solid.png", solidPng(4, 4, [1, 2, 3]));
    const result = run(["--crop", "a,b,c,d", imagePath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--crop x,y,w,h expects 4 integers like/);
  });
});

// ---------------------------------------------------------------------------
// edge cases: 1x1 image, alpha channel
// ---------------------------------------------------------------------------

test("a 1x1 image is handled without crashing", () => {
  withTempDir("p2p2-sample-colors-1x1-", (dir) => {
    const imagePath = writePngFile(dir, "tiny.png", solidPng(1, 1, [7, 8, 9]));
    const result = run(["--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.size, [1, 1]);
    assert.equal(json.palette.length, 1);
    assert.equal(json.palette[0].hex, "#070809");
    assert.equal(json.palette[0].coverage, 1);
  });
});

test("an image with a non-opaque alpha channel still samples the underlying RGB (alpha is dropped)", () => {
  withTempDir("p2p2-sample-colors-alpha-", (dir) => {
    const imagePath = writePngFile(dir, "alpha.png", solidPng(2, 2, [200, 50, 25], 128));
    const result = run(["--k", "0", "--points", "0,0", "--json", imagePath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const json = JSON.parse(result.stdout);
    assert.equal(json.points[0].hex, "#c83219");
    assert.deepEqual(json.points[0].components, [0.7843, 0.1961, 0.098]);
  });
});

// ---------------------------------------------------------------------------
// determinism
// ---------------------------------------------------------------------------

test("the same input yields byte-identical stdout across two independent runs", () => {
  withTempDir("p2p2-sample-colors-determinism-", (dir) => {
    const imagePath = writePngFile(
      dir,
      "blocks.png",
      blocksPng(8, 8, [
        { x: 0, y: 0, w: 4, h: 4, rgb: [200, 0, 0] },
        { x: 4, y: 0, w: 4, h: 4, rgb: [0, 200, 0] },
        { x: 0, y: 4, w: 4, h: 4, rgb: [0, 0, 200] },
        { x: 4, y: 4, w: 4, h: 4, rgb: [200, 200, 0] },
      ]),
    );
    const first = run(["--k", "4", "--json", imagePath]);
    const second = run(["--k", "4", "--json", imagePath]);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);
    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(first.stdout, second.stdout, "identical input must yield byte-identical stdout");
  });
});
