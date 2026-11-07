# Sessions (step 1.2)

In-memory session rules, sign-ups, waitlists and simulated payments. Data lasts for the lifetime of the store/process. The dashboard and Pay button are wired in step 1.4.

```ts
import { createSessions } from "@rally/sessions";

const sessions = createSessions({ sessions: [tonight] });
sessions.signUp(tonight.id, profile); // joined, waitlisted or rejected
sessions.markPaid(tonight.id, profile.playerId); // simulated Pay button
const snapshot = sessions.getSession(tonight.id);

// Server-side: show this draft to the owner before saving it.
const draft = await sessions.parseRule("Tuesday 7pm is 3.5+ only, $12");
sessions.approveRule(tonight.id, draft); // only after owner approval
```

The same functions are exported directly for a default app store. Seed that store once with `registerSession(tonight)` before calling `signUp`. Each store copies incoming sessions and returns snapshots, so callers cannot mutate its arrays. Repeated sign-ups and payments do not duplicate IDs. Rules apply to new sign-ups; an approved rule edit does not evict existing players or reprice payments.

The existing shared contract remains `signUp(sessionId, profile)`, using `profile.skill.mu` for inclusive minimum/maximum restrictions. Reading or signing up for an unknown session throws rather than silently creating one. A waitlisted player cannot pay until they join.

`parseRule` uses the shared `ClaudeClient` interface. The default adapter calls Claude's Messages API with [structured JSON output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Call it on the server with `ANTHROPIC_API_KEY` set; `ANTHROPIC_MODEL` optionally overrides `claude-sonnet-4-6`. No key is needed for sign-ups or simulated payments. Tests never call a live provider.

For an offline demo or deterministic tests, inject `claude: fakeClaude([...])` from `@rally/fakes`, and optionally `now: () => new Date(...)` and `timeZone`. The default timezone is `America/Denver`. Claude resolves a weekday to its next future occurrence from the reference time; the returned ISO time and other settings must be shown for approval. Missing/null fields leave existing settings alone. Only scheduling, courts, price and skill fields are accepted; IDs, sign-ups, waitlists and payments cannot be changed by a parsed draft.

From `product/`: `npm test` and `npm run typecheck`.
