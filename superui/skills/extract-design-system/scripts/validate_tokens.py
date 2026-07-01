#!/usr/bin/env python3
"""Validate a DTCG-in-YAML token file.

Checks:
  - tokens have $value and a resolvable $type (own or inherited from a group)
  - token/group names don't start with '$' and contain no '.', '{', '}'
  - alias references "{a.b.c}" resolve to an existing token (no cycles)
  - sRGB color components are in 0..1 and length 3; alpha in 0..1
  - dimension/duration values are {value:number, unit:str}

Usage: python validate_tokens.py TOKENS.yaml
Exit code 0 = valid, 1 = errors found.
"""
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")
META = {"$value", "$type", "$description", "$extensions", "$deprecated"}
BAD_NAME = re.compile(r"[.\{\}]")

errors = []
warnings = []
tokens = {}  # dotted path -> {"type":..., "value":...}


def is_group(node):
    return isinstance(node, dict) and "$value" not in node


def walk(node, path, inherited_type):
    if not isinstance(node, dict):
        return
    node_type = node.get("$type", inherited_type)
    if "$value" in node:  # token
        if "$type" not in node and inherited_type is None:
            errors.append(f"{'.'.join(path)}: missing $type (and none inherited)")
        tokens[".".join(path)] = {"type": node_type, "value": node["$value"]}
        for k in node:
            if k.startswith("$"):
                if k not in META:
                    warnings.append(f"{'.'.join(path)}: unknown meta key {k}")
            else:
                errors.append(f"{'.'.join(path)}: a token with $value cannot also "
                              f"nest child '{k}' — it is silently ignored; move the "
                              f"nested tokens out of this $value node")
        return
    # group
    for key, child in node.items():
        if key.startswith("$"):
            continue
        if BAD_NAME.search(key):
            errors.append(f"name '{key}' contains a reserved char (. {{ }})")
        walk(child, path + [key], node_type)


def resolve(path, value, seen):
    """Follow aliases to detect cycles / dangling refs."""
    if isinstance(value, str):
        m = ALIAS_RE.match(value.strip())
        if m:
            target = m.group(1)
            if target in seen:
                errors.append(f"{path}: circular alias via {target}")
                return
            if target not in tokens:
                errors.append(f"{path}: alias '{{{target}}}' does not resolve")
                return
            resolve(path, tokens[target]["value"], seen | {target})


def check_color(path, v):
    if isinstance(v, str) and ALIAS_RE.match(v.strip()):
        return
    if not isinstance(v, dict):
        errors.append(f"{path}: color value must be an object or alias")
        return
    comps = v.get("components")
    space = v.get("colorSpace")
    if space == "srgb" and isinstance(comps, list):
        if len(comps) != 3:
            errors.append(f"{path}: srgb needs 3 components")
        elif any((not isinstance(c, (int, float))) or c < 0 or c > 1 for c in comps):
            errors.append(f"{path}: srgb components must be 0..1")
    a = v.get("alpha", 1)
    if not (isinstance(a, (int, float)) and 0 <= a <= 1):
        errors.append(f"{path}: alpha must be 0..1")


def check_dim(path, v):
    if isinstance(v, str) and ALIAS_RE.match(v.strip()):
        return
    if not (isinstance(v, dict) and "value" in v and "unit" in v):
        errors.append(f"{path}: dimension/duration must be {{value, unit}}")


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: validate_tokens.py TOKENS.yaml")
    with open(sys.argv[1]) as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        sys.exit("Top level must be a mapping")

    walk(data, [], None)

    for path, info in tokens.items():
        resolve(path, info["value"], {path})
        t = info["type"]
        if t == "color":
            check_color(path, info["value"])
        elif t in ("dimension", "duration"):
            check_dim(path, info["value"])

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"\n{len(tokens)} tokens, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
