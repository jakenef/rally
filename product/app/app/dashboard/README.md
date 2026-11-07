# Session dashboard

`SessionDashboard.tsx` owns the real matching-engine call and demo reset. It lazy-loads `facility-scene.ts`, a typed Three.js renderer that owns only the empty scene host. Both use the shared Overtime tokens and components; the root app supplies navigation and fonts.

The view is facility → court → player, with Back and Escape navigation. Player balls keep their holes, team colors, hover glow/lift, and reduced-motion support. All balls use the same unprinted surface; player-specific visual attributes are deferred. Player stats remain available in the spotlight panel.

Three.js is bundled with the application; no CDN is used. The controller cancels rendering, disconnects observers, clears focus-mode state, and disposes GPU resources on unmount.

This increment does not wire sessions, cancellations, backfill, or the phone.

The facility overview uses a continuous charcoal plaza with four crimson courts, bleachers, slatted benches, rock-and-grass planters, and a pergola. Directional shadows, contact shadows, and restrained crimson practical lights follow Danny’s supplied facility reference; geometry remains interactive through the existing court/player cameras.
