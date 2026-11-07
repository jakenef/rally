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
