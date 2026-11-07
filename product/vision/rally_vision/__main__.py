"""python -m rally_vision <clip> --corners x1,y1,...,x4,y4 --out stats.json"""
import argparse
import sys


def parse_corners(text: str) -> list[tuple[float, float]]:
    nums = [float(n) for n in text.split(",")]
    if len(nums) != 8:
        raise argparse.ArgumentTypeError("--corners needs 8 numbers: x1,y1,x2,y2,x3,y3,x4,y4")
    return [(nums[i], nums[i + 1]) for i in range(0, 8, 2)]


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="rally_vision", description="Clip in, ClipStats JSON out (spec 010).")
    p.add_argument("clip", help="Path to a local clip, or a YouTube link")
    p.add_argument("--corners", type=parse_corners, required=True, help="The court's four corners in the first frame")
    p.add_argument("--select", help="x,y of the player to profile in the first frame (VIS-5)")
    p.add_argument("--out", required=True, help="Where to write the ClipStats JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    build_parser().parse_args(argv)
    print("rally_vision is not built yet (BUILD.md step 2.1)", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
