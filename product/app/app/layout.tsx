import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button, Wordmark } from "@rally/ui";
import "@rally/ui/tokens.css";
import "@rally/ui/components.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Rally",
  description: "Balanced pickleball sessions for facilities.",
};

// Shared file: the nav links to each lane's screen. Tell the other lane before changing it.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Italiana&family=Mona+Sans:wdth,wght@75..125,200..900&display=swap"
        />
      </head>
      <body>
        <nav className="rl-nav">
          <a href="/" className="rl-home">
            <Wordmark serif="Rally" sans="" size="md" />
          </a>
          <div className="rl-nav-links">
            <Button href="/dashboard" variant="light" icon="court">
              Run tonight
            </Button>
            <Button href="/player" variant="light" icon="paddle">
              Add a player
            </Button>
            <Button href="/phone" variant="light" icon="ball">
              Open the phone
            </Button>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
