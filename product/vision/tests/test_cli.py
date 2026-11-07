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
