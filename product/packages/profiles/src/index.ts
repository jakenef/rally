// 020 profiles — AI lane. Built in BUILD.md step 2.2. Until then every function throws, and the
// other lane uses product/fixtures instead.
import type { PlayerStats, Profile, Tempo } from "@rally/types";

export function buildProfile(input: {
  playerId: string;
  name: string;
  stats?: PlayerStats;
  dupr?: number;
  selfRating?: number;
  tempo?: Tempo;
}): Profile {
  throw new Error("profiles is not built yet (BUILD.md step 2.2)");
}
