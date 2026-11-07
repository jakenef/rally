"""Measured stats (spec 010): per-player numbers from tracks in court coordinates.

Pure Python, no video: detect.py turns a clip into Track objects, and everything
here is tested on synthetic tracks.

Court coordinates are metres. x runs across the court (0 to COURT_WIDTH), y runs
along it from the near baseline (0) to the far baseline (COURT_LENGTH). The net
is at y = NET_Y.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

COURT_WIDTH = 6.096  # 20 ft
COURT_LENGTH = 13.411  # 44 ft
NET_Y = COURT_LENGTH / 2
KITCHEN_DEPTH = 2.134  # 7 ft, the non-volley zone
NEAR_KITCHEN_LINE = NET_Y - KITCHEN_DEPTH
FAR_KITCHEN_LINE = NET_Y + KITCHEN_DEPTH

KITCHEN_BAND = 1.0  # "within ~1 m of the non-volley line" (010)
MIN_TRACK_SHARE = 0.10  # VIS-3: drop tracks seen in under 10% of frames
MAX_STEP_SPEED = 8.0  # m/s; faster jumps between frames are tracking glitches, ignored


@dataclass
class Point:
    frame: int
    x: float
    y: float
    ready: bool | None = None  # from pose, when known


@dataclass
class Track:
    track_id: int
    points: list[Point] = field(default_factory=list)


def kitchen_line_y(y: float) -> float:
    """The kitchen line on the player's own side of the net."""
    return NEAR_KITCHEN_LINE if y < NET_Y else FAR_KITCHEN_LINE


def near_kitchen_line(p: Point) -> bool:
    return abs(p.y - kitchen_line_y(p.y)) <= KITCHEN_BAND


def side(p: Point) -> str:
    return "near" if p.y < NET_Y else "far"


def keep_tracks(tracks: list[Track], total_frames: int) -> list[Track]:
    """VIS-3: drop tracks seen in fewer than 10% of frames."""
    return [t for t in tracks if total_frames and len(t.points) / total_frames >= MIN_TRACK_SHARE]


def select_track(tracks: list[Track], click: tuple[float, float]) -> int | None:
    """VIS-5: the track whose first point is nearest the click (court coordinates)."""
    best, best_d = None, math.inf
    for t in tracks:
        if not t.points:
            continue
        first = min(t.points, key=lambda p: p.frame)
        d = math.dist((first.x, first.y), click)
        if d < best_d:
            best, best_d = t.track_id, d
    return best


def _movement(points: list[Point], fps: float) -> tuple[float, list[float]]:
    """Total distance and per-step speeds, skipping glitch jumps."""
    pts = sorted(points, key=lambda p: p.frame)
    distance, speeds = 0.0, []
    for a, b in zip(pts, pts[1:]):
        dt = (b.frame - a.frame) / fps
        if dt <= 0:
            continue
        d = math.dist((a.x, a.y), (b.x, b.y))
        v = d / dt
        if v > MAX_STEP_SPEED:
            continue
        distance += d
        speeds.append(v)
    return distance, speeds


def _peak(speeds: list[float]) -> float:
    """95th percentile, so one noisy frame doesn't set the peak."""
    if not speeds:
        return 0.0
    s = sorted(speeds)
    return s[min(len(s) - 1, int(0.95 * len(s)))]


def _partner_spacing(track: Track, others: list[Track]) -> float | None:
    """Average distance to the teammate: the other player on the same side most of the time."""
    mine = {p.frame: p for p in track.points}
    my_side = max(("near", "far"), key=lambda s: sum(side(p) == s for p in track.points))
    best, best_shared = None, 0
    for o in others:
        shared = [(mine[p.frame], p) for p in o.points if p.frame in mine and side(p) == my_side]
        if len(shared) > best_shared:
            best, best_shared = shared, len(shared)
    if not best:
        return None
    return sum(math.dist((a.x, a.y), (b.x, b.y)) for a, b in best) / len(best)


def measure_track(track: Track, others: list[Track], fps: float) -> dict:
    """One player's measured stats, shaped like PlayerStats (without `watched`)."""
    pts = track.points
    n = len(pts)
    distance, speeds = _movement(pts, fps)
    ready_known = [p.ready for p in pts if p.ready is not None]
    spacing = _partner_spacing(track, others)
    return {
        "trackId": track.track_id,
        "framesSeen": n,
        "kitchenLineShare": round(sum(near_kitchen_line(p) for p in pts) / n, 3) if n else 0.0,
        "distanceM": round(distance, 1),
        "avgPartnerSpacingM": round(spacing, 2) if spacing is not None else None,
        "readyPositionShare": round(sum(ready_known) / len(ready_known), 3) if ready_known else 0.0,
        "avgSpeedMps": round(sum(speeds) / len(speeds), 2) if speeds else 0.0,
        "peakSpeedMps": round(_peak(speeds), 2),
    }


def measure(tracks: list[Track], total_frames: int, fps: float, click: tuple[float, float] | None = None) -> list[dict]:
    """Every kept player's stats; the clicked one is marked `selected`."""
    kept = keep_tracks(tracks, total_frames)
    chosen = select_track(kept, click) if click else None
    out = []
    for t in kept:
        stats = measure_track(t, [o for o in kept if o is not t], fps)
        if t.track_id == chosen:
            stats["selected"] = True
        out.append(stats)
    return out
