import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Wordmark } from "@rally/ui";
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
    <html lang="en" data-theme="dark">
      <body>
        <nav className="rl-nav" aria-label="Main navigation">
          <a href="/" className="rl-home" aria-label="Rally home">
            <Wordmark text="Rally" size="md" />
          </a>
          <div className="rl-nav-links">
            <a href="/dashboard">Sessions</a>
            <a href="/player">Players</a>
            <a href="/phone">Phone</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
