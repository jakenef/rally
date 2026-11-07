"""The shapes the pipeline writes (spec 010), mirrored from packages/types.

GEMINI_SCHEMA is sent to Gemini as the JSON schema for its reply. Gemini doesn't
enforce every constraint, so validate_assessment checks the reply here (VIS-4).
"""
from __future__ import annotations

SHOT_TYPES = ["dink", "drive", "drop", "lob", "volley", "serve", "return"]

GEMINI_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "shots": {
            "type": "object",
            "description": "How many of each shot the described player hit in the clip.",
            "properties": {s: {"type": "integer"} for s in SHOT_TYPES},
            "required": SHOT_TYPES,
        },
        "thirdShotDropShare": {
            "type": ["number", "null"],
            "description": "Of this player's third shots, the share (0 to 1) that were drops. null if they hit no third shots.",
        },
        "unforcedErrors": {"type": "integer", "description": "Errors by this player that weren't forced by the opponent."},
        "resetsUnderPressure": {"type": "integer", "description": "Hard balls this player blocked softly into the kitchen."},
        "levelEstimate": {
            "type": "object",
            "description": "The player's level on the rubric, 2.0 to 6.0.",
            "properties": {"low": {"type": "number"}, "high": {"type": "number"}},
            "required": ["low", "high"],
        },
        "reasons": {
            "type": "array",
            "description": "Two to four short sentences on what you saw this player do, each naming a behavior from the rubric.",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
        },
    },
    "required": ["shots", "thirdShotDropShare", "unforcedErrors", "resetsUnderPressure", "levelEstimate", "reasons"],
}


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate_assessment(a) -> list[str]:
    """Problems with a GeminiAssessment; empty means it's valid."""
    if not isinstance(a, dict):
        return ["not an object"]
    errs = []
    shots = a.get("shots")
    if not isinstance(shots, dict):
        errs.append("shots missing")
    else:
        for s in SHOT_TYPES:
            v = shots.get(s)
            if not (isinstance(v, int) and not isinstance(v, bool) and v >= 0):
                errs.append(f"shots.{s} must be a whole number, 0 or more")
    tsd = a.get("thirdShotDropShare", "missing")
    if not (tsd is None or (_num(tsd) and 0 <= tsd <= 1)):
        errs.append("thirdShotDropShare must be 0..1 or null")
    for k in ("unforcedErrors", "resetsUnderPressure"):
        v = a.get(k)
        if not (isinstance(v, int) and not isinstance(v, bool) and v >= 0):
            errs.append(f"{k} must be a whole number, 0 or more")
    lvl = a.get("levelEstimate")
    if not (isinstance(lvl, dict) and _num(lvl.get("low")) and _num(lvl.get("high"))):
        errs.append("levelEstimate needs low and high")
    elif not (2.0 <= lvl["low"] <= lvl["high"] <= 6.0):
        errs.append("levelEstimate must satisfy 2.0 <= low <= high <= 6.0")
    reasons = a.get("reasons")
    if not (isinstance(reasons, list) and reasons and all(isinstance(r, str) and r.strip() for r in reasons)):
        errs.append("reasons must be a non-empty list of sentences")
    return errs


PLAYER_FIELDS = {
    "trackId": int,
    "framesSeen": int,
    "kitchenLineShare": float,
    "distanceM": float,
    "readyPositionShare": float,
    "avgSpeedMps": float,
    "peakSpeedMps": float,
}


def validate_clip_stats(c) -> list[str]:
    """Problems with a ClipStats; empty means it's valid (VIS-1)."""
    if not isinstance(c, dict):
        return ["not an object"]
    errs = []
    for k, t in (("clipId", str), ("source", str)):
        if not isinstance(c.get(k), t):
            errs.append(f"{k} must be a string")
    if not _num(c.get("durationSec")):
        errs.append("durationSec must be a number")
    players = c.get("players")
    if not isinstance(players, list) or not players:
        return errs + ["players must be a non-empty list"]
    for i, p in enumerate(players):
        for k, t in PLAYER_FIELDS.items():
            v = p.get(k)
            ok = isinstance(v, int) and not isinstance(v, bool) if t is int else _num(v)
            if not ok:
                errs.append(f"players[{i}].{k} must be a number")
        for k in ("kitchenLineShare", "readyPositionShare"):
            if _num(p.get(k)) and not 0 <= p[k] <= 1:
                errs.append(f"players[{i}].{k} must be 0..1")
        if "watched" in p:
            errs += [f"players[{i}].watched: {e}" for e in validate_assessment(p["watched"])]
    if sum(1 for p in players if p.get("selected")) != 1:
        errs.append("exactly one player must be selected")
    return errs
