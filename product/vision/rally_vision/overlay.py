"""Player boxes for the on-screen tracking overlay (scene 2).

Runs Ultralytics YOLO with ByteTrack over a local clip and saves every player's box per
sampled frame, in 0..1 coordinates of the video, with the graded player's track marked.
No court mapping needed: the boxes are drawn on the video itself, so any camera angle works.
Output: product/fixtures/clips/<clipId>.overlay.json, read by the app.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from .gemini import log

MODEL = "yolo11n.pt"  # person detection is enough for boxes; downloaded on first use
STRIDE = 2  # track every 2nd frame: smooth enough on screen, half the work
SELECTION_FILE = Path(__file__).resolve().parents[2] / "fixtures" / "clips" / "selection.json"


def find_video(clip_id: str) -> Path | None:
    clips = Path(__file__).resolve().parents[3] / "demo" / "clips"
    matches = sorted(clips.glob(f"{clip_id}_*.mp4")) + sorted(clips.glob(f"{clip_id}.mp4"))
    return matches[0] if matches else None


def _device() -> str:
    try:
        import torch

        return "mps" if torch.backends.mps.is_available() else "cpu"
    except Exception:  # noqa: BLE001
        return "cpu"


def track_boxes(video: Path, select_px: tuple[float, float], select_at_sec: float = 10.0) -> dict:
    """Boxes per sampled frame, plus which track is the graded player (nearest select_px at select_at_sec)."""
    import cv2
    from ultralytics import YOLO

    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    model = YOLO(MODEL)
    device = _device()
    frames: list[list] = []
    started = time.monotonic()
    log(f"tracking {total} frames ({total / fps:.0f}s at {fps:.0f} fps) on {device}, every {STRIDE}nd frame")
    for i, result in enumerate(model.track(source=str(video), tracker="bytetrack.yaml", stream=True, verbose=False,
                                           classes=[0], vid_stride=STRIDE, device=device, persist=True)):
        t = round(i * STRIDE / fps, 3)
        boxes = []
        if result.boxes is not None and result.boxes.id is not None:
            for tid, (x1, y1, x2, y2) in zip(result.boxes.id.int().tolist(), result.boxes.xyxy.tolist()):
                boxes.append([tid, round(x1 / width, 4), round(y1 / height, 4), round(x2 / width, 4), round(y2 / height, 4)])
        frames.append([t, boxes])
        if i % 150 == 0 and i:
            done = i * STRIDE / max(total, 1)
            log(f"{done:.0%} ({time.monotonic() - started:.0f}s)")

    selected = pick_track(frames, select_px[0] / width, select_px[1] / height, select_at_sec)
    log(f"done in {time.monotonic() - started:.0f}s; graded player is track {selected}")
    data = {"fps": fps, "width": width, "height": height, "stride": STRIDE, "selected": selected, "frames": frames}
    return add_following(data, select_at_sec, video)


def pick_track(frames: list[list], x: float, y: float, at_sec: float) -> int | None:
    """The track whose box is nearest (x, y) in the sampled frame closest to at_sec (0..1 coordinates)."""
    if not frames:
        return None
    t, boxes = min(frames, key=lambda f: abs(f[0] - at_sec) + (0 if f[1] else 1e6))
    best, best_d = None, float("inf")
    for tid, x1, y1, x2, y2 in boxes:
        inside = x1 <= x <= x2 and y1 <= y <= y2
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        d = (0 if inside else 1) + ((cx - x) ** 2 + (cy - y) ** 2) ** 0.5
        if d < best_d:
            best, best_d = tid, d
    return best


def selection(clip_id: str) -> tuple[tuple[float, float], float] | None:
    """Where the graded player stands (video pixels) and when, from fixtures/clips/selection.json."""
    if not SELECTION_FILE.exists():
        return None
    s = json.loads(SELECTION_FILE.read_text()).get(clip_id)
    return ((s["x"], s["y"]), s.get("atSec", 10.0)) if s else None


# ---------- following the graded player through ID switches ----------

LOST_AFTER_SEC = 1.5  # stop guessing if they've been out of sight this long


def _iou(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def _match(last, boxes, frames_lost: int):
    """The box that continues `last`: biggest overlap, or nearest center within reach. None if no box is close."""
    lx, ly = (last[0] + last[2]) / 2, (last[1] + last[3]) / 2
    size = max(last[2] - last[0], last[3] - last[1])
    reach = size * (0.6 + 0.1 * frames_lost)  # look a little wider the longer they've been missing
    best, best_score = None, 0.0
    for tid, *b in boxes:
        h = b[3] - b[1]
        if h < 0.5 * (last[3] - last[1]) or h > 2.0 * (last[3] - last[1]):
            continue  # a much smaller or bigger person isn't them
        iou = _iou(last, b)
        d = (((b[0] + b[2]) / 2 - lx) ** 2 + ((b[1] + b[3]) / 2 - ly) ** 2) ** 0.5
        score = iou if iou > 0.1 else (1 - d / reach) * 0.1 if d < reach else 0
        if score > best_score:
            best, best_score = (tid, b), score
    return best


def follow(frames: list[list], anchor_id: int | None, at_sec: float) -> list[int | None]:
    """The graded player's box ID in every frame: start at the anchor frame, walk forward and
    backward matching by position, so ID switches don't lose them and reused IDs don't fool it."""
    n = len(frames)
    sel: list[int | None] = [None] * n
    if anchor_id is None or not n:
        return sel
    start = min(range(n), key=lambda i: abs(frames[i][0] - at_sec) + (0 if any(b[0] == anchor_id for b in frames[i][1]) else 1e6))
    fps_samples = n / max(frames[-1][0] - frames[0][0], 1e-6)
    give_up = int(LOST_AFTER_SEC * fps_samples)
    for step in (1, -1):
        last = next(b[1:] for b in frames[start][1] if b[0] == anchor_id)
        sel[start] = anchor_id
        lost = 0
        i = start + step
        while 0 <= i < n:
            m = _match(last, frames[i][1], lost)
            if m:
                sel[i], last, lost = m[0], m[1], 0
            else:
                lost += 1
                if lost > give_up:
                    break
            i += step
    return sel


def add_following(data: dict, at_sec: float, video: Path | None = None) -> dict:
    """Append the followed ID to each frame: [t, boxes, selectedId or null]. With the video,
    following also checks clothing colors, so crossing players aren't swapped."""
    if video is not None:
        looks = torso_looks(video, data["frames"], data["width"], data["height"], data["stride"])
        ids = follow_by_look(data["frames"], looks, data.get("selected"), at_sec)
    else:
        ids = follow(data["frames"], data.get("selected"), at_sec)
    data["frames"] = [[f[0], f[1], s] for f, s in zip(data["frames"], ids)]
    return data


