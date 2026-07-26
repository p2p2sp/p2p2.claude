/*
 * tmp.ts - throwaway temp dirs and throwaway git repos for tests that must
 * not touch the developer's real HOME/~/.gitconfig or this repo's working
 * tree.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runScript, type RunResult } from "./run.ts";

/** Creates a `mkdtemp`'d dir under the OS temp root, hands it to `fn`, and
 *  removes it (recursively, ignoring already-gone/read-only files) whether
 *  `fn` returns normally or throws. */
export function withTempDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export interface GitRepo {
  dir: string;
  env: Record<string, string>;
  git(...args: string[]): RunResult;
}

export interface WithGitRepoOpts {
  bare?: boolean;
}

/** Creates a throwaway git repo in a temp dir with an isolated identity: a
 *  pinned `HOME`/`USERPROFILE`, `GIT_CONFIG_GLOBAL` pointed at an empty file
 *  in that same temp dir, `GIT_CONFIG_NOSYSTEM=1`, and fixed author/committer
 *  name/email/date - so no test call ever reads or writes the developer's
 *  real `~/.gitconfig`. */
export function withGitRepo<T>(fn: (repo: GitRepo) => T, opts: WithGitRepoOpts = {}): T {
  return withTempDir("p2p2-git-", (dir) => {
    const gitConfigGlobal = path.join(dir, ".gitconfig-global");
    fs.writeFileSync(gitConfigGlobal, "");
    const env: Record<string, string> = {
      HOME: dir,
      USERPROFILE: dir,
      GIT_CONFIG_GLOBAL: gitConfigGlobal,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "P2P2 Test",
      GIT_AUTHOR_EMAIL: "test@p2p2.invalid",
      GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z",
      GIT_COMMITTER_NAME: "P2P2 Test",
      GIT_COMMITTER_EMAIL: "test@p2p2.invalid",
      GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z",
    };
    function git(...args: string[]): RunResult {
      return runScript("git", args, { cwd: dir, env });
    }

    git("config", "--global", "user.name", env.GIT_AUTHOR_NAME);
    git("config", "--global", "user.email", env.GIT_AUTHOR_EMAIL);
    git("config", "--global", "commit.gpgsign", "false");
    git("config", "--global", "init.defaultBranch", "main");
    const init = opts.bare ? git("init", "--bare", ".") : git("init", ".");
    if (init.status !== 0) {
      throw new Error(`withGitRepo: git init failed (status ${init.status}): ${init.stderr}`);
    }

    return fn({ dir, env, git });
  });
}
