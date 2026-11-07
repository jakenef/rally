// 030 matching — Facility lane. Built in BUILD.md step 1.1. Until then every function throws, and the
// other lane uses product/fixtures instead.
import type { Assignment, Court, Profile } from "@rally/types";

const notBuilt = (): never => {
  throw new Error("matching is not built yet (BUILD.md step 1.1)");
};

export function assign(players: Profile[], courts: number, opts?: { seed?: number }): Assignment {
  return notBuilt();
}
export function fairness(teams: Court["teams"], profiles: Map<string, Profile>): number {
  return notBuilt();
}
export function randomAssign(players: Profile[], courts: number, seed: number): Court[] {
  return notBuilt();
}
export function ratingOnlyAssign(players: Profile[], courts: number): Court[] {
  return notBuilt();
}