# ---------- appearance: tell crossing players apart by their clothes ----------

MATCH_LOOK = 0.55  # how alike a box must look to the graded player to continue the track
REACQUIRE_LOOK = 0.8  # stricter, to pick them back up after losing them
CLEARLY_DIFFERENT = 0.3  # below this, even a perfect position match is someone else
LOOK_MARGIN = 0.1  # a rival this close in looks makes the call too close: stop instead of guessing
EDGE = 0.005  # boxes touching the frame edge are cut off, not a whole person


def _cosine(a, b) -> float:
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    return sum(x * y for x, y in zip(a, b)) / (na * nb) if na and nb else 0.0


def torso_looks(video: Path, frames: list[list], width: int, height: int, stride: int) -> list[dict[int, list[float]]]:
    """For every sampled frame, each box's clothing colors: a hue-saturation histogram of the
    torso (the upper middle of the box), as a plain list."""
    import cv2

    cap = cv2.VideoCapture(str(video))
    looks: list[dict[int, list[float]]] = []
    frame_no = 0
    for t, boxes, *_ in frames:
        target = len(looks) * stride
        while frame_no < target:
            cap.grab()
            frame_no += 1
        ok, img = cap.read()
        frame_no += 1
        found: dict[int, list[float]] = {}
        if ok:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            for tid, x1, y1, x2, y2 in boxes:
                bx1, bx2 = int((x1 + (x2 - x1) * 0.2) * width), int((x2 - (x2 - x1) * 0.2) * width)
                by1, by2 = int((y1 + (y2 - y1) * 0.18) * height), int((y1 + (y2 - y1) * 0.55) * height)
                crop = hsv[max(by1, 0):by2, max(bx1, 0):bx2]
                if crop.size == 0:
                    continue
                hist = cv2.calcHist([crop], [0, 1], None, [16, 8], [0, 180, 0, 256])
                found[tid] = cv2.normalize(hist, None).flatten().tolist()
        looks.append(found)
    cap.release()
    return looks


