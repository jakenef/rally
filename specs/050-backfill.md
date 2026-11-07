# 050: Backfill

Status: Draft
Prefix: `FILL`
Step: 1.3
Lane: Facility (Danny). Only that lane changes this module's code (see `specs/README.md`, Lanes).

## Purpose

When a player cancels, offers the spot to the best-fit waitlisted player, so the facility doesn't lose the booking. Booking software fills waitlists first-come; Rally fills best-fit.

## Non-goals

- Any real messaging: no SMS, calls, email or push. Offers appear on the on-screen fake phone in the app.
- Offering to more than one player at a time.

## Interface

```ts
function rankWaitlist(session: Session, leaving: string, profiles: Map<string, Profile>): { playerId: string; fairnessAfter: number }[];
function offer(sessionId: string, playerId: string): { offerId: string; message: string };
function reply(offerId: string, answer: "yes" | "no"): "accepted" | "declined";
```

## Behavior

1. On cancellation, rank each waitlisted player by the fairness of the leaving player's court with them swapped in.
2. Offer to the top player on the fake phone. The offer names the court, time and price, with Accept and Decline buttons.
3. Accept fills the spot and updates the court. Decline moves to the next player. No payment flow is needed for the demo.
4. The dashboard shows recovered revenue.

## Acceptance criteria

- **FILL-1** The top-ranked player is the one whose swap gives the highest court fairness.
- **FILL-2** Accepting fills the spot; declining offers it to the next player.
- **FILL-4** After an accepted offer, the session has the same number of sign-ups as before the cancellation and recovered revenue goes up by the session price.

## Open questions

- None.
