#!/usr/bin/env python3
"""toposort.py — deterministic topological sort + cycle detection for decomposer Step 5.

Purely structural: input carries only numeric candidate ids, touches counts, and
dependency ids — never task content, verb-phrases, or file paths.

Usage:
  python3 toposort.py <<'EOF'
  <candidate id> <touches count> [dep id ...]
  ...
  EOF

  One line per candidate. `candidate id` = the candidate's Step 3 listing
  position (1..K, unique). `touches count` = the size of that candidate's
  `## Touches` set. `dep id`s reference other candidate ids from this same
  input, in any numeric relation (forward references allowed) — unknown ids
  are ignored defensively.

Output:
  <final task number> <candidate id>   (exit 0) — K lines, one per candidate,
      in ascending final-task-number order (1..K). This is the execution
      order AND the candidate-id -> final-number lookup in one pass: line i
      gives both the final task number i and which candidate fills it. The
      tie-break for candidates with no forced relative order is ascending
      `touches count`, then ascending candidate id.
  CYCLE <id> <id> ...                   (exit 1) — the candidate ids left
      over once no more zero-indegree candidates remain (participate in, or
      are downstream of, a cyclic dependency). Ascending order.
"""
import sys


def toposort(order, touches, deps):
    """order: candidate ids in input order. touches: {id: count}.
    deps: {id: [dep ids]}. Returns (final_order, remaining) — remaining is
    non-empty iff a cycle exists.
    """
    ids = set(order)
    indegree = {i: 0 for i in order}
    children = {i: [] for i in order}
    for i in order:
        for d in deps[i]:
            if d in ids:
                children[d].append(i)
                indegree[i] += 1

    remaining = set(order)
    final_order = []
    while remaining:
        ready = [i for i in remaining if indegree[i] == 0]
        if not ready:
            break
        ready.sort(key=lambda i: (touches[i], i))
        n = ready[0]
        remaining.discard(n)
        final_order.append(n)
        for c in children[n]:
            indegree[c] -= 1

    return final_order, remaining


def main():
    sys.stdout.reconfigure(newline="\n")  # force LF-only output on every platform
    order = []
    touches = {}
    deps = {}
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        cid = int(parts[0])
        order.append(cid)
        touches[cid] = int(parts[1])
        deps[cid] = [int(p) for p in parts[2:]]

    if not order:
        sys.exit(0)

    final_order, remaining = toposort(order, touches, deps)

    if remaining:
        print("CYCLE " + " ".join(str(i) for i in sorted(remaining)))
        sys.exit(1)

    for pos, cid in enumerate(final_order, start=1):
        print(f"{pos} {cid}")
    sys.exit(0)


if __name__ == "__main__":
    main()
