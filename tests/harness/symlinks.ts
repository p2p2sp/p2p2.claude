/*
 * symlinks.ts - answers whether this account can create a directory symlink,
 * so a test that needs one is skipped with a reason instead of failing in
 * `fs.symlinkSync` before it asserts anything.
 *
 * Windows: creating a symlink needs the SeCreateSymbolicLinkPrivilege (an
 * elevated shell or Developer Mode); a plain account gets EPERM. POSIX: some
 * filesystems (FAT/exFAT, a few network shares) refuse symlinks too. The
 * capability is answered by creating a real directory symlink in a throwaway
 * dir and checking `lstat` reports it as one - never by inspecting the
 * platform name.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let probed: boolean | null = null;

/** Whether this machine can create a directory symlink, from one real attempt
 *  on a throwaway dir (probed once per process). Use it as a test's skip
 *  condition. */
export function canSymlinkDir(): boolean {
  if (probed !== null) return probed;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2p2-symlink-probe-"));
  try {
    fs.mkdirSync(path.join(dir, "real"));
    fs.symlinkSync("real", path.join(dir, "linked"), "dir");
    probed = fs.lstatSync(path.join(dir, "linked")).isSymbolicLink();
  } catch {
    probed = false;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return probed;
}
