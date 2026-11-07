// AI lane (Jake). Shot callouts and counts for the analyzed clip (025 ONB-4). Pure, so it's tested.
import type { ShotEvent } from "@rally/types";

/** How long a shot callout stays up, seconds. */
export const CALLOUT_SEC = 1.6;

const GROUPS: { name: string; kinds: ShotEvent["shot"][] }[] = [
  { name: "Dinks", kinds: ["dink"] },
  { name: "Drops & resets", kinds: ["drop", "reset"] },
  { name: "Drives & speed-ups", kinds: ["drive", "speedup"] },
  { name: "Volleys & put-aways", kinds: ["volley", "putaway"] },
  { name: "Serves & returns", kinds: ["serve", "return"] },
  { name: "Errors", kinds: ["error"] },
];

/** Counts by group of the shots already played at video time `now`. */
export function countsAt(events: ShotEvent[], offsetSec: number, now: number) {
  const played = events.filter((e) => e.t - offsetSec <= now);
  return GROUPS.map((g) => ({ name: g.name, n: played.filter((e) => g.kinds.includes(e.shot)).length }));
}

/** The callouts showing at video time `now`. */
export function calloutsAt(events: ShotEvent[], offsetSec: number, now: number) {
  return events.filter((e) => {
    const age = now - (e.t - offsetSec);
    return age >= 0 && age < CALLOUT_SEC;
  });
}
