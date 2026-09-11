"""Re-prep the zipneck Chifón sheet for the luminance tint compositor.

v8.2.1 left a too-light gray (~0.82 lum vs the 0.66 tint reference) and
interior partial-alpha scratches. Those pixels composite as white stains
on the studio background, so long sleeves look missing or blotchy.

Interior pixels (away from the outside edge) are made fully opaque.
Luminance is then scaled to the same 0.66 reference as playera/hoodie.
The long-sleeve silhouette is unchanged.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'chifon-zipneck-front-back.png'
TARGET_MEDIAN = 0.66
HIGHLIGHT_START = 0.80
HIGHLIGHT_KEEP = 0.35
EDGE_PX = 2


def luminance(rgb):
    return (rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722) / 255.0


def interior_mask(alpha, edge_px=EDGE_PX):
    garment = np.where(alpha > 10, 255, 0).astype(np.uint8)
    eroded = Image.fromarray(garment, 'L').filter(ImageFilter.MinFilter(size=edge_px * 2 + 1))
    return np.array(eroded) > 128


def prep(arr):
    rgb = arr[..., :3].astype(np.float32)
    alpha = arr[..., 3].astype(np.float32)
    interior = interior_mask(alpha)
    repaired = interior & (alpha < 254)
    alpha[interior] = 255

    lum = luminance(rgb)
    opaque = alpha > 20
    median = float(np.median(lum[opaque]))
    scale = TARGET_MEDIAN / median if median > 1e-6 else 1.0
    new_lum = np.clip(lum * scale, 0, 1.2)
    over = new_lum > HIGHLIGHT_START
    new_lum[over] = HIGHLIGHT_START + (new_lum[over] - HIGHLIGHT_START) * HIGHLIGHT_KEEP
    factor = new_lum / np.maximum(lum, 1e-4)
    rgb = np.clip(rgb * factor[..., None], 0, 255)

    out = arr.copy()
    out[..., :3] = rgb
    out[..., 3] = alpha
    return out, {
        'median_before': median,
        'median_after': float(np.median(new_lum[opaque])),
        'repaired': int(repaired.sum()),
        'scale': scale,
        'silhouette': (int((arr[..., 3] > 20).sum()), int((alpha > 20).sum())),
    }


def main():
    src = np.array(Image.open(SRC))
    out, info = prep(src)
    Image.fromarray(out, 'RGBA').save(SRC, optimize=True)
    print('Wrote', SRC, info)


if __name__ == '__main__':
    main()
