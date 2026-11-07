# Sessions (step 1.2)

Demo-only in-memory sign-ups: fixed session settings, inclusive skill limits, court capacity and an ordered waitlist. Data lasts for the lifetime of the store/process. The dashboard is wired in step 1.4.

```ts
import { createSessions } from "@rally/sessions";

const sessions = createSessions({ sessions: [tonight] });
const result = sessions.signUp(tonight.id, profile); // joined, waitlisted or rejected
const snapshot = sessions.getSession(tonight.id);
```

The same functions are exported directly for a default app store, which starts with `tonight` so the player page can sign up. Each store copies incoming sessions and returns snapshots, so callers cannot mutate its arrays. Repeated sign-ups do not duplicate IDs.

The shared contract remains `signUp(sessionId, profile)`. Restrictions use `profile.skill.mu`; capacity is `courts * 4`. Reading or signing up for an unknown session throws rather than silently creating one. No API keys or outside services are needed. No payment flow or rule parser is included, per Danny's demo scope. The shared `paid` field is preserved but unused for compatibility.

From `product/`: `npm test` and `npm run typecheck`.
