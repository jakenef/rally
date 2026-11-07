"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { roster, tonight } from "@rally/fixtures";
import { assign, randomAssign } from "@rally/matching";
import { Button, Headline } from "@rally/ui";
import type { Court } from "@rally/types";
import type { FacilityController } from "./facility-scene";
import "./dashboard.css";

const players = roster.filter((player) =>
  tonight.signups.includes(player.playerId),
);

export default function SessionDashboard() {
  const startingCourts = useMemo(
    () => randomAssign(players, tonight.courts, 42),
    [],
  );
  const controller = useRef<FacilityController | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const currentCourts = useRef(startingCourts);
  const toolsButton = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [balanced, setBalanced] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("./facility-scene")
      .then(({ mountFacility }) => {
        if (cancelled || !host.current) return;
        try {
          controller.current = mountFacility(
            host.current,
            players,
            currentCourts.current,
          );
          setReady(true);
        } catch {
          setError(
            "The 3D view could not start. Reload this page to try again.",
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "The facility view could not load. Reload this page to try again.",
          );
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  function updateCourts(courts: Court[], isBalanced: boolean) {
    currentCourts.current = courts;
    controller.current?.setCourts(courts);
    setBalanced(isBalanced);
  }

  function closeTools() {
    setToolsOpen(false);
    toolsButton.current?.focus();
  }

  return (
    <main className="rl-page rl-dashboard">
      <div className="dashboard-heading">
        <Headline
          size="h1"
          parts={["Tonight’s", { text: "session", accent: true }]}
        />
        <Button
          disabled={!ready || balanced}
          onClick={() =>
            updateCourts(
              assign(players, tonight.courts, { seed: 42 }).courts,
              true,
            )
          }
        >
          Rally it
        </Button>
      </div>
      <div
        ref={host}
        className="dashboard-host"
        aria-label="Interactive pickleball facility"
      />
      {error && (
        <p role="alert" className="rl-note">
          {error}
        </p>
      )}
      <p className="dashboard-note">
        Demo profiles. Fairness is an internal matching score.
      </p>
      {!toolsOpen && (
        <div className="dashboard-demo-edge">
          <button
            ref={toolsButton}
            className="ch-btn ch-btn-outline dashboard-demo-launch"
            type="button"
            aria-controls="dashboard-demo-tools"
            aria-expanded={false}
            onClick={() => setToolsOpen(true)}
          >
            Open demo tools
          </button>
        </div>
      )}
      {toolsOpen && (
        <aside
          id="dashboard-demo-tools"
          className="dashboard-demo-panel"
          aria-label="Demo tools"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeTools();
          }}
        >
          <header>
            <span className="rl-label">Demo tools</span>
            <Button variant="light" onClick={closeTools}>
              Close
            </Button>
          </header>
          <div
            className="dashboard-demo-state"
            role="status"
            aria-live="polite"
          >
            <strong>{balanced ? "Courts balanced" : "Ready to rally"}</strong>
            <span>
              {balanced
                ? "Reset to run again."
                : `${players.length} players · ${tonight.courts} courts`}
            </span>
          </div>
          <Button
            onClick={() =>
              updateCourts(randomAssign(players, tonight.courts, 42), false)
            }
          >
            Reset demo
          </Button>
        </aside>
      )}
    </main>
  );
}
