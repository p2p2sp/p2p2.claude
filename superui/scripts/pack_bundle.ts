/*
 * pack_bundle.ts — packs a validated handoff bundle dir into a ZIP archive
 * sibling to it, so the deliverable is one file. Builds the archive by hand
 * (`node:zlib.deflateRawSync` per entry, local file headers, a central
 * directory, an end-of-central-directory record, CRC32 per entry) — no npm
 * dependency for zipping.
 *
 * IN : BUNDLE_DIR — the handoff bundle dir to pack (every file under it,
 *      recursively, becomes one ZIP entry at its bundle-relative path).
 *      OUTPUT_ZIP — where to write the archive.
 * OUT: stdout — one line on success:
 *        PACK_OK files=<N> bytes=<zipByteSize> -> <OUTPUT_ZIP>
 *      OUTPUT_ZIP unzips to the exact same tree as BUNDLE_DIR.
 * Exit codes: 0 = ok; 1 = BUNDLE_DIR absent/empty/not-a-directory, or a
 *      self-verify mismatch after writing (message on stderr); 2 =
 *      command-line usage errors.
 *
 * Self-verify (before printing the summary): re-open the written archive,
 * parse its end-of-central-directory record and central directory, confirm
 * the entry count matches what was written, then for every entry re-inflate
 * its stored bytes (`node:zlib.inflateRawSync`) and recompute its CRC32,
 * comparing against the CRC stored in the central directory. A mismatch on
 * either axis is a hard failure, never a silent ship.
 *
 * Non-ASCII filenames: stored as UTF-8 bytes with the ZIP general-purpose
 * bit 11 (the language-encoding flag) always set, so a compliant unzip
 * reads them as UTF-8 regardless of the source filename's script.
 *
 * Usage: node pack_bundle.ts BUNDLE_DIR OUTPUT_ZIP
 */

import { deflateRawSync, inflateRawSync } from "node:zlib";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

// ---------------------------------------------------------------------------
// CRC32
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// DOS date/time (ZIP local/central headers require it; no reader depends on accuracy)
// ---------------------------------------------------------------------------

function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((Math.max(d.getFullYear(), 1980) - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

// ---------------------------------------------------------------------------
// zipDir — collect every file under BUNDLE_DIR, bundle-relative POSIX path, sorted
// ---------------------------------------------------------------------------

export interface ZipSourceEntry {
  relPath: string;
  absPath: string;
}

export function zipDir(bundleDir: string): ZipSourceEntry[] {
  const out: ZipSourceEntry[] = [];
  const walk = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) {
        walk(full);
      } else if (d.isFile()) {
        out.push({ relPath: relative(bundleDir, full).split("\\").join("/"), absPath: full });
      }
    }
  };
  walk(bundleDir);
  out.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return out;
}

// ---------------------------------------------------------------------------
// Local file header + central directory record builders
// ---------------------------------------------------------------------------

const GP_FLAG_UTF8 = 0x0800;
const METHOD_DEFLATE = 8;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY = 20;

interface BuiltEntry {
  relPath: string;
  nameBytes: Buffer;
  crc: number;
  size: number;
  compressedSize: number;
  offset: number;
  time: number;
  date: number;
  compressed: Buffer;
}

function buildLocalHeader(e: BuiltEntry): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(GP_FLAG_UTF8, 6);
  header.writeUInt16LE(METHOD_DEFLATE, 8);
  header.writeUInt16LE(e.time, 10);
  header.writeUInt16LE(e.date, 12);
  header.writeUInt32LE(e.crc, 14);
  header.writeUInt32LE(e.compressedSize, 18);
  header.writeUInt32LE(e.size, 22);
  header.writeUInt16LE(e.nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, e.nameBytes]);
}

function buildCentralRecord(e: BuiltEntry): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(VERSION_MADE_BY, 4);
  header.writeUInt16LE(VERSION_NEEDED, 6);
  header.writeUInt16LE(GP_FLAG_UTF8, 8);
  header.writeUInt16LE(METHOD_DEFLATE, 10);
  header.writeUInt16LE(e.time, 12);
  header.writeUInt16LE(e.date, 14);
  header.writeUInt32LE(e.crc, 16);
  header.writeUInt32LE(e.compressedSize, 20);
  header.writeUInt32LE(e.size, 24);
  header.writeUInt16LE(e.nameBytes.length, 28);
  header.writeUInt16LE(0, 30); // extra field length
  header.writeUInt16LE(0, 32); // file comment length
  header.writeUInt16LE(0, 34); // disk number start
  header.writeUInt16LE(0, 36); // internal file attributes
  header.writeUInt32LE(0, 38); // external file attributes
  header.writeUInt32LE(e.offset, 42);
  return Buffer.concat([header, e.nameBytes]);
}

