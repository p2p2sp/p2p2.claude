/*
 * Minimal PNG decoder (no dependencies beyond node:zlib).
 *
 * Written for sample_colors.ts to replace Pillow's PNG loading. Decodes a PNG
 * buffer straight to 8-bit RGB, replicating Pillow's effective
 * `Image.open(...).convert("RGB")` pipeline:
 *   - color type 0 (grayscale): bit depths 1/2/4 scale to 0..255 (x255, x85,
 *     x17), depth 8 passes through, depth 16 CLAMPS at 255 (Pillow opens
 *     16-bit grayscale as mode "I;16" and its convert("RGB") saturates instead
 *     of taking the high byte - measured behavior, Pillow 11.3.0);
 *   - color type 2 (RGB): depth 8 direct, depth 16 keeps the HIGH byte per
 *     channel (Pillow's "RGB;16B" raw mode);
 *   - color type 3 (palette): bit depths 1/2/4/8; a tRNS chunk is IGNORED
 *     (Pillow's P->RGB conversion drops transparency); indices past the end
 *     of the palette map to black (Pillow zero-fills short palettes);
 *   - color type 4 (gray+alpha): alpha DROPPED (Pillow's convert("RGB")
 *     discards alpha, no compositing); depth 16 keeps the high byte;
 *   - color type 6 (RGBA): alpha DROPPED; depth 16 keeps the high bytes.
 * All five row filter types (None/Sub/Up/Average/Paeth) are supported.
 * Adam7-interlaced files are rejected with "interlaced PNG not supported".
 *
 * CRCs are verified for the critical header chunks (IHDR/PLTE) and skipped
 * for IDAT and ancillary chunks - the measured Pillow policy (Pillow 11.3
 * rejects a bad IHDR/PLTE checksum at open, but decodes the IDAT stream
 * without checking chunk CRCs).
 *
 * The returned `pad` color is what Pillow would produce for raw value 0 in the
 * source mode (palette entry 0 for palette images, black otherwise); callers
 * use it to replicate Pillow's zero-fill when cropping beyond the image bounds.
 */

import { inflateSync, crc32 } from "node:zlib";

/**
 * Structural / checksum error: the file is not a usable PNG.
 * `headerPhase` marks failures Pillow would hit while parsing the pre-IDAT
 * header chunks in Image.open() (surfacing as "cannot identify image file"),
 * as opposed to failures inside the pixel-data decode (load()-time).
 */
export class PngDecodeError extends Error {
  headerPhase: boolean;
  constructor(message: string, headerPhase: boolean = false) {
    super(message);
    this.headerPhase = headerPhase;
  }
}

/** Well-formed PNG using a feature this decoder does not implement. */
export class PngUnsupportedError extends Error {}

export interface DecodedPng {
  width: number;
  height: number;
  /** Row-major RGB, 3 bytes per pixel. */
  rgb: Uint8Array;
  /** Pillow-compatible fill color for out-of-bounds crops (raw 0 converted). */
  pad: [number, number, number];
}

const PNG_SIGNATURE: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(buf: Uint8Array): boolean {
  if (buf.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

interface Ihdr {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  interlace: number;
}

const CHANNELS_BY_COLOR_TYPE: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const VALID_DEPTHS: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Undo PNG row filters in place over the inflated scanline stream. */
function unfilter(raw: Uint8Array, rowBytes: number, height: number, bpp: number): Uint8Array {
  const expected = (rowBytes + 1) * height;
  if (raw.length < expected) {
    throw new PngDecodeError("broken PNG file (truncated image data)");
  }
  const out = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (rowBytes + 1)];
    const src = y * (rowBytes + 1) + 1;
    const dst = y * rowBytes;
    const prev = (y - 1) * rowBytes;
    switch (filter) {
      case 0:
        out.set(raw.subarray(src, src + rowBytes), dst);
        break;
      case 1:
        for (let x = 0; x < rowBytes; x++) {
          const left = x >= bpp ? out[dst + x - bpp] : 0;
          out[dst + x] = (raw[src + x] + left) & 0xff;
        }
        break;
      case 2:
        for (let x = 0; x < rowBytes; x++) {
          const up = y > 0 ? out[prev + x] : 0;
          out[dst + x] = (raw[src + x] + up) & 0xff;
        }
        break;
      case 3:
        for (let x = 0; x < rowBytes; x++) {
          const left = x >= bpp ? out[dst + x - bpp] : 0;
          const up = y > 0 ? out[prev + x] : 0;
          out[dst + x] = (raw[src + x] + ((left + up) >> 1)) & 0xff;
        }
        break;
      case 4:
        for (let x = 0; x < rowBytes; x++) {
          const left = x >= bpp ? out[dst + x - bpp] : 0;
          const up = y > 0 ? out[prev + x] : 0;
          const upLeft = y > 0 && x >= bpp ? out[prev + x - bpp] : 0;
          out[dst + x] = (raw[src + x] + paethPredictor(left, up, upLeft)) & 0xff;
        }
        break;
      default:
        throw new PngDecodeError(`broken PNG file (unknown filter type ${filter})`);
    }
  }
  return out;
}

