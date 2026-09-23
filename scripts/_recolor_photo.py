"""Recolor landing 2d-photo.png: navy/green brand tones -> dashboard primary #111827."""
from PIL import Image
import numpy as np
from pathlib import Path

SRC = Path(r'D:\Kavion\Feedback\Frontend\Feedback\public\landing\2d-photo.png')
OUT = SRC
BACKUP = SRC.with_name('2d-photo-original.png')

TARGET = np.array([17, 24, 39], dtype=np.float32)  # #111827
ACCENT = np.array([55, 65, 81], dtype=np.float32)
ACCENT_SOFT = np.array([148, 163, 184], dtype=np.float32)


def mix_batch(rgb, target, strength=1.0):
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    t_lum = 0.299 * target[0] + 0.587 * target[1] + 0.114 * target[2]
    scale = np.clip(lum / max(t_lum, 1.0), 0.55, 1.55)[:, None]
    out = target[None, :] * scale
    out = np.clip(out, 0, 255)
    return rgb * (1 - strength) + out * strength


def main():
    img = Image.open(SRC).convert('RGBA')
    if not BACKUP.exists():
        img.save(BACKUP)
        print('backup saved', BACKUP.name)

    arr = np.array(img).astype(np.float32)
    rgb = arr[:, :, :3].reshape(-1, 3)
    a = arr[:, :, 3].reshape(-1)
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]

    visible = a > 10

    navy = (
        visible
        & (r <= 90)
        & (g <= 110)
        & (b <= 140)
        & (b >= 35)
        & (b >= g - 5)
        & (b > r + 10)
        & ((r + g + b) < 220)
    )

    forest = (
        visible
        & (g >= 40)
        & (g < 170)
        & (r < 100)
        & (b < 120)
        & (g > r + 12)
        & (g >= b)
        & ((r + g + b) < 320)
    )

    sage = (
        visible
        & (g >= 100)
        & (g <= 220)
        & (r > 80)
        & (g >= r - 5)
        & (g >= b)
        & (np.abs(g - r) < 50)
        & ((r + g + b) > 280)
    )

    result = rgb.copy()
    brand = navy | forest
    result[brand] = mix_batch(rgb[brand], TARGET, 1.0)

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sage_soft = sage & (lum > 160)
    sage_deep = sage & ~sage_soft
    result[sage_soft] = mix_batch(rgb[sage_soft], ACCENT_SOFT, 0.85)
    result[sage_deep] = mix_batch(rgb[sage_deep], ACCENT, 0.9)

    out = np.dstack([result.reshape(arr.shape[0], arr.shape[1], 3), arr[:, :, 3]]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(OUT, optimize=True)
    print('navy/forest', int(brand.sum()), 'sage', int(sage.sum()), '->', OUT.name)


if __name__ == '__main__':
    main()
