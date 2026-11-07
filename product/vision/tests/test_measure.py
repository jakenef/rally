import math

from rally_vision.measure import (FAR_KITCHEN_LINE, NEAR_KITCHEN_LINE, Point, Track, keep_tracks, measure,
                                  measure_track, select_track)

FPS = 30


def still(track_id, x, y, frames, ready=None, start=0):
    return Track(track_id, [Point(start + f, x, y, ready) for f in range(frames)])


def test_VIS_2_kitchen_line_share_matches_time_at_the_line():
    # 80 frames 0.5 m behind the near kitchen line, 20 frames back at the baseline
    pts = [Point(f, 2.0, NEAR_KITCHEN_LINE - 0.5) for f in range(80)] + [Point(80 + f, 2.0, 0.5) for f in range(20)]
    stats = measure_track(Track(1, pts), [], FPS)
    assert 0.7 <= stats["kitchenLineShare"] <= 0.9


def test_VIS_2_far_side_players_use_the_far_kitchen_line():
    stats = measure_track(still(1, 3.0, FAR_KITCHEN_LINE + 0.4, 50), [], FPS)
    assert stats["kitchenLineShare"] == 1.0


def test_VIS_3_tracks_seen_in_under_10_percent_of_frames_are_dropped():
    tracks = [still(1, 1, 1, 100), still(2, 2, 2, 9), still(3, 3, 3, 10)]
    assert [t.track_id for t in keep_tracks(tracks, 100)] == [1, 3]


def test_VIS_5_selects_the_track_nearest_the_click_in_the_first_frame():
    a = Track(1, [Point(0, 1.0, 1.0), Point(1, 5.0, 5.0)])
    b = Track(2, [Point(0, 4.0, 4.0)])
    assert select_track([a, b], (1.2, 1.1)) == 1
    assert select_track([a, b], (4.1, 3.9)) == 2


def test_VIS_5_measure_marks_exactly_the_clicked_player_selected():
    tracks = [still(1, 1, 1, 50), still(2, 5, 1, 50)]
    out = measure(tracks, 50, FPS, click=(5, 1))
    assert [p["trackId"] for p in out if p.get("selected")] == [2]


def test_speed_and_distance_from_steady_movement():
    # 1.5 m/s along the court for 2 seconds
    pts = [Point(f, 2.0, 1.0 + 1.5 * f / FPS) for f in range(61)]
    stats = measure_track(Track(1, pts), [], FPS)
    assert math.isclose(stats["distanceM"], 3.0, abs_tol=0.1)
    assert math.isclose(stats["avgSpeedMps"], 1.5, abs_tol=0.01)


def test_tracking_glitches_are_ignored():
    pts = [Point(0, 1.0, 1.0), Point(1, 6.0, 12.0), Point(2, 1.0, 1.05)]  # one impossible jump
    stats = measure_track(Track(1, pts), [], FPS)
    assert stats["peakSpeedMps"] < 8


def test_ready_share_and_partner_spacing():
    me = still(1, 1.0, 3.0, 10, ready=True)
    me.points[0].ready = False
    partner = still(2, 4.0, 3.0, 10)  # same side, 3 m away
    opponent = still(3, 1.0, 10.0, 10)  # other side
    stats = measure_track(me, [partner, opponent], FPS)
    assert stats["readyPositionShare"] == 0.9
    assert stats["avgPartnerSpacingM"] == 3.0


def test_overlay_picks_the_box_under_the_point_nearest_the_requested_time():
    from rally_vision.overlay import pick_track

    frames = [
        [9.0, [[1, 0.1, 0.1, 0.2, 0.4], [2, 0.6, 0.5, 0.7, 0.9]]],
        [10.0, [[1, 0.6, 0.5, 0.7, 0.9], [2, 0.1, 0.1, 0.2, 0.4]]],  # the two swapped places
        [11.0, []],
    ]
    assert pick_track(frames, 0.65, 0.7, at_sec=10) == 1
    assert pick_track(frames, 0.15, 0.2, at_sec=10) == 2
    assert pick_track([], 0.5, 0.5, at_sec=10) is None


def test_following_survives_an_id_switch_and_ignores_a_reused_id_elsewhere():
    from rally_vision.overlay import follow

    walk = lambda x: [x, 0.5, x + 0.1, 0.9]  # noqa: E731 - a player walking right
    frames = [
        [0.0, [[1, *walk(0.10)], [2, *walk(0.70)]]],
        [0.1, [[1, *walk(0.12)], [2, *walk(0.70)]]],
        [0.2, [[5, *walk(0.14)], [2, *walk(0.70)]]],  # tracker renamed our player 1 -> 5
        [0.3, [[5, *walk(0.16)], [1, *walk(0.70)]]],  # and reused 1 for someone far away
    ]
    assert follow(frames, anchor_id=1, at_sec=0.0) == [1, 1, 5, 5]


def test_following_by_look_keeps_the_right_player_when_two_cross():
    from rally_vision.overlay import follow_by_look

    box = lambda x: [x, 0.5, x + 0.1, 0.9]  # noqa: E731
    red, blue = [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]
    # our player (red, id 1) walks right; another (blue, id 2) walks left; they cross at frame 2
    xs_red, xs_blue = [0.30, 0.34, 0.38, 0.42], [0.46, 0.42, 0.38, 0.34]
    frames = [[i * 0.1, [[1, *box(r)], [2, *box(b)]]] for i, (r, b) in enumerate(zip(xs_red, xs_blue))]
    # at the crossing the tracker swaps their IDs
    frames[3][1] = [[2, *box(xs_red[3])], [1, *box(xs_blue[3])]]
    looks = [{1: red, 2: blue}, {1: red, 2: blue}, {1: red, 2: blue}, {2: red, 1: blue}]
    assert follow_by_look(frames, looks, anchor_id=1, at_sec=0.0) == [1, 1, 1, 2]


def test_find_video_matches_the_clip_id_anywhere_in_the_name(tmp_path, monkeypatch):
    from pathlib import Path

    from rally_vision import overlay

    clips = tmp_path / "demo" / "clips"
    clips.mkdir(parents=True)
    (clips / "clip-06-wise-pickleball-4.5-RijUJWIBe_o.mp4").write_bytes(b"")
    (clips / "old_style_abc123_0000-0060.mp4").write_bytes(b"")
    fake_module = tmp_path / "product" / "vision" / "rally_vision" / "overlay.py"
    monkeypatch.setattr(overlay, "__file__", str(fake_module))
    assert overlay.find_video("RijUJWIBe_o") == Path(clips / "clip-06-wise-pickleball-4.5-RijUJWIBe_o.mp4")
    assert overlay.find_video("abc123") is not None
    assert overlay.find_video("missing") is None
