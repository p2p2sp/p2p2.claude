#!/usr/bin/env python3
"""Extract exact colors from a layout image.

Two modes (combinable):
  - palette: k-means dominant colors over the whole image (or a crop)
  - points:  exact color at specific x,y pixel coordinates

Usage:
  python sample_colors.py IMAGE [--k 8] [--points 12,40 300,18 ...]
                          [--crop x,y,w,h] [--json]

Output: human-readable table by default, or DTCG-ready JSON with --json.
Each color is reported as hex, sRGB 0..1 components, and a coverage % (palette).
"""
import argparse
import json
import sys

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("Missing deps. Run: pip install pillow numpy --break-system-packages")


def _kmeans(pixels, k, iters=25, seed=0):
    """Tiny dependency-free k-means (numpy only)."""
    rng = np.random.default_rng(seed)
    # k-means++-ish seeding: pick distinct-ish starting centroids
    idx = rng.choice(len(pixels), size=min(k, len(pixels)), replace=False)
    centroids = pixels[idx].astype(float)
    labels = np.zeros(len(pixels), dtype=int)
    for _ in range(iters):
        # assign
        d = np.linalg.norm(pixels[:, None, :] - centroids[None, :, :], axis=2)
        new_labels = d.argmin(axis=1)
        if np.array_equal(new_labels, labels) and _ > 0:
            labels = new_labels
            break
        labels = new_labels
        # update
        for c in range(len(centroids)):
            members = pixels[labels == c]
            if len(members):
                centroids[c] = members.mean(axis=0)
    counts = np.bincount(labels, minlength=len(centroids))
    return centroids, counts


def _to_record(rgb):
    r, g, b = (int(round(v)) for v in rgb[:3])
    return {
        "hex": f"#{r:02x}{g:02x}{b:02x}",
        "colorSpace": "srgb",
        "components": [round(r / 255, 4), round(g / 255, 4), round(b / 255, 4)],
        "rgb255": [r, g, b],
    }


def palette(img, k):
    arr = np.asarray(img.convert("RGB"))
    pixels = arr.reshape(-1, 3).astype(float)
    # subsample for speed on big images
    if len(pixels) > 60000:
        step = len(pixels) // 60000
        pixels = pixels[::step]
    centroids, counts = _kmeans(pixels, k)
    total = counts.sum()
    order = counts.argsort()[::-1]
    out = []
    for i in order:
        rec = _to_record(centroids[i])
        rec["coverage"] = round(float(counts[i]) / total, 4)
        out.append(rec)
    return out


def points(img, pts):
    rgb = img.convert("RGB")
    w, h = rgb.size
    out = []
    for (x, y) in pts:
        if not (0 <= x < w and 0 <= y < h):
            out.append({"point": [x, y], "error": "out of bounds"})
            continue
        rec = _to_record(rgb.getpixel((x, y)))
        rec["point"] = [x, y]
        out.append(rec)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--k", type=int, default=8, help="number of palette colors")
    ap.add_argument("--points", nargs="*", default=[], help="x,y coords to sample")
    ap.add_argument("--crop", help="x,y,w,h crop before palette extraction")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    img = Image.open(args.image)
    if args.crop:
        x, y, w, h = (int(v) for v in args.crop.split(","))
        img_for_palette = img.crop((x, y, x + w, y + h))
    else:
        img_for_palette = img

    result = {"image": args.image, "size": list(img.size)}
    if args.k > 0:
        result["palette"] = palette(img_for_palette, args.k)
    if args.points:
        pts = [tuple(int(v) for v in p.split(",")) for p in args.points]
        result["points"] = points(img, pts)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    print(f"# {args.image}  ({img.size[0]}x{img.size[1]})")
    if "palette" in result:
        print("\nPalette (by coverage):")
        for c in result["palette"]:
            print(f"  {c['hex']}  cov={c['coverage']*100:5.1f}%  "
                  f"srgb={c['components']}")
    if "points" in result:
        print("\nSampled points:")
        for c in result["points"]:
            if "error" in c:
                print(f"  {c['point']}: {c['error']}")
            else:
                print(f"  {tuple(c['point'])}: {c['hex']}  srgb={c['components']}")


if __name__ == "__main__":
    main()