def follow_by_look(frames: list[list], looks: list[dict[int, list[float]]], anchor_id: int | None, at_sec: float) -> list[int | None]:
    """Like `follow`, but a box only continues the track if it also looks like the graded player,
    and a lost player is picked back up only by a strong look match of a similar size."""
    n = len(frames)
    sel: list[int | None] = [None] * n
    if anchor_id is None or not n:
        return sel
    start = min(range(n), key=lambda i: abs(frames[i][0] - at_sec) + (0 if anchor_id in looks[i] else 1e6))
    anchor_look = looks[start].get(anchor_id)
    if anchor_look is None:
        return follow(frames, anchor_id, at_sec)
    fps_samples = n / max(frames[-1][0] - frames[0][0], 1e-6)
    anchor_box = next(b[1:] for b in frames[start][1] if b[0] == anchor_id)
    min_h = 0.25 * (anchor_box[3] - anchor_box[1])  # never shrink onto a far-away figure or an edge sliver
    for step in (1, -1):
        last = anchor_box
        sel[start] = anchor_id
        lost = 0
        i = start + step
        while 0 <= i < n:
            lx, ly = (last[0] + last[2]) / 2, (last[1] + last[3]) / 2
            lh = last[3] - last[1]
            size = max(last[2] - last[0], lh)
            reach = size * min(0.6 + 0.15 * lost, 1.5)  # never search far: a wrong box is worse than none
            cands = []  # (tid, box, look, overlap, distance) for similar-sized boxes within reach
            for tid, *b in frames[i][1]:
                h = b[3] - b[1]
                if not (0.5 * lh <= h <= 2.0 * lh) or h < min_h or b[0] < EDGE or b[2] > 1 - EDGE:
                    continue  # wrong size, or cut off by the frame edge
                d = (((b[0] + b[2]) / 2 - lx) ** 2 + ((b[1] + b[3]) / 2 - ly) ** 2) ** 0.5
                if d > reach:
                    continue
                look = _cosine(anchor_look, looks[i][tid]) if tid in looks[i] else 0.0
                cands.append((tid, b, look, _iou(last, b), d))

            def clear_winner(ok, key):
                """The best by `key`, only if no other candidate within reach looks nearly as much like them."""
                if not ok:
                    return None
                top = max(ok, key=key)
                rivals = [c for c in cands if c is not top and c[2] >= top[2] - LOOK_MARGIN]
                return None if rivals else top[:2]

            best = None
            if lost == 0:
                near = [c for c in cands if c[3] > 0.1]
                if len(near) == 1 and near[0][3] > 0.3 and near[0][2] >= CLEARLY_DIFFERENT:
                    best = near[0][:2]  # one clear continuation: position is enough
                else:
                    # players close together: the clothes decide, and a look-alike means stop
                    best = clear_winner([c for c in cands if c[2] >= MATCH_LOOK], lambda c: c[2] + c[3] - c[4] / max(reach, 1e-6) * 0.2)
            else:
                # picking them back up: strict look, and no look-alike nearby
                best = clear_winner([c for c in cands if c[2] >= REACQUIRE_LOOK], lambda c: c[2] - c[4] / max(reach, 1e-6) * 0.2)
            if best:
                sel[i], last, lost = best[0], best[1], 0
            else:
                lost += 1
            i += step
    return sel
