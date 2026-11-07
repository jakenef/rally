import { Caption, Headline } from "@rally/ui";

// Facility lane (Danny). The on-screen fake phone where backfill offers appear (050). No real messages, ever.
export default function Phone() {
  return (
    <main className="rl-page">
      <Caption>Waitlist view</Caption>
      <Headline size="h1" parts={["The", { text: "phone", serif: true }]} />
      <div className="rl-phone" aria-label="Fake phone">
        <div className="rl-phone-screen">
          <span className="rl-label">Rally</span>
          <p className="rl-body">No offers yet. Backfill (BUILD.md step 1.3) sends them here.</p>
        </div>
      </div>
    </main>
  );
}
