// Demo fixtures. Each lane uses these until the other lane's real module exists.
import type { ClipStats, Profile, Session } from "@rally/types";
import rosterJson from "./roster.json";
import sampleStatsJson from "./sample-stats.json";

export const roster: Profile[] = rosterJson.players as Profile[];
export const tonight: Session = rosterJson.session as Session;
/** The scene 4 group: equal skill, two hard hitters and two soft players. */
export const scene4Ids: string[] = rosterJson.scene4;
export const sampleStats: ClipStats = sampleStatsJson as ClipStats;

export function profilesById(players: Profile[] = roster): Map<string, Profile> {
  return new Map(players.map((p) => [p.playerId, p]));
}