/** Expand a sub-byte-packed grayscale/palette row into one value per pixel. */
function unpackBits(row: Uint8Array, width: number, bitDepth: number): Uint8Array {
  const out = new Uint8Array(width);
  const perByte = 8 / bitDepth;
  const mask = (1 << bitDepth) - 1;
  for (let x = 0; x < width; x++) {
    const byte = row[Math.floor(x / perByte)];
    const shift = 8 - bitDepth * ((x % perByte) + 1);
    out[x] = (byte >> shift) & mask;
  }
  return out;
}

export function decodePng(buf: Uint8Array): DecodedPng {
  if (!isPng(buf)) {
    throw new PngDecodeError("not a PNG file", true);
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 8;
  let ihdr: Ihdr | null = null;
  let palette: Uint8Array | null = null;
  const idatParts: Uint8Array[] = [];
  let sawIend = false;

  while (pos + 8 <= buf.length && !sawIend) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    const dataStart = pos + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) {
      throw new PngDecodeError(`broken PNG file (truncated chunk ${type})`, idatParts.length === 0);
    }
    const data = buf.subarray(dataStart, dataEnd);
    const isCritical = (buf[pos + 4] & 0x20) === 0;
    if (isCritical && type !== "IDAT" && type !== "IEND") {
      // Pillow verifies checksums on the critical header chunks and rejects
      // the file on mismatch, but does NOT check CRCs on the IDAT data stream
      // (measured: a corrupted IDAT CRC still decodes in Pillow 11.3).
      const stored = view.getUint32(dataEnd);
      const computed = crc32(buf.subarray(pos + 4, dataEnd)) >>> 0;
      if (stored !== computed) {
        throw new PngDecodeError(`broken PNG file (bad checksum in ${type})`, true);
      }
    }
    switch (type) {
      case "IHDR": {
        if (length !== 13) throw new PngDecodeError("broken PNG file (bad IHDR length)", true);
        ihdr = {
          width: view.getUint32(dataStart),
          height: view.getUint32(dataStart + 4),
          bitDepth: buf[dataStart + 8],
          colorType: buf[dataStart + 9],
          interlace: buf[dataStart + 12],
        };
        const compression = buf[dataStart + 10];
        const filterMethod = buf[dataStart + 11];
        if (compression !== 0 || filterMethod !== 0) {
          throw new PngDecodeError("broken PNG file (unknown compression or filter method)", true);
        }
        if (!(ihdr.colorType in CHANNELS_BY_COLOR_TYPE) || !VALID_DEPTHS[ihdr.colorType].includes(ihdr.bitDepth)) {
          throw new PngDecodeError(
            `broken PNG file (unsupported bit depth ${ihdr.bitDepth} for color type ${ihdr.colorType})`,
            true,
          );
        }
        if (ihdr.interlace === 1) {
          throw new PngUnsupportedError("interlaced PNG not supported");
        }
        if (ihdr.interlace !== 0) {
          throw new PngDecodeError(`broken PNG file (unknown interlace method ${ihdr.interlace})`, true);
        }
        if (ihdr.width === 0 || ihdr.height === 0) {
          throw new PngDecodeError("broken PNG file (zero-size image)", true);
        }
        break;
      }
      case "PLTE":
        if (length % 3 !== 0) throw new PngDecodeError("broken PNG file (bad PLTE length)", true);
        palette = data.slice();
        break;
      case "IDAT":
        idatParts.push(data);
        break;
      case "IEND":
        sawIend = true;
        break;
      default:
        break; // ancillary chunks (incl. tRNS) intentionally ignored
    }
    pos = dataEnd + 4;
  }

  if (ihdr === null) throw new PngDecodeError("broken PNG file (missing IHDR)", true);
  if (idatParts.length === 0) throw new PngDecodeError("broken PNG file (missing IDAT)", true);
  if (ihdr.colorType === 3 && palette === null) {
    throw new PngDecodeError("broken PNG file (palette image without PLTE)");
  }

  let compressed: Uint8Array;
  if (idatParts.length === 1) {
    compressed = idatParts[0];
  } else {
    let total = 0;
    for (const part of idatParts) total += part.length;
    compressed = new Uint8Array(total);
    let off = 0;
    for (const part of idatParts) {
      compressed.set(part, off);
      off += part.length;
    }
  }
  let raw: Uint8Array;
  try {
    raw = inflateSync(compressed);
  } catch (e) {
    throw new PngDecodeError("broken PNG file (bad zlib stream in IDAT)");
  }

  const { width, height, bitDepth, colorType } = ihdr;
  const channels = CHANNELS_BY_COLOR_TYPE[colorType];
  const rowBits = width * channels * bitDepth;
  const rowBytes = Math.ceil(rowBits / 8);
  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const pixels = unfilter(raw, rowBytes, height, bpp);

  const rgb = new Uint8Array(width * height * 3);
  const bytesPerSample = bitDepth === 16 ? 2 : 1;

  for (let y = 0; y < height; y++) {
    const row = pixels.subarray(y * rowBytes, (y + 1) * rowBytes);
    let out = y * width * 3;
    if (bitDepth < 8) {
      const values = unpackBits(row, width, bitDepth);
      if (colorType === 0) {
        // Pillow scales sub-byte grayscale to the full 0..255 range.
        const scale = 255 / ((1 << bitDepth) - 1); // 255, 85, or 17 - exact
        for (let x = 0; x < width; x++) {
          const v = values[x] * scale;
          rgb[out++] = v;
          rgb[out++] = v;
          rgb[out++] = v;
        }
      } else {
        // color type 3
        for (let x = 0; x < width; x++) {
          const idx = values[x] * 3;
          if (palette !== null && idx + 2 < palette.length) {
            rgb[out++] = palette[idx];
            rgb[out++] = palette[idx + 1];
            rgb[out++] = palette[idx + 2];
          } else {
            rgb[out++] = 0;
            rgb[out++] = 0;
            rgb[out++] = 0;
          }
        }
      }
      continue;
    }
    for (let x = 0; x < width; x++) {
      const base = x * channels * bytesPerSample;
      let r: number;
      let g: number;
      let b: number;
      switch (colorType) {
        case 0: {
          let v: number;
          if (bitDepth === 16) {
            // Pillow: I;16 -> L saturates at 255 instead of scaling.
            const v16 = (row[base] << 8) | row[base + 1];
            v = v16 > 255 ? 255 : v16;
          } else {
            v = row[base];
          }
          r = v;
          g = v;
          b = v;
          break;
        }
        case 2:
          if (bitDepth === 16) {
            r = row[base];
            g = row[base + 2];
            b = row[base + 4];
          } else {
            r = row[base];
            g = row[base + 1];
            b = row[base + 2];
          }
          break;
        case 3: {
          const idx = row[base] * 3;
          if (palette !== null && idx + 2 < palette.length) {
            r = palette[idx];
            g = palette[idx + 1];
            b = palette[idx + 2];
          } else {
            r = 0;
            g = 0;
            b = 0;
          }
          break;
        }
        case 4: {
          // Gray + alpha; alpha dropped. 16-bit keeps the high byte (unlike
          // pure 16-bit grayscale, which clamps - both measured from Pillow).
          const v = row[base];
          r = v;
          g = v;
          b = v;
          break;
        }
        default: {
          // color type 6, alpha dropped
          if (bitDepth === 16) {
            r = row[base];
            g = row[base + 2];
            b = row[base + 4];
          } else {
            r = row[base];
            g = row[base + 1];
            b = row[base + 2];
          }
          break;
        }
      }
      rgb[out++] = r;
      rgb[out++] = g;
      rgb[out++] = b;
    }
  }

  let pad: [number, number, number] = [0, 0, 0];
  if (colorType === 3 && palette !== null && palette.length >= 3) {
    pad = [palette[0], palette[1], palette[2]];
  }

  return { width, height, rgb, pad };
}
