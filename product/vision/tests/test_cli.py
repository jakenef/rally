import argparse

import pytest

from rally_vision.__main__ import main, parse_corners


def test_parse_corners_takes_eight_numbers():
    assert parse_corners("0,0,10,0,10,20,0,20") == [(0, 0), (10, 0), (10, 20), (0, 20)]
    with pytest.raises(argparse.ArgumentTypeError):
        parse_corners("1,2,3")


def test_main_says_not_built_yet(capsys):
    assert main(["clip.mp4", "--corners", "0,0,1,0,1,1,0,1", "--out", "x.json"]) == 1
    assert "not built yet" in capsys.readouterr().err
