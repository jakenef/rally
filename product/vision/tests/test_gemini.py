import json

import pytest

from rally_vision import clips
from rally_vision.gemini import AssessmentFailed, FakeGemini, assess, build_prompt
from rally_vision.schema import validate_assessment, validate_clip_stats

GOOD = {
    "shots": {"dink": 10, "drive": 2, "drop": 3, "lob": 0, "volley": 4, "serve": 2, "return": 2},
    "thirdShotDropShare": 0.67,
    "unforcedErrors": 1,
    "resetsUnderPressure": 2,
    "levelEstimate": {"low": 3.5, "high": 4.0},
    "reasons": ["Gets to the kitchen line after every return"],
}


def test_prompt_names_the_player_and_includes_the_rubric():
    p = build_prompt("near side, left, red shirt", "RUBRIC TEXT")
    assert "near side, left, red shirt" in p and "RUBRIC TEXT" in p


def test_VIS_4_a_valid_reply_is_returned_after_one_call():
    fake = FakeGemini([json.dumps(GOOD)])
    assert assess(fake, "yt", "p", rubric="r") == GOOD
    assert len(fake.calls) == 1
    assert fake.calls[0].fps == 5


def test_VIS_4_a_bad_reply_is_retried_once():
    fake = FakeGemini(["not json", json.dumps(GOOD)])
    assert assess(fake, "yt", "p", rubric="r") == GOOD
    assert len(fake.calls) == 2


def test_VIS_4_two_bad_replies_fail_the_clip():
    bad = dict(GOOD, levelEstimate={"low": 4.5, "high": 3.0})
    fake = FakeGemini([json.dumps(bad)])
    with pytest.raises(AssessmentFailed, match="levelEstimate"):
        assess(fake, "yt", "p", rubric="r")
    assert len(fake.calls) == 2


def test_validate_assessment_catches_missing_and_out_of_range_fields():
    assert validate_assessment(GOOD) == []
    assert validate_assessment(dict(GOOD, thirdShotDropShare=1.5))
    assert validate_assessment(dict(GOOD, reasons=[]))
    assert validate_assessment({k: v for k, v in GOOD.items() if k != "shots"})


def test_VIS_6_a_cached_clip_is_served_without_calling_gemini(tmp_path):
    fake = FakeGemini([json.dumps(GOOD)])
    first = clips.get_or_assess(fake, "c1", "yt", "p", base=tmp_path, rubric="r")
    second = clips.get_or_assess(fake, "c1", "yt", "p", base=tmp_path, rubric="r")
    assert first == second == GOOD
    assert len(fake.calls) == 1
    clips.get_or_assess(fake, "c1", "yt", "p", base=tmp_path, rubric="r", refresh=True)
    assert len(fake.calls) == 2


def test_VIS_1_build_writes_clip_stats_from_measured_players_and_gemini(tmp_path):
    fake = FakeGemini([json.dumps(GOOD)])
    clips.get_or_assess(fake, "c1", "yt", "p", base=tmp_path, rubric="r")
    player = {"trackId": 1, "framesSeen": 100, "kitchenLineShare": 0.5, "distanceM": 80.0, "avgPartnerSpacingM": 3.0,
              "readyPositionShare": 0.6, "avgSpeedMps": 1.5, "peakSpeedMps": 4.0}
    clips.save_measured("c1", "yt", 60, [dict(player, selected=True), dict(player, trackId=2)], base=tmp_path)
    stats = clips.build_clip("c1", base=tmp_path)
    assert validate_clip_stats(stats) == []
    assert json.loads((tmp_path / "c1.json").read_text()) == stats
    assert stats["players"][0]["watched"] == GOOD
    assert "watched" not in stats["players"][1]


def test_VIS_1_build_refuses_stats_without_a_selected_player(tmp_path):
    player = {"trackId": 1, "framesSeen": 100, "kitchenLineShare": 0.5, "distanceM": 80.0, "avgPartnerSpacingM": None,
              "readyPositionShare": 0.6, "avgSpeedMps": 1.5, "peakSpeedMps": 4.0}
    clips.save_measured("c2", "yt", 60, [player], base=tmp_path)
    with pytest.raises(ValueError, match="selected"):
        clips.build_clip("c2", base=tmp_path)


def test_the_sample_fixture_is_valid_clip_stats():
    sample = json.loads((clips.CLIPS_DIR.parent / "sample-stats.json").read_text())
    assert validate_clip_stats(sample) == []
