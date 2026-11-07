import { Headline, Logo } from "@rally/ui";

// Facility lane (Danny). The on-screen fake phone where backfill offers appear (050). No real messages, ever.
export default function Phone() {
  return (
    <main className="rl-page">
      <Headline size="h1">Offers</Headline>
      <div className="rl-phone" aria-label="Fake phone">
        <div className="rl-phone-screen">
          <Logo size="sm" />
          <p className="rl-body">No offers yet.</p>
        </div>
      </div>
    </main>
  );
}
