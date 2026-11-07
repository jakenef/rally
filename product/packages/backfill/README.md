# Backfill (step 1.3)

Given sessions, players and the current courts, replace a cancelling player with the best-fit waitlisted player. No outside services or payment flow. `/phone` is a resettable, browser-local scene 3 demo using the real roster and matching engine; connecting it to the full dashboard/player flow remains step 1.4.

```ts
import { createSessions } from "@rally/sessions";
import { createBackfill } from "@rally/backfill";

const sessions = createSessions({ sessions: [tonight] });
const backfill = createBackfill(sessions);
backfill.registerAssignment(tonight.id, currentCourts, profilesById);

const offer = backfill.cancel(tonight.id, leavingPlayerId);
// Render offer.message and Accept/Decline buttons on the fake phone.
if (offer) backfill.reply(offer.offerId, "no");
const next = backfill.getState(tonight.id).pendingOffer;
if (next) backfill.reply(next.offerId, "yes");
const { session, courts, recoveredRevenueCents } = backfill.getState(tonight.id);
```

The default exported functions share the default `@rally/sessions` store. Seed that Sessions store and call `registerAssignment` before cancelling. Isolated factories let the demo reset without changing fixtures or another session.

`rankWaitlist(session, leaving, profiles, courts?)` is pure. Pass the displayed courts: each candidate replaces the departing player in exactly the same team/seat, scored by the matching module's `fairness`. The three-argument spec interface uses matching's default assignment of the pre-cancellation roster. Candidates outside skill limits are excluded. Scores sort descending; ties preserve waitlist order.

`cancel` removes the signup immediately and opens the first offer. Until acceptance, `vacancy.leaving` marks the open seat in the stored court; the phone shows "Open spot" and hides that court's fairness. `reply(..., "no")` advances to the next candidate. Exhausting the waitlist leaves the spot open with no offer or recovered revenue. Declining does not remove the player from the waitlist for future cancellations.

`reply(..., "yes")` promotes the candidate in the same Sessions store, replaces only the vacated seat, recalculates that court's score and adds the displayed session price to the recovered-revenue demo metric. It never marks a player paid. Repeated replies return their original result so double clicks cannot advance twice or count revenue twice.

One vacancy/offer chain per session at a time; complete it before another cancellation. There are no timeouts, real messages, bookings or payments. Use a fresh store/reset button to replay an exhausted chain.

Verification: from `product/`, run `npm test` and `npm run typecheck`.
