"""Cached clip results in product/fixtures/clips/ (spec 010).

Per clip:
- <clipId>.gemini.json    Gemini's assessment of the selected player (cached: VIS-6)
- <clipId>.measured.json  measured players from detect.py, or written by hand as the fallback
- <clipId>.json           the final ClipStats the app reads, built from the two above
"""
from __future__ import annotations

import json
from pathlib import Path

from .gemini import GeminiClient, assess
from .schema import validate_clip_stats

CLIPS_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "clips"


def _path(clip_id: str, kind: str, base: Path) -> Path:
    return base / (f"{clip_id}.{kind}.json" if kind else f"{clip_id}.json")


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def get_or_assess(client: GeminiClient, clip_id: str, source: str, player: str, *, base: Path = CLIPS_DIR,
                  refresh: bool = False, **kw) -> dict:
    """The cached assessment if there is one (VIS-6), else ask Gemini and cache it."""
    path = _path(clip_id, "gemini", base)
    if path.exists() and not refresh:
        return json.loads(path.read_text())["assessment"]
    assessment = assess(client, source, player, **kw)
    meta = {k: getattr(client, k) for k in ("used_model", "used_processing") if getattr(client, k, None) is not None}
    window = kw.get("end_sec") - kw.get("start_sec") if kw.get("end_sec") is not None and kw.get("start_sec") is not None else None
    _write(path, {"clipId": clip_id, "source": source, "player": player, **meta,
                  **({"windowSec": window} if window else {}), "assessment": assessment})
    return assessment


def save_measured(clip_id: str, source: str, duration_sec: float, players: list[dict], *, base: Path = CLIPS_DIR) -> Path:
    path = _path(clip_id, "measured", base)
    _write(path, {"clipId": clip_id, "source": source, "durationSec": duration_sec, "players": players})
    return path


def build_clip(clip_id: str, *, base: Path = CLIPS_DIR, meta: dict | None = None) -> dict:
    """Combine measured players and Gemini's assessment into the final ClipStats, and write it.

    Without a measured file (court mapping wasn't possible), the clip has one player: the one
    Gemini graded, marked `measured: false`. `meta` adds channel, labeledLevel, startSec and
    scene4 from demo/clips.md.
    """
    measured_path = _path(clip_id, "measured", base)
    gemini_path = _path(clip_id, "gemini", base)
    gemini = json.loads(gemini_path.read_text()) if gemini_path.exists() else None
    if measured_path.exists():
        measured = json.loads(measured_path.read_text())
        players = [dict(p) for p in measured["players"]]
        source, duration = measured["source"], measured["durationSec"]
    elif gemini:
        players = [{"trackId": 0, "selected": True, "measured": False}]
        source, duration = gemini["source"], float(gemini.get("windowSec", 60))
    else:
        raise FileNotFoundError(f"{clip_id}: no measured or Gemini results yet")
    if gemini:
        for p in players:
            if p.get("selected"):
                p["watched"] = gemini["assessment"]
    stats = {"clipId": clip_id, "source": source, "durationSec": duration, "players": players,
             **{k: v for k, v in (meta or {}).items() if v is not None}}
    problems = validate_clip_stats(stats)
    if problems:
        raise ValueError(f"{clip_id}: " + "; ".join(problems))
    _write(_path(clip_id, "", base), stats)
    return stats
