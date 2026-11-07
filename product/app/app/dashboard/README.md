# Session dashboard

`SessionDashboard.tsx` owns the real matching-engine call and demo reset. It lazy-loads `facility-scene.ts`, a typed Three.js renderer that owns only the empty scene host. Both use the shared Overtime tokens and components; the root app supplies navigation and fonts.

The view is facility → court → player, with Back and Escape navigation. Player balls keep their holes, team colors, hover glow/lift, and reduced-motion support. Balls retain plain team-colored surfaces. Each has a physical floating card beside it, facing the camera, with a flat playstyle icon, name, numerical skill, one to five stars, four attribute bars, and tempo. The strongest statistic selects the icon; ties resolve power, kitchen, mobility, then readiness. Stars use round(rating - 1), clamped to 1–5. Cards appear only inside the selected court after arrival, with only the selected player’s card retained in spotlight view. Equivalent text remains accessible to screen readers.

Three.js is bundled with the application; no CDN is used. The controller cancels rendering, disconnects observers, clears focus-mode state, and disposes GPU resources on unmount.

This increment does not wire sessions, cancellations, backfill, or the phone.

The facility overview uses a continuous charcoal plaza with four crimson courts, bleachers, slatted benches, rock planters, and a pergola. Directional shadows, contact shadows, and restrained crimson practical lights follow Danny’s supplied facility reference; geometry remains interactive through the existing court/player cameras.

Rally it runs a 3.6-second animation from current player positions through a central orbit into the matching engine’s actual assignments. Courts settle in sequence and fairness scores count toward the real results. Court selection and repeated runs are disabled during the transition. Reduced motion applies assignments immediately. Reset restores the seeded demo layout.

Facility-to-court transitions interpolate both canvas bounds and camera with smooth start/stop easing; the original stage space remains reserved to avoid layout jumps. Player cards appear only inside the selected court after the camera arrives. Reduced motion skips the transition.

Player cards use screen-space bounds reconstructed at their player’s 3D depth. Court cards occupy separate rows and side lanes; spotlight cards scale to the viewport and stay between top navigation and bottom player controls.

The court camera reserves room for the cards. Camera-facing panels sit on a foreground plane rather than at player depth, preventing court and plaza geometry from clipping through them. Geometry regression checks cover desktop, tablet, portrait mobile, and short landscape viewports.

Cards follow projected ball positions in separated team/row regions, clearing both teammates. They fade and slide into place, and the selected card stays visible while its position and size interpolate into the spotlight. Balls bob only above a fixed clearance; contact shadows remain flat on the court rather than inheriting ball rotation.

Facility overview shows a compact playstyle marker beside every ball, reusing the exact icon drawing used by the player cards. Markers follow their players throughout Rally reassignment, remain a stable readable screen size, and disappear in court/player views. Their texture/material resources follow the existing player disposal lifecycle.

Overview markers show skill stars directly beneath each icon, using the same tier calculation and drawing as the cards. Rally assignments align matching icons in opposing team rows wherever roster counts and tempo allow, then optimize numeric skill fairness. Odd style counts can require unmatched rows; profiles remain unchanged unless the demo roster is explicitly adjusted.

The session presentation uses demo-lineup.ts for four players each at 1, 2, 3, and 5 stars. Baseline/reset mixes the same players using seed 42; the real matcher separates them into skill-homogeneous courts with exact opposing icon pairs. Ratings and two style overrides are scoped to this facility demo; original roster fixtures remain unchanged.
