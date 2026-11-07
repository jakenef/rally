"""Gemini watches a clip and grades one player (spec 010, step 5).

`assess` builds the prompt, checks the reply against the schema, and retries once
(VIS-4). The real client is a thin adapter over google-genai's Interactions API;
tests use FakeGemini.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from .schema import GEMINI_SCHEMA, validate_assessment

DEFAULT_MODEL = "gemini-3.8-flash"  # stable, takes video; checked 2026-11-07
FALLBACK_MODEL = "gemini-3.6-flash"  # also stable; used when the default is overloaded
DEFAULT_FPS = 5  # the default 1 fps misses fast play
RUBRIC_PATH = Path(__file__).resolve().parent.parent / "rubric.md"


@dataclass
class VideoRequest:
    source: str  # a public YouTube link, or a local file path (an upload, VIS-8)
    prompt: str
    schema: dict
    fps: float = DEFAULT_FPS
    start_sec: float | None = None
    end_sec: float | None = None
    reference_jpeg: bytes | None = None  # a crop of the picked player, so Gemini knows who to grade

    @property
    def is_local(self) -> bool:
        return not self.source.startswith(("http://", "https://"))


class GeminiClient(Protocol):
    def generate(self, req: VideoRequest) -> str:
        """Gemini's reply text (expected to be JSON)."""
        ...


class AssessmentFailed(Exception):
    pass


def build_prompt(player: str, rubric: str, *, has_reference: bool = False) -> str:
    who = (f"The player to grade is the person in the attached image, cropped from the video {player}."
           if has_reference else f"The player to grade: {player}")
    return f"""You are a pickleball coach grading one recreational player from video.

{who}
Watch only that player. Use the others only as context.

Count that player's shots by type, their unforced errors, and how often they reset a hard ball softly into the kitchen.
Of their third shots (the shot after the return, hit by the serving team), give the share that were drops, or null if they hit none.
Then grade their level with this rubric, as a range, and list two to four reasons naming behaviors you actually saw.
Also list every shot that player hit as an event: the time on the video's own timeline in seconds (as the video player shows it), the kind of shot, and a short, fun callout of one to three words a broadcaster might say ("Third-shot drop", "Soft reset", "Put-away", "Into the net").

<rubric>
{rubric}
</rubric>

Reply with JSON only, matching the schema."""


def assess(client: GeminiClient, source: str, player: str, *, rubric: str | None = None, fps: float = DEFAULT_FPS,
           start_sec: float | None = None, end_sec: float | None = None, reference_jpeg: bytes | None = None) -> dict:
    """Gemini's GeminiAssessment for one player. Retries once on a bad reply (VIS-4).
    Shot events are cleaned (VIS-7): wrong kinds, long labels and times outside the window are dropped."""
    rubric = rubric if rubric is not None else RUBRIC_PATH.read_text()
    req = VideoRequest(source=source, prompt=build_prompt(player, rubric, has_reference=reference_jpeg is not None),
                       schema=GEMINI_SCHEMA, fps=fps, start_sec=start_sec, end_sec=end_sec, reference_jpeg=reference_jpeg)
    problems: list[str] = []
    for _ in range(2):
        text = client.generate(req)
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            problems = ["reply was not JSON"]
            continue
        problems = validate_assessment(data)
        if not problems:
            data["events"] = clean_events(data.get("events"), start_sec, end_sec)
            return data
    raise AssessmentFailed("Gemini's reply didn't match the schema twice: " + "; ".join(problems))


EVENT_KINDS = {"dink", "drive", "drop", "lob", "volley", "serve", "return", "reset", "speedup", "putaway", "error"}


def clean_events(events, start_sec: float | None, end_sec: float | None) -> list[dict]:
    """VIS-7: keep well-formed shot events inside the watched window, sorted by time.

    Gemini sometimes counts from the start of the watched window instead of the video's own
    timeline; when every time fits the window length but none fits the window itself, shift them."""
    if not isinstance(events, list):
        return []
    rows = []
    for e in events:
        if not isinstance(e, dict):
            continue
        t, kind, label = e.get("t"), e.get("shot"), e.get("label")
        if not isinstance(t, (int, float)) or isinstance(t, bool) or kind not in EVENT_KINDS or not isinstance(label, str):
            continue
        label = label.strip()
        if not label or len(label.split()) > 3:
            continue
        rows.append({"t": float(t), "shot": kind, "label": label})
    lo = start_sec or 0.0
    hi = end_sec if end_sec is not None else float("inf")
    if rows and lo > 0 and all(r["t"] < lo for r in rows) and all(r["t"] <= hi - lo for r in rows):
        for r in rows:
            r["t"] += lo  # relative to the window: move onto the video's timeline
    return sorted((r for r in rows if lo - 1 <= r["t"] <= hi + 1), key=lambda r: r["t"])


# ---------- fake ----------


@dataclass
class FakeGemini:
    """Replies with each queued text in turn (the last one repeats)."""

    replies: list[str]
    calls: list[VideoRequest] = field(default_factory=list)

    def generate(self, req: VideoRequest) -> str:
        self.calls.append(req)
        return self.replies[min(len(self.calls), len(self.replies)) - 1]


# ---------- real ----------


def load_api_key() -> str | None:
    """GEMINI_API_KEY from the environment, else from product/.env.local, else product/.env."""
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    product = Path(__file__).resolve().parents[2]
    for env in (product / ".env.local", product / ".env"):
        if not env.exists():
            continue
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k.strip().removeprefix("export ").strip() == "GEMINI_API_KEY" and v.strip():
                return v.strip().strip('"').strip("'")
    return None


