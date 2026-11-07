import type { ShotEvent } from "@rally/types";
import { describe, expect, it } from "vitest";
import { calloutsAt, CALLOUT_SEC, countsAt } from "./shots";

const events: ShotEvent[] = [
  { t: 32, shot: "serve", label: "Deep serve" },
  { t: 35, shot: "drop", label: "Third-shot drop" },
  { t: 36, shot: "dink", label: "Dink" },
  { t: 41, shot: "error", label: "Into the net" },
];

describe("025 shot callouts and counts", () => {
  it("ONB-4 a callout shows from its time for about 1.5 seconds, on the playing video's clock", () => {
    // the local clip starts 30 s into the YouTube video: offset 30
    expect(calloutsAt(events, 30, 4.9).map((e) => e.label)).toEqual([]);
    expect(calloutsAt(events, 30, 5.0).map((e) => e.label)).toEqual(["Third-shot drop"]);
    expect(calloutsAt(events, 30, 6.2).map((e) => e.label)).toEqual(["Third-shot drop", "Dink"]);
    expect(calloutsAt(events, 30, 5 + CALLOUT_SEC + 0.01).map((e) => e.label)).toEqual(["Dink"]);
  });

  it("ONB-4 the counts only include shots already played", () => {
    const at = (now: number) => Object.fromEntries(countsAt(events, 30, now).map((c) => [c.name, c.n]));
    expect(at(1)).toMatchObject({ Dinks: 0, "Drops & resets": 0, "Serves & returns": 0, Errors: 0 });
    expect(at(6)).toMatchObject({ Dinks: 1, "Drops & resets": 1, "Serves & returns": 1, Errors: 0 });
    expect(at(60)).toMatchObject({ Errors: 1 });
  });
});
