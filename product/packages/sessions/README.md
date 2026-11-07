# Sessions (step 1.2)

In-memory session rules, sign-ups and waitlists for the demo. Data lasts for the lifetime of the store/process. The dashboard is wired in step 1.4. Price is displayed; there is no payment flow.

```ts
import { createSessions } from "@rally/sessions";

const sessions = createSessions({ sessions: [tonight] });
sessions.signUp(tonight.id, profile); // joined, waitlisted or rejected
const snapshot = sessions.getSession(tonight.id);

// Server-side: show this draft to the owner before saving it.
const draft = await sessions.parseRule("Tuesday 7pm is 3.5+ only, $12");
sessions.approveRule(tonight.id, draft); // only after owner approval
```

The same functions are exported directly for a default app store. Seed that store once with `registerSession(tonight)` before calling `signUp`. Each store copies incoming sessions and returns snapshots, so callers cannot mutate its arrays. Repeated sign-ups do not duplicate IDs. Rules apply to new sign-ups; an approved rule edit does not evict existing players.

The existing shared contract remains `signUp(sessionId, profile)`, using `profile.skill.mu` for inclusive minimum/maximum restrictions. Reading or signing up for an unknown session throws rather than silently creating one. The shared `paid` array is preserved for compatibility but is unused here.

`parseRule` uses the shared `ClaudeClient` interface. The default adapter calls Claude's Messages API with [structured JSON output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Call it on the server with `ANTHROPIC_API_KEY` set; `ANTHROPIC_MODEL` optionally overrides `claude-sonnet-4-6`. No key is needed for sign-ups. Tests never call a live provider.

For an offline demo or deterministic tests, inject `claude: fakeClaude([...])` from `@rally/fakes`, and optionally `now: () => new Date(...)` and `timeZone`. The default timezone is `America/Denver`. Claude resolves a weekday to its next future occurrence from the reference time; the returned ISO time and other settings must be shown for approval. Missing/null fields leave existing settings alone. Only scheduling, courts, price and skill fields are accepted; IDs, sign-ups, waitlists and payments cannot be changed by a parsed draft.

From `product/`: `npm test` and `npm run typecheck`.
