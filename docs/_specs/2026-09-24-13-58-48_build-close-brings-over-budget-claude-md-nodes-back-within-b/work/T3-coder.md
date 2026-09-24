The `Read` entry in implementor's `allowed-tools` was already an uncommitted change in the tree before this task; it is not part of T3's work and was left as found.
Step 6's auditor `out:` uses the run's `key:` from step 1, mirroring the memory skill's `<id>`: the implementor has no `id:` of its own.
The root reconcile condition "root exists" is phrased as "exists and no `DELETED:` line named it": the orchestrator opens no file, so a root deleted in this run is the only case it can tell from returns alone.
The `memory` entry's `TaskUpdate` waits on the `--chore` call "when one is due": with every writer returning `NONE` no commit runs, and the entry still completes.
An `OVER:` line from a node whose writer returned no verdict, `NO-NODE` or a FAIL stays in the final summary.
