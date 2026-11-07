import { Button, Headline, Marquee, Perforation } from "@rally/ui";

// Shared file: the home page.
export default function Home() {
  return (
    <main>
      <Perforation as="section" className="rl-hero">
        <div className="rl-hero-content">
          <Headline size="impact" as="h1">
            Play people<br /><span className="ch-hl-accent">your level.</span>
          </Headline>
          <p className="rl-body-lg">Matched by skill and style.</p>
          <div className="rl-row">
            <Button href="/dashboard" iconAfter="arrow">
              Run a session
            </Button>
            <Button href="/player" variant="outline">
              Add a player
            </Button>
          </div>
        </div>
      </Perforation>
      <section className="ch-night rl-slogans" aria-label="Rally slogans">
        <Marquee rows={[{ text: "Blowouts." }, { text: "Close games.", accent: true }]} />
      </section>
    </main>
  );
}
