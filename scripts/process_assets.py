"""Produce production-ready transparent assets from the cutouts.

- HWYZ lockup: whitened (cold white) version for dark backgrounds,
  plus a source-colour transparent version; wing mark cropped out.
- Vehicle: transparent PNG (fallback) + WebP (primary), sized for hero use.
"""
import numpy as np
from PIL import Image

COLD_WHITE = (244, 247, 250)


def load(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert('RGBA')).astype(np.int32)


def save(arr: np.ndarray, path: str, width: int | None = None) -> None:
    img = Image.fromarray(arr.astype(np.uint8))
    if width and img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(path)
    print(f'  -> {path}  ({img.width}x{img.height}, {img.mode})')


def crop_bbox(arr: np.ndarray) -> np.ndarray:
    alpha = arr[..., 3] > 0
    ys, xs = np.where(alpha)
    if len(ys) == 0:
        return arr
    return arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def whiten(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    mask = out[..., 3] > 0
    out[..., :3][mask] = COLD_WHITE
    return out


# ---------- HWYZ lockup ----------
print('HWYZ lockup:')
lockup = load('/tmp/cutout/hwyz-cutout.png')
lockup_trim = crop_bbox(lockup)

# Wing mark: top opaque block (y-blocks from analysis: wing 159-1019)
ys, xs = np.where(lockup[..., 3] > 0)
blocks = []
in_block = False
for y in range(lockup.shape[0]):
    row_count = int((lockup[..., 3][y] > 0).sum())
    if row_count > 20 and not in_block:
        start = y
        in_block = True
    elif row_count <= 20 and in_block:
        blocks.append((start, y - 1))
        in_block = False
if in_block:
    blocks.append((start, lockup.shape[0] - 1))
wing = lockup[blocks[0][0]:blocks[0][1] + 1]

save(whiten(lockup_trim), 'public/assets/brand/hwyz-lockup-white.png', width=1400)
save(lockup_trim, 'public/assets/brand/hwyz-lockup.png', width=1400)
save(whiten(crop_bbox(wing)), 'public/assets/brand/hwyz-mark-white.png', width=700)

# ---------- Vehicle ----------
print('Vehicle (hero front 3/4):')
vehicle = load('/tmp/cutout/vehicle-cutout.png')
vehicle_trim = crop_bbox(vehicle)
save(vehicle_trim, 'public/assets/vehicles/hanchuan03/hero-front-3q.png', width=1600)
save(vehicle_trim, 'public/assets/vehicles/hanchuan03/hero-front-3q.webp', width=1600)
