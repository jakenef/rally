# Session dashboard

`SessionDashboard.tsx` owns the real matching-engine call and demo reset. It lazy-loads `facility-scene.ts`, a typed Three.js renderer that owns only the empty scene host. Both use the shared Overtime tokens and components; the root app supplies navigation and fonts.

The view is facility → court → player, with Back and Escape navigation. Player balls keep their holes, team colors, hover glow/lift, and reduced-motion support. Power controls the printed stripe width; kitchen tendency controls printed dot density. These are fixture-driven visual encodings.

Three.js is bundled with the application; no CDN is used. The controller cancels rendering, disconnects observers, clears focus-mode state, and disposes GPU resources on unmount.

This increment does not wire sessions, cancellations, backfill, or the phone.
