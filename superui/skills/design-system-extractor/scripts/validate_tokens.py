#!/usr/bin/env python3
"""Validate a DTCG-in-YAML token file.

IN : argv[1] — path to the tokens YAML file (read as UTF-8).
OUT: stdout — one "WARN  ..." line per warning, one "ERROR ..." line per error,
     then a summary line: "<n> tokens, <e> errors, <w> warnings".
Exit codes: 0 = valid (warnings allowed), 1 = errors found (or unusable input).
Flags: none.

Checks:
  - tokens have $value and a resolvable $type (own or inherited from a group)
  - token/group names don't start with '$' and contain no '.', '{', '}'
  - alias references "{a.b.c}" resolve to an existing token (no cycles),
    RECURSIVELY: every alias string nested anywhere inside a composite $value
    dict/list (typography, shadow — including layer lists — border, gradient,
    transition) is resolved; a dangling nested alias is an error
  - color values are an object with BOTH colorSpace and components (DTCG
    requires both; a bare hex is not sufficient); srgb components are 3
    numbers in 0..1; alpha in 0..1
  - dimension/duration values are {value: number, unit: str}
  - $extensions.org.superui.dark (the L1 dark-mode canon): when present on a
    token it is validated exactly like $value — same type checks and the same
    recursive alias resolution (aliases and composites allowed)
"""
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")

ALIAS_RE = re.compile(r"^\{([^}]+)\}$")
META = {"$value", "$type", "$description", "$extensions", "$deprecated"}
BAD_NAME = re.compile(r"[.\{\}]")
_MISSING = object()  # sentinel: token has no dark extension

errors = []
warnings = []
tokens = {}  # dotted path -> {"type":..., "value":..., "dark":...}


def dark_of(node):
    """Return $extensions.org.superui.dark, or _MISSING when absent."""
    ext = node.get("$extensions")
    if isinstance(ext, dict):
        org = ext.get("org.superui")
        if isinstance(org, dict) and "dark" in org:
            return org["dark"]
    return _MISSING


def walk(node, path, inherited_type):
    if not isinstance(node, dict):
        return
    node_type = node.get("$type", inherited_type)
    if "$value" in node:  # token
        if "$type" not in node and inherited_type is None:
            errors.append(f"{'.'.join(path)}: missing $type (and none inherited)")
        tokens[".".join(path)] = {"type": node_type, "value": node["$value"],
                                  "dark": dark_of(node)}
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
    """Follow aliases to detect cycles / dangling refs — recursively, so alias
    strings nested inside composite dicts/lists are resolved too."""
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
    elif isinstance(value, dict):
        for v in value.values():
            resolve(path, v, seen)
    elif isinstance(value, list):
        for v in value:
            resolve(path, v, seen)


def check_color(path, v):
    if isinstance(v, str) and ALIAS_RE.match(v.strip()):
        return
    if not isinstance(v, dict):
        errors.append(f"{path}: color value must be an object or alias")
        return
    if "colorSpace" not in v:
        errors.append(f"{path}: color object missing required 'colorSpace'")
    comps = v.get("components")
    if comps is None:
        errors.append(f"{path}: color object missing required 'components' "
                      f"(a bare hex is not valid DTCG)")
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


def check_typed(path, token_type, value):
    """Type-specific checks — shared by $value and the dark extension."""
    if token_type == "color":
        check_color(path, value)
    elif token_type in ("dimension", "duration"):
        check_dim(path, value)


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: validate_tokens.py TOKENS.yaml")
    with open(sys.argv[1], encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        sys.exit("Top level must be a mapping")

    walk(data, [], None)

    for path, info in tokens.items():
        resolve(path, info["value"], {path})
        check_typed(path, info["type"], info["value"])
        if info["dark"] is not _MISSING:
            dpath = f"{path} ($extensions.org.superui.dark)"
            resolve(dpath, info["dark"], {path})
            check_typed(dpath, info["type"], info["dark"])

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"\n{len(tokens)} tokens, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
