#!/usr/bin/env python3
"""底纹图取色:判断一张背景图能不能"直接换成 CSS 纯色",并给出该色值。

用途(老板 2026-10 诉求 5):首页三个模块的满幅底图(news-bg.jpg / category-bg.jpg /
upcoming-bg.jpg)其实都是"纯色底 + 顶部一处幽灵字"。这份脚本用**可复核的五个步骤**
给出结论,而不是靠肉眼估色:

  1. 全图精确 RGB 直方图取众数(24bit 键,不量化)—— 候选色 + 占比;
  2. 2% 边缘环带逐通道中位数(四条带各去掉最外 2px 的 JPEG 振铃)—— **最终采用口径**;
     中位数对残留文字像素不敏感(均值敏感);
  3. 四角 patch(宽 10% × 高 8%)中位数 —— 交叉验证四角是否同色;
  4. 渐变检测:41 条全宽行中位数 + 41 条全高列中位数 + 6×6 分块中位数,看逐通道极差;
  5. 命中占比:与主色最大通道差 ≤0/2/4/8/16 的像素占比;再用 >4 的掩膜算非背景
     像素的 bbox、最深墨色,以及与主色的 WCAG 对比度。

为什么取边缘带中位数(而不是全图中位数 / 最浅像素):
  · 全图中位数会被"图里有一块大面积深色主体"拉偏;
  · "最浅像素"会被 JPEG 高光离群点骗到;更危险的是"白水印压灰底"的素材
    会把 section 直接刷白。

判定为"可直接当 CSS 值"的三条判据(全过才行):
  四角互差 ≤2/255 · 行/列中位数逐通道极差 = 0 · ≤±4 命中率 ≥95%。

用法:
  <bundled python> scripts/sample-bg-color.py public/assets/home/news-bg.jpg [more.jpg ...]

退出码:0 = 全部判定为纯色平底;1 = 至少一张不是(需要人看一眼再决定)。
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

EDGE_BAND = 0.02  # 边缘环带宽度(占边长比例)
JPEG_RING = 2  # 最外圈像素直接丢掉(JPEG 振铃)
CORNER_W, CORNER_H = 0.10, 0.08


def lin(c: np.ndarray) -> np.ndarray:
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def luminance(rgb) -> float:
    r, g, b = (lin(np.asarray(rgb, dtype=float)))
    return float(0.2126 * r + 0.7152 * g + 0.0722 * b)


def contrast(a, b) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def median_rgb(px: np.ndarray) -> tuple[int, int, int]:
    med = np.median(px.reshape(-1, 3), axis=0)
    return tuple(int(round(v)) for v in med)


def edge_band_median(arr: np.ndarray) -> tuple[int, int, int]:
    h, w = arr.shape[:2]
    dy = max(1, int(h * EDGE_BAND))
    dx = max(1, int(w * EDGE_BAND))
    r = JPEG_RING
    bands = [
        arr[r:dy, r : w - r],  # 上
        arr[h - dy : h - r, r : w - r],  # 下
        arr[r : h - r, r:dx],  # 左
        arr[r : h - r, w - dx : w - r],  # 右
    ]
    return median_rgb(np.concatenate([b.reshape(-1, 3) for b in bands]))


def corner_medians(arr: np.ndarray) -> list[tuple[int, int, int]]:
    h, w = arr.shape[:2]
    ch, cw = max(1, int(h * CORNER_H)), max(1, int(w * CORNER_W))
    return [
        median_rgb(arr[:ch, :cw]),
        median_rgb(arr[:ch, w - cw :]),
        median_rgb(arr[h - ch :, :cw]),
        median_rgb(arr[h - ch :, w - cw :]),
    ]


def line_ranges(arr: np.ndarray, n: int = 41) -> tuple[int, int]:
    """行/列中位数的逐通道极差(0 = 完全没有渐变)。

    对每一行(列)先取该行的逐通道中位数,再看这 n 个中位数在**每个通道内**的
    极差,最后跨通道取最大 —— 即"沿这条轴走过去,颜色有没有变"。
    """
    h, w = arr.shape[:2]
    rows = np.stack([np.median(arr[min(h - 1, i * h // n), :, :], axis=0) for i in range(n)])
    cols = np.stack([np.median(arr[:, min(w - 1, i * w // n), :], axis=0) for i in range(n)])
    return int((rows.max(axis=0) - rows.min(axis=0)).max()), int(
        (cols.max(axis=0) - cols.min(axis=0)).max()
    )


def block_ranges(arr: np.ndarray, n: int = 6) -> list[int]:
    h, w = arr.shape[:2]
    out = []
    for by in range(n):
        for bx in range(n):
            blk = arr[by * h // n : (by + 1) * h // n, bx * w // n : (bx + 1) * w // n]
            med = np.median(blk.reshape(-1, 3), axis=0)
            out.append(int(med.max() - med.min()))
    return out


def analyse(path: Path) -> bool:
    img = Image.open(path).convert("RGB")
    arr = np.asarray(img)
    h, w = arr.shape[:2]
    total = h * w

    flat = arr.reshape(-1, 3).astype(np.int32)
    keys = (flat[:, 0] << 16) | (flat[:, 1] << 8) | flat[:, 2]
    uniq, counts = np.unique(keys, return_counts=True)
    top = int(np.argmax(counts))
    mode = ((uniq[top] >> 16) & 0xFF, (uniq[top] >> 8) & 0xFF, uniq[top] & 0xFF)
    mode_pct = counts[top] / total * 100

    sample = edge_band_median(arr)
    corners = corner_medians(arr)
    rows, cols = line_ranges(arr)
    blocks = block_ranges(arr)

    diff = np.abs(flat - np.asarray(sample, dtype=np.int32)).max(axis=1)
    hits = {t: float((diff <= t).mean() * 100) for t in (0, 2, 4, 8, 16)}
    # 边缘带 std(取样带内)
    dy, dx = max(1, int(h * EDGE_BAND)), max(1, int(w * EDGE_BAND))
    band = np.concatenate(
        [
            arr[JPEG_RING:dy, JPEG_RING : w - JPEG_RING].reshape(-1, 3),
            arr[h - dy : h - JPEG_RING, JPEG_RING : w - JPEG_RING].reshape(-1, 3),
        ]
    )
    band_std = float(band.std())

    # 非背景内容(幽灵字)
    mask = diff > 4
    fg_pct = float(mask.mean() * 100)
    ys, xs = np.nonzero(mask.reshape(h, w))
    bbox = (xs.min() / w * 100, xs.max() / w * 100, ys.min() / h * 100, ys.max() / h * 100) if len(xs) else (0, 0, 0, 0)
    darkest = tuple(int(v) for v in flat[mask].min(axis=0)) if mask.any() else sample

    corner_spread = int(
        max(max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3))
    )
    plain = corner_spread <= 2 and rows == 0 and cols == 0 and hits[4] >= 95.0

    hexv = "#%02x%02x%02x" % sample
    print(f"\n=== {path} ===")
    print(f"尺寸            {w}x{h}")
    print(f"采样色(边缘带中位数)  {hexv}  rgb{sample}")
    print("众数            #%02x%02x%02x  占比 %.2f%%" % (mode + (mode_pct,)))
    print("命中占比        " + "  ".join(f"±{t}={hits[t]:.2f}%" for t in (0, 2, 4, 8, 16)))
    print("四角            " + "  ".join("#%02x%02x%02x" % c for c in corners) + f"  (互差 {corner_spread}/255)")
    print(f"行/列中位数极差  {rows} / {cols}")
    print(f"6×6 分块极差    {max(blocks)}")
    print(f"边缘带 std      {band_std:.2f}")
    print(f"非背景内容      {fg_pct:.2f}%  bbox x{bbox[0]:.1f}-{bbox[1]:.1f}% y{bbox[2]:.1f}-{bbox[3]:.1f}%")
    print(f"最深墨色        rgb{darkest}  与底色对比度 {contrast(darkest, sample):.3f}:1")
    print(f"结论            {'纯色平底,可直接当 CSS 值' if plain else '**不是**纯色平底(存在渐变或色区),不要直接换 CSS'}")
    return plain


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    ok = True
    for arg in argv[1:]:
        path = Path(arg)
        if not path.exists():
            print(f"找不到文件:{path}", file=sys.stderr)
            ok = False
            continue
        ok = analyse(path) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
