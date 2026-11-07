// 060 ratings — Facility lane. Built in BUILD.md step 3.1. Until then every function throws, and the
// other lane uses product/fixtures instead.
import type { Court, Profile } from "@rally/types";

export function recordGame(court: Court, score: [number, number], profiles: Map<string, Profile>): Map<string, Profile> {
  throw new Error("ratings is not built yet (BUILD.md step 3.1)");
}
