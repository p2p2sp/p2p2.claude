The failing `run-clock.test.ts` case was a load flake unrelated to this run: the test computes a mark 8043 s back, then spawns the script, and a busy machine (full suite running) delayed the spawn by 2 s, so the output read `05s` against a 1 s tolerance.
It passed on a plain re-run. The leading-zero test now accepts seconds 03-09; the octal-vs-decimal check still holds because the `2h 14m` prefix is exact.
The sibling DURATIONS tests keep the 1 s tolerance and could flake the same way under heavy load.
