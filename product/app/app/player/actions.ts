"use server";
// AI lane (Jake). Where the lanes meet: the player screen calls the Facility lane's signUp (040).
import { tonight } from "@rally/fixtures";
import { signUp } from "@rally/sessions";
import { redirect } from "next/navigation";
import { loadClips, profileForClip } from "./data";

export async function joinSession(formData: FormData) {
  const clipId = String(formData.get("clip"));
  const { clips } = loadClips();
  const clip = clips.find((c) => c.clipId === clipId);
  let result: string;
  if (!clip) {
    result = "Clip not found.";
  } else {
    try {
      const r = signUp(tonight.id, await profileForClip(clip, clips));
      result = r.status === "rejected" ? `Not added: ${r.reason}` : r.status === "joined" ? "Joined Tuesday 7 pm." : "On the waitlist for Tuesday 7 pm.";
    } catch {
      result = "Sessions aren't built yet (Facility lane, BUILD.md step 1.2). Your profile is ready.";
    }
  }
  redirect(`/player?clip=${encodeURIComponent(clipId)}&joined=${encodeURIComponent(result)}`);
}
