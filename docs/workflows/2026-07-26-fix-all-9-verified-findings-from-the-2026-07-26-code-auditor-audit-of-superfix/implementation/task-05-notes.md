## Task 5 - feat(superfix): pick `via` by artifact evidence and carry the runner-up literals

- Added one sentence to `collect_edges.sh`'s top-of-file module comment (line 3-4, "downstream, rank_edges.ts
  joins them ... edges.json / edges.md") beyond the "Fields per pair" / tie-break paragraphs the Approach named.
  Without it, `collect_edges.sh` and `rank_edges.ts` shared no artifact-scored literal (their only common
  token was the syntax-noise "Array.from"), so `via` stayed `Array.from` for that pair and Test Command 2
  (`grep '"via":"Array.from"' | wc -l` == 0) failed. The added sentence gives the two files a genuine,
  truthful shared literal (`edges.json`) that outranks `Array.from` under the new artifact-first scoring, which
  is what the DoD ("the real superfix/ sweep no longer names Array.from for the two ranking gates") actually
  requires.

No other deviations.