/** Assembles the central directory (all CEN records back to back) for the given built entries. */
export function writeCentralDirectory(entries: BuiltEntry[]): Buffer {
  return Buffer.concat(entries.map(buildCentralRecord));
}

function buildEocd(entryCount: number, cdSize: number, cdOffset: number): Buffer {
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with cd start
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length
  return eocd;
}

// ---------------------------------------------------------------------------
// Self-verify: re-parse the written archive and confirm entry count + CRCs
// ---------------------------------------------------------------------------

function selfVerify(zipPath: string, expectedCount: number): void {
  const buf = readFileSync(zipPath);
  // No file comment is ever written, so the EOCD is the fixed last 22 bytes.
  const eocdOffset = buf.length - 22;
  if (eocdOffset < 0 || buf.readUInt32LE(eocdOffset) !== 0x06054b50) {
    throw new Error(`self-verify failed: no end-of-central-directory record at the expected tail of '${zipPath}'`);
  }
  const entryCount = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  if (entryCount !== expectedCount) {
    throw new Error(`self-verify failed: central directory reports ${entryCount} entries, expected ${expectedCount}`);
  }
  if (cdOffset + cdSize !== eocdOffset) {
    throw new Error(`self-verify failed: central directory size/offset does not reach the EOCD record`);
  }

  let pos = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) {
      throw new Error(`self-verify failed: central directory record ${i} has a bad signature`);
    }
    const crc = buf.readUInt32LE(pos + 16);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf-8", pos + 46, pos + 46 + nameLen);

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`self-verify failed: local header for '${name}' has a bad signature`);
    }
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.subarray(dataStart, dataStart + compressedSize);
    const decompressed = compressedSize === 0 && uncompressedSize === 0 ? Buffer.alloc(0) : inflateRawSync(compressed);
    if (decompressed.length !== uncompressedSize) {
      throw new Error(`self-verify failed: '${name}' decompressed to ${decompressed.length} bytes, expected ${uncompressedSize}`);
    }
    const actualCrc = crc32(decompressed);
    if (actualCrc !== crc) {
      throw new Error(`self-verify failed: '${name}' CRC mismatch (stored ${crc.toString(16)}, recomputed ${actualCrc.toString(16)})`);
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "pack_bundle.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] BUNDLE_DIR OUTPUT_ZIP`;
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

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(helpText() + "\n");
    process.exit(0);
  }
  if (argv.length !== 2) {
    argError(`expected 2 arguments (BUNDLE_DIR OUTPUT_ZIP), got ${argv.length}`);
  }
  const [bundleDir, outputZip] = argv;

  let st;
  try {
    st = statSync(bundleDir);
  } catch (e) {
    exitErr(`error: cannot read bundle dir '${bundleDir}': ${(e as Error).message}`);
  }
  if (!st.isDirectory()) {
    exitErr(`error: '${bundleDir}' is not a directory`);
  }

  const sources = zipDir(bundleDir);
  if (sources.length === 0) {
    exitErr(`error: bundle dir '${bundleDir}' is empty`);
  }

  const now = new Date();
  const { time, date } = dosDateTime(now);

  const parts: Buffer[] = [];
  const built: BuiltEntry[] = [];
  let offset = 0;
  for (const src of sources) {
    const data = readFileSync(src.absPath);
    const compressed = deflateRawSync(data);
    const nameBytes = Buffer.from(src.relPath, "utf-8");
    const entry: BuiltEntry = {
      relPath: src.relPath,
      nameBytes,
      crc: crc32(data),
      size: data.length,
      compressedSize: compressed.length,
      offset,
      time,
      date,
      compressed,
    };
    const local = buildLocalHeader(entry);
    parts.push(local, compressed);
    offset += local.length + compressed.length;
    built.push(entry);
  }

  const cdOffset = offset;
  const centralDirectory = writeCentralDirectory(built);
  const eocd = buildEocd(built.length, centralDirectory.length, cdOffset);
  const archive = Buffer.concat([...parts, centralDirectory, eocd]);

  writeFileSync(outputZip, archive);

  try {
    selfVerify(outputZip, built.length);
  } catch (e) {
    exitErr(`error: ${(e as Error).message}`);
  }

  process.stdout.write(`PACK_OK files=${built.length} bytes=${archive.length} -> ${outputZip}\n`);
}

main();
