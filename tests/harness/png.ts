/*
 * png.ts - a dependency-free PNG encoder over `node:zlib`. Used to synthesise
 * real PNG fixtures for scripts that read image files, without pulling in an
 * image library.
 *
 * Always emits 8-bit-depth, non-interlaced, filter-type-0 ("None") RGBA
 * (color type 6) - the simplest form `decodePng` fully supports, sufficient
 * for round-tripping test fixtures.
 */

import { deflateSync, crc32 } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

export interface WritePngOpts {
  /** Reserved for future filter strategies; only "None" (0) is implemented. */
  filter?: 0;
}

/** Encodes `rgba` (row-major, 4 bytes/pixel, length must equal
 *  `width * height * 4`) as a minimal well-formed PNG buffer. */
export function writePng(width: number, height: number, rgba: Uint8Array, _opts: WritePngOpts = {}): Buffer {
  if (width <= 0 || height <= 0) {
    throw new Error(`writePng: width and height must be positive, got ${width}x${height}`);
  }
  const expected = width * height * 4;
  if (rgba.length !== expected) {
    throw new Error(`writePng: rgba length ${rgba.length} does not match ${width}x${height}x4 (${expected})`);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace: none

  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  const rgbaBuf = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter type: None
    rgbaBuf.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([PNG_SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
