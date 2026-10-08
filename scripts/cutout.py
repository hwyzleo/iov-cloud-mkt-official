"""Remove the baked-in checkerboard background from the provided PNGs.

Strategy:
  1. Sample the four corners -> KMeans(2) to learn the checkerboard's two tones.
  2. Mark pixels close to either tone as background candidates.
  3. Flood-fill from the image border through candidate pixels -> true background.
  4. Erase it to transparency; keep everything else (including inner details).
"""
import sys
from collections import deque

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

CORNER = 48  # px sampled from each corner
TOL = 60     # color distance tolerance


def extract(path: str, out: str) -> None:
    img = Image.open(path).convert('RGBA')
    a = np.array(img).astype(np.int32)
    h, w, _ = a.shape
    rgb = a[..., :3]

    corner = np.concatenate([
        rgb[:CORNER, :CORNER].reshape(-1, 3),
        rgb[:CORNER, -CORNER:].reshape(-1, 3),
        rgb[-CORNER:, :CORNER].reshape(-1, 3),
        rgb[-CORNER:, -CORNER:].reshape(-1, 3),
    ])
    km = KMeans(n_clusters=2, n_init=3, random_state=0).fit(corner)
    tones = km.cluster_centers_.astype(int)
    dist = np.minimum(np.linalg.norm(rgb - tones[0], axis=2),
                      np.linalg.norm(rgb - tones[1], axis=2))
    cand = dist < TOL

    # Flood fill from the border through candidate background pixels.
    visited = np.zeros((h, w), bool)
    dq = deque()
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                dq.append((ny, nx))

    removed = int(visited.sum())
    out_a = a.copy()
    out_a[visited, 3] = 0

    # Feather residual anti-aliased fringe: semi-transparent pixels that sit
    # next to transparency and are still close to a background tone.
    alpha = out_a[..., 3]
    for _ in range(3):
        edges = np.zeros((h, w), bool)
        nxt = np.zeros_like(alpha)
        if alpha.max() > 0:
            nxt[1:, :] = alpha[:-1, :]
            nxt[:-1, :] = np.maximum(nxt[:-1, :], alpha[1:, :])
            nxt[:, 1:] = np.maximum(nxt[:, 1:], alpha[:, :-1])
            nxt[:, :-1] = np.maximum(nxt[:, :-1], alpha[:, 1:])
            edges = (alpha > 0) & (nxt == 0)
        for y, x in zip(*np.where(edges)):
            d = dist[y, x]
            if d < 90:
                f = max(0.0, (d - TOL) / 30.0)
                out_a[y, x, 3] = int(255 * f)

    # Report subject bbox (non-transparent).
    alpha2 = out_a[..., 3] > 0
    ys, xs = np.where(alpha2)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(ys) else None
    if box:
        sx, sy, ex, ey = box
        sub = alpha2[sy:ey + 1, sx:ex + 1]
        rows, cols = 24, 80
        ch, cw = sub.shape[0] / rows, sub.shape[1] / cols
        print('subject bbox:', box, f'({ex-sx+1}x{ey-sy+1})')
        print('mask preview (X = opaque):')
        for r in range(rows):
            line = []
            for c in range(cols):
                block = sub[int(r*ch):int((r+1)*ch), int(c*cw):int((c+1)*cw)]
                line.append('X' if block.mean() > 0.15 else '.')
            print(''.join(line))

    Image.fromarray(out_a.astype(np.uint8)).save(out)
    print(f'{path} -> {out}: removed {removed}/{h*w} px ({removed/(h*w)*100:.1f}%)')


if __name__ == '__main__':
    extract(sys.argv[1], sys.argv[2])