class RealGemini:
    """google-genai Interactions API. Install with `pip install -e ".[gemini]"`."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        from google import genai  # imported here so tests don't need the package

        key = api_key or load_api_key()
        if not key:
            raise RuntimeError("No GEMINI_API_KEY: put it in product/.env.local (never in git)")
        self.client = genai.Client(api_key=key)
        self.model = model or os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
        self.used_processing: bool | None = None
        self.used_model: str | None = None
        self._uploads: dict[str, tuple[str, str]] = {}

    def _upload(self, path: str) -> tuple[str, str]:
        """Send a local video through the Files API and wait until Gemini can read it (VIS-8)."""
        cached = self._uploads.get(path)
        if cached:
            return cached
        log(f"uploading {Path(path).name} to Gemini")
        f = self.client.files.upload(file=path)
        started = time.monotonic()
        while str(getattr(f.state, "name", f.state)).upper().endswith("PROCESSING"):
            if time.monotonic() - started > 300:
                raise RuntimeError("Gemini took over 5 minutes to process the upload")
            time.sleep(2)
            f = self.client.files.get(name=f.name)
        if str(getattr(f.state, "name", f.state)).upper().endswith("FAILED"):
            raise RuntimeError("Gemini couldn't read this video")
        log(f"upload ready after {time.monotonic() - started:.0f}s")
        self._uploads[path] = (f.uri, f.mime_type or "video/mp4")
        return self._uploads[path]

    def _video(self, req: VideoRequest, with_processing: bool) -> dict:
        if req.is_local:
            uri, mime = self._upload(req.source)
            video: dict = {"type": "video", "uri": uri, "mime_type": mime}
        else:
            video = {"type": "video", "uri": req.source}
        if with_processing:
            processing: dict = {"type": "static", "fps": req.fps}
            if req.start_sec is not None:
                processing["start_offset"] = f"{req.start_sec:g}s"
            if req.end_sec is not None:
                processing["end_offset"] = f"{req.end_sec:g}s"
            video["processing"] = processing
        return video

    def _prompt(self, req: VideoRequest, with_processing: bool) -> str:
        # Without `processing` Gemini sees the whole video, so name the window in words.
        if with_processing or req.start_sec is None:
            return req.prompt
        end = f" to {_mmss(req.end_sec)}" if req.end_sec is not None else ""
        return f"Watch only from {_mmss(req.start_sec)}{end} of the video.\n\n{req.prompt}"

    @staticmethod
    def _reference(req: VideoRequest) -> list[dict]:
        if req.reference_jpeg is None:
            return []
        import base64

        return [{"type": "image", "data": base64.b64encode(req.reference_jpeg).decode(), "mime_type": "image/jpeg"}]

    def _call(self, model: str, req: VideoRequest, with_processing: bool) -> str:
        interaction = self.client.interactions.create(
            model=model,
            input=[self._video(req, with_processing), *self._reference(req), {"type": "text", "text": self._prompt(req, with_processing)}],
            response_format={"type": "text", "mime_type": "application/json", "schema": req.schema},
            timeout=CALL_TIMEOUT_SEC,
        )
        return interaction.output_text

    def generate(self, req: VideoRequest) -> str:
        """One reply. Retries overloads (429, 5xx) and timeouts with backoff, switching to the
        fallback model after two; drops the custom fps only if Google rejects the request (400).
        Prints a line for every step so long waits are visible."""
        from google.genai._gaos.lib.compat_errors import APIConnectionError, APIStatusError

        with_processing = True
        model = self.model
        last: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            started = time.monotonic()
            log(f"asking {model}{'' if with_processing else ' (default frame rate)'}, attempt {attempt + 1} of {MAX_ATTEMPTS}")
            try:
                with _ticker(started):
                    text = self._call(model, req, with_processing)
                log(f"answered in {time.monotonic() - started:.0f}s")
                self.used_processing, self.used_model = with_processing, model
                return text
            except APIStatusError as e:
                last = e
                status = e.status_code or 0
                if status == 400 and with_processing:
                    log("Google rejected the custom frame rate for this video; retrying with its default sampling")
                    with_processing = False
                    continue
                if status not in (429, 500, 502, 503, 504):
                    raise RuntimeError(f"Gemini request failed ({status}): {e}") from e
                reason = "overloaded" if status in (429, 503) else f"server error {status}"
            except APIConnectionError as e:  # includes timeouts
                last = e
                reason = f"no answer within {CALL_TIMEOUT_SEC}s" if "imeout" in type(e).__name__ else "connection failed"
            if attempt >= 1 and model != FALLBACK_MODEL:
                model = FALLBACK_MODEL
            wait = min(30, 4 * 2**attempt)
            if attempt + 1 < MAX_ATTEMPTS:
                log(f"{reason}; waiting {wait}s, then trying {model}")
                time.sleep(wait)
        raise RuntimeError(f"Gemini gave no answer after {MAX_ATTEMPTS} attempts: {last}") from last


CALL_TIMEOUT_SEC = 180
MAX_ATTEMPTS = 5


def log(msg: str) -> None:
    """Progress lines on stderr, so stdout stays clean JSON."""
    print(f"  {time.strftime('%H:%M:%S')} {msg}", file=sys.stderr, flush=True)


class _ticker:
    """Prints 'still waiting (Ns)' every 15 seconds while a call is in flight."""

    def __init__(self, started: float, every: float = 15):
        self.started, self.every = started, every
        self._stop = threading.Event()

    def __enter__(self):
        def run():
            while not self._stop.wait(self.every):
                log(f"still waiting ({time.monotonic() - self.started:.0f}s)")
        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *exc):
        self._stop.set()
        return False


def _mmss(sec: float) -> str:
    return f"{int(sec // 60)}:{int(sec % 60):02d}"
