#!/usr/bin/env python3
"""Serialize a DTCG-in-YAML token file to DTCG JSON — the vendor-neutral interchange form.

IN : argv[1] — path to dtcg.yml (read as UTF-8). Run validate_tokens.py on it
     FIRST; this script transcribes, it does not check DTCG conformance.
     argv[2] — output path for tokens.json (written as UTF-8; parent dir must exist).
OUT: writes argv[2] with the same tree serialized as JSON — every key, every
     $-metadata entry (incl. $extensions.org.superui.dark / .synthesized /
     .provenance) and YAML document order preserved 1:1. No alias resolution,
     no value transformation, no key sorting — aliases stay "{a.b.c}" strings
     for the consuming target adapter to resolve. 2-space indent, trailing
     newline. Losslessness is asserted before the write: the parsed YAML and the
     re-parsed emitted JSON must be identical Python structures.
     stdout — one summary line: "<n> tokens -> <path>".
Exit codes: 0 = written; 1 = error (message on stderr: bad args, missing dep,
     unreadable/unparsable input, non-string key, unserializable value,
     round-trip mismatch).
Flags: none.
"""
import json
import sys

try:
    import yaml
except ImportError:
    sys.exit("Missing dep. Run: python -m pip install pyyaml --break-system-packages")


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def check_keys(node, path):
    """JSON object keys are always strings, so a non-string YAML key would be
    coerced silently (500 -> "500") and break losslessness. Reject it instead."""
    if isinstance(node, dict):
        for key, child in node.items():
            if not isinstance(key, str):
                loc = ".".join(path) or "<root>"
                fail(f"{loc}: key {key!r} is {type(key).__name__}, not a string — "
                     f'quote it in the YAML ("{key}":)')
            check_keys(child, path + [key])
    elif isinstance(node, list):
        for i, child in enumerate(node):
            check_keys(child, path + [str(i)])


def count_tokens(node):
    """A token is any object with $value; $-prefixed keys are never groups."""
    if not isinstance(node, dict):
        return 0
    if "$value" in node:
        return 1
    return sum(count_tokens(child) for key, child in node.items()
               if not key.startswith("$"))


def main():
    if len(sys.argv) != 3:
        fail("usage: tokens_to_json.py TOKENS.yaml OUTPUT.json")
    src, dst = sys.argv[1], sys.argv[2]

    try:
        with open(src, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except OSError as e:
        fail(f"cannot read {src!r}: {e}")
    except yaml.YAMLError as e:
        fail(f"cannot parse {src!r}: {e}")
    if not isinstance(data, dict):
        fail("top level must be a mapping")

    check_keys(data, [])

    try:
        # sort_keys=False keeps YAML document order (dicts are insertion-ordered);
        # allow_nan=False rejects .nan/.inf rather than emitting invalid JSON.
        out = json.dumps(data, indent=2, ensure_ascii=False,
                         sort_keys=False, allow_nan=False) + "\n"
    except (TypeError, ValueError) as e:
        fail(f"cannot serialize {src!r} to JSON: {e}")

    if json.loads(out) != data:
        fail("round-trip mismatch: the emitted JSON does not reload as the source YAML")

    try:
        with open(dst, "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
    except OSError as e:
        fail(f"cannot write {dst!r}: {e}")
    print(f"{count_tokens(data)} tokens -> {dst}")


if __name__ == "__main__":
    main()
