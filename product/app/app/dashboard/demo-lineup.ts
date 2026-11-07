import { roster, tonight } from "@rally/fixtures";
import type { Profile } from "@rally/types";

// Presentation fixture for the session demo. Keep the source roster intact.
const ratingById = new Map([
  ...["p01", "p02", "p03", "p04"].map(id => [id, 6] as const),
  ...["p05", "p06", "p09", "p11"].map(id => [id, 4] as const),
  ...["p07", "p08", "p10", "p12"].map(id => [id, 3] as const),
  ...["p13", "p14", "p15", "p16"].map(id => [id, 2] as const),
]);

export const sessionDemoPlayers: Profile[] = roster
  .filter(player => tonight.signups.includes(player.playerId))
  .map(player => ({
    ...player,
    skill: { ...player.skill, mu: ratingById.get(player.playerId) ?? player.skill.mu },
    // Even style counts inside skill bands keep every opposing icon paired.
    style: {
      ...player.style,
      ...(player.playerId === "p09" ? { power: 0.9 } : {}),
      ...(player.playerId === "p14" ? { readiness: 0.9 } : {}),
    },
  }));
