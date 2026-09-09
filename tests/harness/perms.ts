/*
 * perms.ts - makes one file genuinely unreadable for the account running the
 * tests, so a script's "cannot read this file" branch is exercised rather
 * than skipped.
 *
 * POSIX: `chmod 000`, which root ignores - so a root run reports the platform
 * as incapable instead of asserting against a file it can still read.
 * Windows: mode bits do not gate reads at all (`chmod 000` leaves a file fully
 * readable), so the read is denied with an explicit `icacls /deny` ACE for the
 * current account and lifted again with `/remove:d`. icacls is spawned
 * directly, never through a shell, so Git-Bash never rewrites the `/deny`
 * flag into a path.
 *
 * Every deny is VERIFIED by attempting a read before it is reported as
 * successful, and every capability question is answered by running the real
 * thing on a throwaway file rather than by inspecting the platform name: an
 * ACE that a filesystem (FAT/exFAT, some network shares) or a policy silently
 * drops must degrade to a skipped test, never to one failing for the wrong
 * reason.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WINDOWS = process.platform === "win32";

/** The account an ACE must name. `USERDOMAIN\USERNAME` keeps a local account
 *  distinct from a domain one of the same name; `null` when the environment
 *  names no account at all, which makes the platform incapable. */
function principal(): string | null {
  const user = process.env.USERNAME;
  if (!user) return null;
  const domain = process.env.USERDOMAIN;
  return domain ? `${domain}\\${user}` : user;
}

function icacls(...args: string[]): boolean {
  const result = spawnSync("icacls", args, { encoding: "utf-8" });
  return !result.error && result.status === 0;
}

function readable(file: string): boolean {
  try {
    fs.readFileSync(file);
    return true;
  } catch {
    return false;
  }
}

/** Denies read access to `file` for the account running the tests. Returns
 *  false when this platform, filesystem or account cannot do it - including a
 *  POSIX root run, where the mode change succeeds and the read still works -
 *  leaving `file` readable, so a caller must treat false as "skip this case",
 *  never as a failure. */
export function denyRead(file: string): boolean {
  if (WINDOWS) {
    const account = principal();
    if (!account) return false;
    if (!icacls(file, "/deny", `${account}:(R)`)) return false;
  } else {
    try {
      fs.chmodSync(file, 0o000);
    } catch {
      return false;
    }
  }
  if (readable(file)) {
    restoreRead(file);
    return false;
  }
  return true;
}

/** Lifts a `denyRead`, so the temp dir holding `file` can be removed. Safe to
 *  call on a file that was never denied, and never throws - it runs in the
 *  `finally` of a test that may already be failing. */
export function restoreRead(file: string): void {
  if (WINDOWS) {
    const account = principal();
    if (account) icacls(file, "/remove:d", account);
  } else {
    try {
      fs.chmodSync(file, 0o644);
    } catch {
      /* the file is already gone, or the temp dir is being torn down */
    }
  }
}

let probed: boolean | null = null;

/** Whether this machine can make a file unreadable for its own account, from
 *  one real deny/restore round-trip on a throwaway file (probed once per
 *  process). Use it as a test's skip condition. */
export function canDenyRead(): boolean {
  if (probed !== null) return probed;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2p2-perms-probe-"));
  const file = path.join(dir, "probe.txt");
  try {
    fs.writeFileSync(file, "probe\n");
    probed = denyRead(file);
    if (probed) restoreRead(file);
  } catch {
    probed = false;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return probed;
}
