"""Clip to tracks in court coordinates (spec 010, steps 1 to 4).

Ultralytics YOLO pose with ByteTrack finds and follows each player and their
keypoints in one pass. A homography from the four clicked court corners maps each
player's feet onto the court. Install with `pip install -e ".[detect]"`.
Ultralytics is AGPL-3.0.

UNTESTED until we have a clip: everything after this file (measure.py) is tested
on synthetic tracks, and this adapter is the only part that touches video.
We don't fork Pickleball-Vision: it has no licence file, so its code isn't ours to copy.
"""
from __future__ import annotations

import math

from .measure import COURT_LENGTH, COURT_WIDTH, Point, Track

POSE_MODEL = "yolo11n-pose.pt"  # downloaded by Ultralytics on first use
COURT_MARGIN = 1.5  # metres outside the lines still counted as on court (players stand behind the baseline)
KP_CONF = 0.3

# COCO keypoint indexes
L_WRIST, R_WRIST, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE = 9, 10, 11, 12, 13, 14, 15, 16


def court_homography(corners: list[tuple[float, float]]):
    """Image-to-court transform. Corners in image pixels: near-left, near-right, far-right, far-left."""
    import cv2
    import numpy as np

    src = np.array(corners, dtype=np.float32)
    dst = np.array([[0, 0], [COURT_WIDTH, 0], [COURT_WIDTH, COURT_LENGTH], [0, COURT_LENGTH]], dtype=np.float32)
    return cv2.getPerspectiveTransform(src, dst)


def to_court(h, x: float, y: float) -> tuple[float, float]:
    import cv2
    import numpy as np

    pt = cv2.perspectiveTransform(np.array([[[x, y]]], dtype=np.float32), h)[0][0]
    return float(pt[0]), float(pt[1])


def _angle(a, b, c) -> float:
    """Angle at b, in degrees."""
    ab = (a[0] - b[0], a[1] - b[1])
    cb = (c[0] - b[0], c[1] - b[1])
    n = math.hypot(*ab) * math.hypot(*cb)
    if n == 0:
        return 180.0
    cos = max(-1.0, min(1.0, (ab[0] * cb[0] + ab[1] * cb[1]) / n))
    return math.degrees(math.acos(cos))


def ready_position(kp, conf) -> bool | None:
    """Knees bent and paddle up: a knee angle under 165 degrees and a wrist above the hips. None if unsure."""
    need = [L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE, L_WRIST, R_WRIST]
    if any(conf[i] < KP_CONF for i in need):
        return None
    knees = min(_angle(kp[L_HIP], kp[L_KNEE], kp[L_ANKLE]), _angle(kp[R_HIP], kp[R_KNEE], kp[R_ANKLE]))
    hip_y = (kp[L_HIP][1] + kp[R_HIP][1]) / 2
    wrist_up = min(kp[L_WRIST][1], kp[R_WRIST][1]) < hip_y  # image y grows downward
    return knees < 165 and wrist_up


def feet(box, kp, conf) -> tuple[float, float]:
    """Between the ankles if both are visible, else the bottom middle of the box."""
    if conf[L_ANKLE] >= KP_CONF and conf[R_ANKLE] >= KP_CONF:
        return (kp[L_ANKLE][0] + kp[R_ANKLE][0]) / 2, (kp[L_ANKLE][1] + kp[R_ANKLE][1]) / 2
    x1, _, x2, y2 = box
    return (x1 + x2) / 2, y2


def on_court(x: float, y: float) -> bool:
    m = COURT_MARGIN
    return -m <= x <= COURT_WIDTH + m and -m <= y <= COURT_LENGTH + m


def detect(video_path: str, corners: list[tuple[float, float]], *, start_sec: float = 0, duration_sec: float | None = None,
           model_name: str = POSE_MODEL) -> tuple[list[Track], int, float]:
    """Tracks of everyone on court, plus the number of frames read and the clip's fps."""
    import cv2
    from ultralytics import YOLO

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()
    first = int(start_sec * fps)
    last = first + int(duration_sec * fps) if duration_sec else None

    h = court_homography(corners)
    model = YOLO(model_name)
    tracks: dict[int, Track] = {}
    frame = -1
    for frame, result in enumerate(model.track(source=video_path, tracker="bytetrack.yaml", stream=True, verbose=False, classes=[0])):
        if frame < first:
            continue
        if last is not None and frame >= last:
            break
        if result.boxes is None or result.boxes.id is None or result.keypoints is None:
            continue
        ids = result.boxes.id.int().tolist()
        boxes = result.boxes.xyxy.tolist()
        kps = result.keypoints.xy.tolist()
        confs = result.keypoints.conf.tolist() if result.keypoints.conf is not None else [[1.0] * 17] * len(ids)
        for tid, box, kp, conf in zip(ids, boxes, kps, confs):
            cx, cy = to_court(h, *feet(box, kp, conf))
            if not on_court(cx, cy):
                continue
            tracks.setdefault(tid, Track(tid)).points.append(Point(frame - first, cx, cy, ready_position(kp, conf)))
    total = (min(frame, last - 1) if last is not None else frame) - first + 1
    return list(tracks.values()), max(total, 0), fps
