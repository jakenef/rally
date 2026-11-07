# 040: Sessions

Status: Draft
Prefix: `SESS`
Step: 1.2
Lane: Facility (Danny). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

A facility's sessions: time, courts, displayed price, skill rule and sign-ups. Rules can be typed in plain English.

## Non-goals

- A real booking-software integration (CourtReserve is mocked).
- Payments, including simulated payments or a Pay button. Price is displayed for the demo only.
- Refunds, memberships, recurring bookings.

## Interface

```ts
type Session = {
  id: string; facilityId: string; startsAt: string; courts: number;
  priceCents: number; minSkill?: number; maxSkill?: number;
  signups: string[]; waitlist: string[];
};
function parseRule(text: string): Promise<Partial<Session>>;  // Claude, structured output
function signUp(sessionId: string, playerId: string): { status: "joined" | "waitlisted" | "rejected"; reason?: string };
```

## Behavior

1. Capacity is `courts * 4`. Past capacity, sign-ups go on the waitlist.
2. A player outside the skill rule is rejected with a reason.
3. `parseRule` shows the parsed rule back for the owner to approve before it's saved.

## Acceptance criteria

- **SESS-1** Signing up past capacity puts the player on the waitlist.
- **SESS-2** A player below `minSkill` is rejected with a reason naming the rule.
- **SESS-3** "Tuesday 7pm is 3.5+ only, $12" parses to `minSkill 3.5`, `priceCents 1200`, Tuesday 19:00 (with a fake model in tests).

## Open questions

- Skill rule against `mu` or a range? **Default:** against `mu`.
