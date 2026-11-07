# Sessions (step 1.2)

Demo-only in-memory sign-ups: fixed session settings, inclusive skill limits, court capacity and an ordered waitlist. Data lasts for the lifetime of the store/process. The dashboard is wired in step 1.4.

```ts
import { createSessions } from "@rally/sessions";

const sessions = createSessions({ sessions: [tonight] });
const result = sessions.signUp(tonight.id, profile); // joined, waitlisted or rejected
const snapshot = sessions.getSession(tonight.id);
```

The same functions are exported directly for a default app store. Seed that store once with `registerSession(tonight)` before calling `signUp`. Each store copies incoming sessions and returns snapshots, so callers cannot mutate its arrays. Repeated sign-ups do not duplicate IDs.

The shared contract remains `signUp(sessionId, profile)`. Restrictions use `profile.skill.mu`; capacity is `courts * 4`. Reading or signing up for an unknown session throws rather than silently creating one. No API keys or outside services are needed. No payment flow or rule parser is included, per Danny's demo scope. The shared `paid` field is preserved but unused for compatibility.

Backfill uses `cancelSignUp(sessionId, playerId)` to open a spot and `promoteWaitlisted(sessionId, profile)` to fill it after acceptance. Promotion checks capacity and skill limits, removes the player from the waitlist, and does not mark them paid. Both operations update the same store used by `signUp`.

From `product/`: `npm test` and `npm run typecheck`.
