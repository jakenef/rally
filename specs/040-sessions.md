# 040: Sessions

Status: Draft
Prefix: `SESS`
Step: 1.2
Lane: Facility (Danny). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

Fixed demo sessions: time, courts, displayed price, skill limits and sign-ups.

## Non-goals

- A real booking-software integration (CourtReserve is mocked).
- Payments, including simulated payments or a Pay button. Price is displayed for the demo only.
- Refunds, memberships, recurring bookings.
- Plain-English pricing/rule parsing or editing, cut from the demo by Danny.

## Interface

```ts
type Session = {
  id: string; facilityId: string; startsAt: string; courts: number;
  priceCents: number; minSkill?: number; maxSkill?: number;
  signups: string[]; waitlist: string[];
};
function signUp(sessionId: string, profile: Profile): { status: "joined" | "waitlisted" | "rejected"; reason?: string };
```

## Behavior

1. Capacity is `courts * 4`. Past capacity, sign-ups go on the waitlist.
2. A player outside the skill rule is rejected with a reason.

## Acceptance criteria

- **SESS-1** Signing up past capacity puts the player on the waitlist.
- **SESS-2** A player below `minSkill` is rejected with a reason naming the rule.
- **SESS-3** Removed from demo scope by Danny on 2026-11-06: no pricing rule/parser. No implementation required.

## Open questions

- Skill rule against `mu` or a range? **Default:** against `mu`.
