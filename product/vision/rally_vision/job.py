"""Uploaded clips (spec 025): find the players on a frame, then analyze the picked one.

The app runs these as subprocesses and reads <job>/status.json for progress:

  python -m rally_vision players <video> --t 12.4          -> JSON boxes on that frame (VIS-9)
  python -m rally_vision analyze <job_dir> --t 12.4 --box x1,y1,x2,y2
      tracking and Gemini run side by side -> <job>/overlay.json, <job>/gemini.json, status "done"
"""
from __future__ import annotations

import json
import threading
import time
import traceback
from pathlib import Path

TRACK_MAX_SEC = 60  # tracking covers the first minute (025 non-goals)
WATCH_MAX_SEC = 180  # Gemini watches up to three minutes
DETECT_MODEL = "yolo11n.pt"


def video_info(video: Path) -> dict:
    import cv2

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise ValueError("This file isn't a video Rally can read.")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    info = {"fps": fps, "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "durationSec": (cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0) / fps}
    cap.release()
    if not info["width"] or not info["durationSec"]:
        raise ValueError("This file isn't a video Rally can read.")
    return info


def read_frame(video: Path, t: float):
    import cv2

    cap = cv2.VideoCapture(str(video))
    cap.set(cv2.CAP_PROP_POS_MSEC, max(t, 0) * 1000)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise ValueError(f"Couldn't read the frame at {t:.1f}s.")
    return frame


def players_on_frame(video: Path, t: float) -> dict:
    """VIS-9: every person on the frame at t, as 0..1 boxes, biggest first."""
    from ultralytics import YOLO

    from .overlay import _device

    frame = read_frame(video, t)
    h, w = frame.shape[:2]
    result = YOLO(DETECT_MODEL)(frame, classes=[0], conf=0.35, verbose=False, device=_device())[0]
    boxes = []
    for x1, y1, x2, y2 in (result.boxes.xyxy.tolist() if result.boxes is not None else []):
        if (y2 - y1) / h < 0.06:
            continue  # too far away to be a player you'd pick
        boxes.append([round(x1 / w, 4), round(y1 / h, 4), round(x2 / w, 4), round(y2 / h, 4)])
    boxes.sort(key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)
    return {"t": t, "boxes": boxes}


def reference_crop(video: Path, t: float, box: list[float]) -> bytes:
    """VIS-8: the picked player, cropped from the frame with a little margin, as JPEG."""
    import cv2

    frame = read_frame(video, t)
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = box
    mx, my = (x2 - x1) * 0.15, (y2 - y1) * 0.1
    crop = frame[int(max(0, y1 - my) * h):int(min(1, y2 + my) * h), int(max(0, x1 - mx) * w):int(min(1, x2 + mx) * w)]
    ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise ValueError("Couldn't crop the picked player.")
    return buf.tobytes()


class Status:
    """Thread-safe progress for <job>/status.json (025 JobStatus)."""

    def __init__(self, job: Path):
        self.path = job / "status.json"
        self.lock = threading.Lock()
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {}
        self.data.update(stage="analyzing", error=None, started=time.time(), steps=[
            {"name": "Tracking the players", "state": "running", "detail": "Starting"},
            {"name": "Gemini is watching you play", "state": "running", "detail": "Starting"},
        ])
        self.save()

    def step(self, i: int, **kw) -> None:
        with self.lock:
            self.data["steps"][i].update(kw)
            self.save()

    def finish(self, **kw) -> None:
        with self.lock:
            self.data.update(kw)
            self.save()

    def save(self) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data))
        tmp.replace(self.path)  # never a half-written file for the page to read


def analyze(job: Path, t: float, box: list[float]) -> int:
    """Tracking and Gemini side by side for an uploaded clip (025 step 3)."""
    from .clips import get_or_assess
    from .gemini import RealGemini
    from .overlay import track_boxes

    video = next(job.glob("clip.*"))
    status = Status(job)
    info = video_info(video)
    errors: list[str] = []

    def tracking():
        try:
            cx, cy = (box[0] + box[2]) / 2 * info["width"], (box[1] + box[3]) / 2 * info["height"]
            data = track_boxes(video, (cx, cy), t, max_sec=TRACK_MAX_SEC,
                               progress=lambda f: status.step(0, detail=f"{f:.0%} of the first minute"))
            (job / "overlay.json").write_text(json.dumps(data, separators=(",", ":")))
            seen = sum(1 for f in data["frames"] if f[2] is not None) / max(len(data["frames"]), 1)
            status.step(0, state="done", detail=f"Followed you in {seen:.0%} of the frames")
        except Exception as e:  # noqa: BLE001
            errors.append(f"Tracking failed: {e}")
            status.step(0, state="failed", detail=str(e)[:200])

    def watching():
        started = time.monotonic()
        stop = threading.Event()

        def tick():
            while not stop.wait(1):
                status.step(1, detail=f"Watching ({time.monotonic() - started:.0f}s)")

        threading.Thread(target=tick, daemon=True).start()
        try:
            crop = reference_crop(video, t, box)
            (job / "you.jpg").write_bytes(crop)
            mm, ss = int(t // 60), int(t % 60)
            end = min(info["durationSec"], WATCH_MAX_SEC)
            get_or_assess(RealGemini(), "upload", str(video), f"at {mm}:{ss:02d}", base=job, refresh=True,
                          start_sec=0, end_sec=end, reference_jpeg=crop)
            stop.set()
            status.step(1, state="done", detail=f"Done in {time.monotonic() - started:.0f}s")
        except Exception as e:  # noqa: BLE001
            stop.set()
            errors.append(f"Gemini failed: {e}")
            status.step(1, state="failed", detail=str(e)[:200])

    threads = [threading.Thread(target=tracking), threading.Thread(target=watching)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    gemini_ok = (job / "upload.gemini.json").exists()
    if gemini_ok:
        status.finish(stage="done", error=None if not errors else "; ".join(errors))
    else:
        status.finish(stage="failed", error="; ".join(errors) or "Analysis failed")
    return 0 if gemini_ok else 1


def run_analyze(job: Path, t: float, box: list[float]) -> int:
    try:
        return analyze(job, t, box)
    except Exception as e:  # noqa: BLE001 - always leave a status the page can show (ONB-6)
        (job / "status.json").write_text(json.dumps({"stage": "failed", "error": str(e), "trace": traceback.format_exc()[-2000:], "steps": []}))
        return 1
