"""Rally's vision pipeline (spec 010). Three commands, one per cached file in product/fixtures/clips/:

  python -m rally_vision assess  <clipId> <youtube-url> --player "near side, left, red shirt" [--start 1:42]
      Gemini watches the clip and grades the player -> <clipId>.gemini.json (cached; --refresh to redo)

  python -m rally_vision measure <clipId> <youtube-url> --video local.mp4 --corners x1,y1,...,x4,y4 --select x,y [--start 1:42 --duration 60]
      Local detection and tracking -> <clipId>.measured.json
      (fallback: write <clipId>.measured.json by hand, shaped like PlayerStats without "watched")

  python -m rally_vision build   <clipId>
      Combines the two -> <clipId>.json, the ClipStats the app reads
"""
from __future__ import annotations

import argparse
import json
import sys


def parse_corners(text: str) -> list[tuple[float, float]]:
    nums = [float(n) for n in text.split(",")]
    if len(nums) != 8:
        raise argparse.ArgumentTypeError("--corners needs 8 numbers: near-left, near-right, far-right, far-left as x,y pairs")
    return [(nums[i], nums[i + 1]) for i in range(0, 8, 2)]


def parse_point(text: str) -> tuple[float, float]:
    nums = [float(n) for n in text.split(",")]
    if len(nums) != 2:
        raise argparse.ArgumentTypeError("needs x,y")
    return nums[0], nums[1]


def parse_time(text: str) -> float:
    """Seconds, or m:ss."""
    if ":" in text:
        m, s = text.split(":", 1)
        return int(m) * 60 + float(s)
    return float(text)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="rally_vision", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("assess", help="Gemini grades one player")
    a.add_argument("clip_id")
    a.add_argument("source", help="Public YouTube link")
    a.add_argument("--player", required=True, help='Who to grade, by position and clothing: "near side, left, red shirt"')
    a.add_argument("--start", type=parse_time, help="Where rally play starts, seconds or m:ss")
    a.add_argument("--end", type=parse_time)
    a.add_argument("--fps", type=float, default=5)
    a.add_argument("--refresh", action="store_true", help="Ignore the cache and ask Gemini again")

    m = sub.add_parser("measure", help="Local detection and tracking")
    m.add_argument("clip_id")
    m.add_argument("source", help="The YouTube link (recorded in the output)")
    m.add_argument("--video", required=True, help="Local copy of the clip (never committed)")
    m.add_argument("--corners", type=parse_corners, required=True,
                   help="Court corners in pixels: near-left, near-right, far-right, far-left")
    m.add_argument("--select", type=parse_point, required=True,
                   help="x,y in court metres of the player to profile, in the first frame (VIS-5)")
    m.add_argument("--start", type=parse_time, default=0)
    m.add_argument("--duration", type=float, default=60)

    b = sub.add_parser("build", help="Combine into the ClipStats the app reads")
    b.add_argument("clip_id")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    from . import clips

    if args.cmd == "assess":
        from .gemini import RealGemini

        end = args.end if args.end is not None else (args.start + 60 if args.start is not None else None)
        result = clips.get_or_assess(RealGemini(), args.clip_id, args.source, args.player, refresh=args.refresh,
                                     fps=args.fps, start_sec=args.start, end_sec=end)
        print(json.dumps(result, indent=2))
        return 0
    if args.cmd == "measure":
        from .detect import detect
        from .measure import measure

        tracks, frames, fps = detect(args.video, args.corners, start_sec=args.start, duration_sec=args.duration)
        players = measure(tracks, frames, fps, click=args.select)
        path = clips.save_measured(args.clip_id, args.source, frames / fps, players)
        print(f"{len(players)} players -> {path}")
        return 0
    if args.cmd == "build":
        stats = clips.build_clip(args.clip_id)
        print(f"{args.clip_id}: {len(stats['players'])} players, ok")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
