#!/usr/bin/env python3
"""validate_tasks.py — structural validation of decomposer task files.

Purely structural validation (regex + string parsing — NEVER eval/exec/yaml.load)
of `.temp/.workflows/<slug>/tasks/<N>.md` against the decomposer's output
contract, plus the cross-file plan.md byte-match and status.yml seed checks.
status.yml is parsed with a plain regex, not a YAML loader, so there is no runtime
dependency on PyYAML.

Usage:
  python3 validate_tasks.py <PlanSlug> <source-plan-path>

Output:
  VALIDATE_OK                         (exit 0) — every task file passed.
  FAIL <label>:<check>  (one per line, exit 1) — <label> is the task filename, or
      `plan.md` (plan-bytes) / empty (whole-run checks). Checks:
      slug-invalid, no-tasks, h1-form, verb-h1, section-order, mode-enum,
      tests-none-shape, tests-empty, gate-shape, tdd-unit-min, e2e-min,
      forward-ref, task1-dep, cycle, plan-bytes, status-seed.
"""
import os
import re
import sys

SECTIONS = ["Plan context", "Deliverable", "Touches", "Mode", "Tests",
            "Depends on", "Task gate"]
MODES = {"tdd", "code-first-then-tests", "e2e-first", "tests-none"}
TYPES = {"feat", "fix", "docs", "refactor", "test", "chore", "build", "ci",
         "perf", "style"}


def slug_valid(slug):
    if not slug or slug.startswith("."):
        return False
    return re.fullmatch(r"[A-Za-z0-9._-]+", slug) is not None


def first_nonempty(text):
    for ln in text.splitlines():
        if ln.strip():
            return ln.rstrip("\r")
    return ""


def parse_sections(text):
    """Return (ordered titles, {title: [body lines]})."""
    order, bodies, cur = [], {}, None
    for ln in text.splitlines():
        m = re.match(r"^## (.+?)\s*$", ln)
        if m:
            cur = m.group(1)
            order.append(cur)
            bodies[cur] = []
        elif cur is not None:
            bodies[cur].append(ln)
    return order, bodies


def bullets(lines):
    return [l.strip() for l in lines if l.strip().startswith("- ")]


def extract_mode(bodies):
    for ln in bodies.get("Mode", []):
        m = re.search(r"`([a-z][a-z0-9-]*)`", ln)
        if m:
            return m.group(1)
    return None


def extract_deps(bodies):
    deps = []
    for b in bullets(bodies.get("Depends on", [])):
        m = re.match(r"^- task (\d+)\b", b)
        if m:
            deps.append(int(m.group(1)))
    return deps


def check_h1(first_line, fails, label):
    if not first_line.startswith("# "):
        fails.append((label, "h1-form"))
        return
    subj = first_line[2:].strip()
    if re.match(r"^Task \d+\b", subj):           # forbidden legacy heading
        fails.append((label, "verb-h1"))
        return
    m = re.match(r"^([a-z]+)(\([^)]+\))?: (.+)$", subj)
    if not m or m.group(1) not in TYPES or subj.endswith("."):
        fails.append((label, "h1-form"))


def check_task(path, label, fails):
    text = open(path, encoding="utf-8").read()
    check_h1(first_nonempty(text), fails, label)

    order, bodies = parse_sections(text)
    if order != SECTIONS:
        fails.append((label, "section-order"))

    mode = extract_mode(bodies)
    if mode not in MODES:
        fails.append((label, "mode-enum"))

    test_bullets = bullets(bodies.get("Tests", []))
    gate_bullets = bullets(bodies.get("Task gate", []))

    if mode == "tests-none":
        ok_tests = len(test_bullets) == 1 and test_bullets[0].startswith("- none")
        ok_gate = gate_bullets == ["- Tests: none"]
        if not (ok_tests and ok_gate):
            fails.append((label, "tests-none-shape"))
    elif mode in MODES:                          # any runnable mode
        if not test_bullets:
            fails.append((label, "tests-empty"))
        has_build = any(b == "- Build: green" for b in gate_bullets)
        has_tests = any(b.startswith("- Tests:") for b in gate_bullets)
        if not (has_build and has_tests):
            fails.append((label, "gate-shape"))
        kinds = [re.match(r"^- (\w+)", b).group(1)
                 for b in test_bullets if re.match(r"^- (\w+)", b)]
        if mode == "tdd" and "unit" not in kinds:
            fails.append((label, "tdd-unit-min"))
        if mode == "e2e-first" and "e2e" not in kinds:
            fails.append((label, "e2e-min"))

    return extract_deps(bodies)


def detect_cycle(graph):
    """Return a node on a cycle, or None. graph: {n: [deps]}."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}

    def dfs(n):
        color[n] = GRAY
        for m in graph.get(n, []):
            if m not in color:
                continue
            if color[m] == GRAY:
                return m
            if color[m] == WHITE:
                r = dfs(m)
                if r is not None:
                    return r
        color[n] = BLACK
        return None

    for n in graph:
        if color[n] == WHITE:
            r = dfs(n)
            if r is not None:
                return r
    return None


def main():
    if len(sys.argv) < 3:
        print("FAIL :usage")
        sys.exit(1)
    slug, src_plan = sys.argv[1], sys.argv[2]

    fails = []

    if not slug_valid(slug):
        print("FAIL :slug-invalid")
        sys.exit(1)

    wf_dir = os.path.join(".temp", ".workflows", slug)
    tasks_dir = os.path.join(wf_dir, "tasks")

    task_files = []
    if os.path.isdir(tasks_dir):
        for name in os.listdir(tasks_dir):
            m = re.fullmatch(r"(\d+)\.md", name)
            if m:
                task_files.append((int(m.group(1)), name))
    task_files.sort()

    if not task_files:
        print("FAIL :no-tasks")
        sys.exit(1)

    deps_by_n = {}
    for n, name in task_files:
        deps_by_n[n] = check_task(os.path.join(tasks_dir, name), name, fails)

    # cross-file dependency graph checks
    for n, name in task_files:
        deps = deps_by_n[n]
        if any(m >= n for m in deps):
            fails.append((name, "forward-ref"))
        if n == 1 and deps:
            fails.append((name, "task1-dep"))

    cyc = detect_cycle(deps_by_n)
    if cyc is not None:
        cyc_name = next((nm for nn, nm in task_files if nn == cyc), f"{cyc}.md")
        fails.append((cyc_name, "cycle"))

    # plan.md byte-match against the source plan
    plan_copy = os.path.join(wf_dir, "plan.md")
    try:
        with open(plan_copy, "rb") as a, open(src_plan, "rb") as b:
            if a.read() != b.read():
                fails.append(("plan.md", "plan-bytes"))
    except OSError:
        fails.append(("plan.md", "plan-bytes"))

    # status.yml exists with a current_task key (plain-text parse, no YAML loader)
    status = os.path.join(wf_dir, "status.yml")
    try:
        with open(status, encoding="utf-8") as fh:
            if not re.search(r"^\s*current_task:\s*\d+\s*$", fh.read(), re.M):
                fails.append(("", "status-seed"))
    except OSError:
        fails.append(("", "status-seed"))

    if fails:
        for label, check in fails:
            print(f"FAIL {label}:{check}")
        sys.exit(1)

    print("VALIDATE_OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
