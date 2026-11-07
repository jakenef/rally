// AI lane (Jake). Get your Rally rating (025): the consumer onboarding flow, with hidden demo controls.
import { loadClips } from "./data";
import type { PreparedClip } from "./DemoControls";
import { GetRated } from "./GetRated";
import { localVideoPath } from "./local";
import "./player.css";

export const dynamic = "force-dynamic";

export default function Player() {
  const { clips, usingSample } = loadClips();
  const prepared: PreparedClip[] = usingSample
    ? []
    : clips.map((c) => ({ clipId: c.clipId, channel: c.channel, labeledLevel: c.labeledLevel, hasVideo: localVideoPath(c.clipId) !== null }));
  return <GetRated prepared={prepared} />;
}
