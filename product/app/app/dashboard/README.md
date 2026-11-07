# Session dashboard

`SessionDashboard.tsx` owns the real matching-engine call and demo reset. It lazy-loads `facility-scene.ts`, a typed Three.js renderer that owns only the empty scene host. Both use the shared Overtime tokens and components; the root app supplies navigation and fonts.

The view is facility → court → player, with Back and Escape navigation. Player balls keep their holes, team colors, hover glow/lift, and reduced-motion support. Balls retain plain team-colored surfaces. Each wears one accessory selected from its strongest style statistic (ties resolve power, kitchen, mobility, then readiness): a paddle, chef’s hat, sneakers, or headband. A badge displays numerical skill with one to five stars, using round(rating - 1), clamped to 1–5. Stats remain available in the spotlight panel.

Three.js is bundled with the application; no CDN is used. The controller cancels rendering, disconnects observers, clears focus-mode state, and disposes GPU resources on unmount.

This increment does not wire sessions, cancellations, backfill, or the phone.

The facility overview uses a continuous charcoal plaza with four crimson courts, bleachers, slatted benches, rock-and-grass planters, and a pergola. Directional shadows, contact shadows, and restrained crimson practical lights follow Danny’s supplied facility reference; geometry remains interactive through the existing court/player cameras.

Rally it runs a 3.6-second animation from current player positions through a central orbit into the matching engine’s actual assignments. Courts settle in sequence and fairness scores count toward the real results. Court selection and repeated runs are disabled during the transition. Reduced motion applies assignments immediately. Reset restores the seeded demo layout.

Facility-to-court transitions interpolate both canvas bounds and camera with smooth start/stop easing; the original stage space remains reserved to avoid layout jumps. Rating badges appear only inside the selected court after the camera arrives. Reduced motion skips the transition.
