import { Button, Caption, Headline, Marquee, Perforation } from "@rally/ui";

// Shared file: the home page.
export default function Home() {
  return (
    <main>
      <Perforation as="section" className="rl-section">
        <div style={{ display: "grid", gap: "var(--space-small)" }}>
          <Caption>Provo, 2026</Caption>
          <Headline size="impact" as="h1" parts={["Balanced games, not", { text: "court time.", serif: true }]} />
          <p className="rl-body-lg">
            DUPR tells you what you are. Rally decides who you should play tonight, and fills the court when someone bails.
          </p>
          <div className="rl-row">
            <Button href="/dashboard" iconAfter="arrow">
              Run tonight&apos;s session
            </Button>
            <Button href="/player" variant="outline">
              Add a player from video
            </Button>
          </div>
        </div>
      </Perforation>
      <section className="ch-night rl-section" style={{ paddingInline: 0 }}>
        <Marquee rows={[{ text: "Same rating, different game." }, { text: "Mirror the teams.", serif: true }]} />
      </section>
    </main>
  );
}
