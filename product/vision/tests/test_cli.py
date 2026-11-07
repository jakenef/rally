import argparse

import pytest

from rally_vision.__main__ import build_parser, parse_corners, parse_time


def test_parse_corners_takes_eight_numbers():
    assert parse_corners("0,0,10,0,10,20,0,20") == [(0, 0), (10, 0), (10, 20), (0, 20)]
    with pytest.raises(argparse.ArgumentTypeError):
        parse_corners("1,2,3")


def test_parse_time_takes_seconds_or_minutes():
    assert parse_time("90") == 90
    assert parse_time("1:42") == 102


def test_assess_command_parses():
    args = build_parser().parse_args(["assess", "c1", "https://youtu.be/x", "--player", "near left", "--start", "0:30"])
    assert (args.cmd, args.clip_id, args.player, args.start, args.fps) == ("assess", "c1", "near left", 30, 5)


def test_reads_the_clips_table(tmp_path):
    from rally_vision.__main__ import read_clips_table

    md = tmp_path / "clips.md"
    md.write_text(
        "| Clip | Channel | Labeled level | Players we use | Start time | Used in |\n| --- | --- | --- | --- | --- | --- |\n"
        "| [abc](https://www.youtube.com/watch?v=abc) | Chan | 4.5+ | near side: red shirt | 1:15 | answer key |\n"
    )
    [row] = read_clips_table(md)
    assert row == {"clipId": "abc", "source": "https://www.youtube.com/watch?v=abc", "channel": "Chan", "level": 4.5,
                   "player": "near side: red shirt", "start": 75.0}


def test_VIS_6_assess_all_uses_cached_clips_without_creating_a_paid_client(tmp_path, monkeypatch, capsys):
    from rally_vision import clips
    from rally_vision import __main__ as cli
    from rally_vision import gemini

    (tmp_path / "abc.gemini.json").write_text('{"assessment": {}}')
    monkeypatch.setattr(clips, "CLIPS_DIR", tmp_path)
    monkeypatch.setattr(cli, "read_clips_table", lambda: [{"clipId": "abc", "player": "near left"}])
    monkeypatch.setattr(gemini, "RealGemini", lambda: pytest.fail("paid client should not be created for a cached clip"))

    assert cli.main(["assess-all", "--only", "abc"]) == 0
    assert "[1/1] abc: cached, skipped" in capsys.readouterr().out
