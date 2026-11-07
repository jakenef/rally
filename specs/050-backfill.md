# 050: Backfill

Status: Draft
Prefix: `FILL`
Step: 1.3

## Purpose

When a player cancels, offers the spot to the best-fit waitlisted player, so the facility doesn't lose the booking. Booking software fills waitlists first-come; Rally fills best-fit.

## Non-goals

- Voice calls (stretch, not specced).
- Offering to more than one player at a time.

## Interface

```ts
function rankWaitlist(session: Session, leaving: string, profiles: Map<string, Profile>): { playerId: string; fairnessAfter: number }[];
function offer(sessionId: string, playerId: string): { offerId: string; expiresAt: string; message: string };
function reply(offerId: string, text: string): "accepted" | "declined" | "expired";
```

## Behavior

1. On cancellation, rank each waitlisted player by the fairness of the leaving player's court with them swapped in.
2. Offer to the top player by text, valid for 10 minutes. Message names the court, time and price.
3. "YES" (any case) accepts, starts payment, and updates the court. Anything else or expiry moves to the next player.
4. The dashboard shows recovered revenue.

## Acceptance criteria

- **FILL-1** The top-ranked player is the one whose swap gives the highest court fairness.
- **FILL-2** Replying "yes" accepts; replying "no" offers the next player.
- **FILL-3** An offer past its expiry can't be accepted.
- **FILL-4** After an accepted offer, the session has the same number of sign-ups as before the cancellation and recovered revenue goes up by the session price.

## Open questions

- Real SMS or on-screen phone? **Default:** on-screen fake phone; Twilio if there's time.
