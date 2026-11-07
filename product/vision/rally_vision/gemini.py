"""Gemini watches a clip and grades one player (spec 010, step 5).

`assess` builds the prompt, checks the reply against the schema, and retries once
(VIS-4). The real client is a thin adapter over google-genai's Interactions API;
tests use FakeGemini.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

from .schema import GEMINI_SCHEMA, validate_assessment

DEFAULT_MODEL = "gemini-3.8-flash"  # stable, takes video; checked 2026-11-07
DEFAULT_FPS = 5  # the default 1 fps misses fast play
RUBRIC_PATH = Path(__file__).resolve().parent.parent / "rubric.md"


@dataclass
class VideoRequest:
    source: str  # a public YouTube link
    prompt: str
    schema: dict
    fps: float = DEFAULT_FPS
    start_sec: float | None = None
    end_sec: float | None = None


class GeminiClient(Protocol):
    def generate(self, req: VideoRequest) -> str:
        """Gemini's reply text (expected to be JSON)."""
        ...


class AssessmentFailed(Exception):
    pass


def build_prompt(player: str, rubric: str) -> str:
    return f"""You are a pickleball coach grading one recreational player from video.

The player to grade: {player}
Watch only that player. Use the others only as context.

Count that player's shots by type, their unforced errors, and how often they reset a hard ball softly into the kitchen.
Of their third shots (the shot after the return, hit by the serving team), give the share that were drops, or null if they hit none.
Then grade their level with this rubric, as a range, and list two to four reasons naming behaviors you actually saw.

<rubric>
{rubric}
</rubric>

Reply with JSON only, matching the schema."""


def assess(client: GeminiClient, source: str, player: str, *, rubric: str | None = None, fps: float = DEFAULT_FPS,
           start_sec: float | None = None, end_sec: float | None = None) -> dict:
    """Gemini's GeminiAssessment for one player. Retries once on a bad reply (VIS-4)."""
    rubric = rubric if rubric is not None else RUBRIC_PATH.read_text()
    req = VideoRequest(source=source, prompt=build_prompt(player, rubric), schema=GEMINI_SCHEMA, fps=fps,
                       start_sec=start_sec, end_sec=end_sec)
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
            return data
    raise AssessmentFailed("Gemini's reply didn't match the schema twice: " + "; ".join(problems))


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
    """GEMINI_API_KEY from the environment, else from product/.env.local."""
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    env = Path(__file__).resolve().parents[2] / ".env.local"
    if env.exists():
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k.strip() == "GEMINI_API_KEY" and v.strip():
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

    def _video(self, req: VideoRequest, with_processing: bool) -> dict:
        video: dict = {"type": "video", "uri": req.source}
        if with_processing:
            processing: dict = {"type": "static", "fps": req.fps}
            if req.start_sec is not None:
                processing["start_offset"] = f"{req.start_sec:g}s"
            if req.end_sec is not None:
                processing["end_offset"] = f"{req.end_sec:g}s"
            video["processing"] = processing
        return video

    def generate(self, req: VideoRequest) -> str:
        # Custom fps is documented for uploaded files; for YouTube links it may be refused.
        # Try with it, and fall back to Gemini's default sampling if the request is rejected.
        last: Exception | None = None
        for with_processing in (True, False):
            try:
                interaction = self.client.interactions.create(
                    model=self.model,
                    input=[self._video(req, with_processing), {"type": "text", "text": req.prompt}],
                    response_format={"type": "text", "mime_type": "application/json", "schema": req.schema},
                )
                self.used_processing = with_processing
                return interaction.output_text
            except Exception as e:  # noqa: BLE001 - any API error: try once without processing
                last = e
        raise RuntimeError(f"Gemini request failed: {last}") from last
