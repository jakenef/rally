"use server";
// AI lane (Jake). Where the lanes meet: you join tonight's session with your own profile (025 step 5, 040 signUp).
import { tonight } from "@rally/fixtures";
import { signUp } from "@rally/sessions";
import type { Profile, Tempo } from "@rally/types";

/** The result page already has your profile; it comes back with the form so joining is instant. */
function readProfile(raw: FormDataEntryValue | null): Profile | null {
  try {
    const p = JSON.parse(String(raw));
    const ok = p && typeof p.playerId === "string" && p.skill && typeof p.skill.mu === "number" && p.style && typeof p.style.power === "number";
    return ok ? (p as Profile) : null;
  } catch {
    return null;
  }
}

export async function joinAsYou(_prev: string | null, form: FormData): Promise<string> {
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const tempo = (["soft", "fast", "any"].includes(String(form.get("tempo"))) ? form.get("tempo") : "any") as Tempo;
  if (!name) return "Add your first name.";
  const base = readProfile(form.get("profile"));
  if (!base) return "Couldn't read your rating. Try your clip again.";
  const profile: Profile = { ...base, playerId: `${String(form.get("kind"))}-${String(form.get("id"))}`, name, tempo };
  try {
    const r = signUp(tonight.id, profile);
    if (r.status === "rejected") return `Not added: ${r.reason}`;
    return r.status === "joined" ? `You're in, ${name}. See you Tuesday at 7.` : `You're on the waitlist, ${name}. You'll see it on your phone if a spot opens.`;
  } catch {
    return `Your rating is saved, ${name}. Session sign-ups open soon.`;
  }
}
