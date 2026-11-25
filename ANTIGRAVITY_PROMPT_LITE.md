# ANTIGRAVITY PROMPT — LITE (for the free plan)

Tips to save quota: use the fastest/cheapest model offered for Steps 1, 2 and 4, and the strongest one only if Step 3 goes wrong. Start a NEW conversation for each step (paste only that step). Don't ask it to view images except where a step says so. If it hits a limit, wait for the reset and continue from the same step.

## STEP 0 — paste first (short)
```
Project: Hector Tech Labs, a dark scroll-driven 3D website (particle tree that turns into a particle cube, floating glass capsules, wavy blue rings, 4 glass cards).
Read ONLY these: prototype/index.html (a finished, working single-file Three.js prototype: it is the source of truth for look, shaders and animation curves; port it, do not redesign or reinvent) and docs/SPEC_LITE.md (positions, copy, colors, timeline). You may open at most 2 images from preview_frames/ when a step tells you to.
Stack: Vite + React 18 + TypeScript, three 0.169, @react-three/fiber 8, @react-three/drei 9, @react-three/postprocessing 2, GSAP + ScrollTrigger, Lenis, Tailwind v4. Keep tunable numbers in src/config.ts. No new sections, no real company logos.
Reply with a 6-line plan only, then wait.
```

## STEP 1 — scaffold + 3D scene + static UI
```
Step 1. Create the project. Port from prototype/index.html: the point generation, the particle vertex/fragment shaders (tree/sphere/cube targets, uIntro/uMorph), the rings shader, the reflection, bloom, camera. Build the DOM layers (nav, hero text, section-2 headline and paragraph, 4 cards, custom cursor) with Tailwind using docs/SPEC_LITE.md. Autoplay the 2.4 s sphere→tree intro, then fade in nav and hero text. Particles must be individually visible (75k desktop, 40k mobile). Do NOT add scroll yet.
Done when `npm run build` passes and `npm run dev` shows the tree rising from the rings with hero text and nav. Report in 5 lines.
```

## STEP 2 — cursor + capsules
```
Step 2. (a) Cursor interaction in the particle vertex shader, exactly as in the prototype: tiny area, no blank space. Use uCur[4] (last 4 cursor world positions at 0, 0.09, 0.18, 0.28 s) and uCW = vec4(1.0, 0.45, 0.25, 0.12):
  for each i: dd = p.xy - uCur[i].xy; l = length(dd)+1e-3; f = exp(-l*l*45.0)*uCW[i]; dir = dd/l; tg = vec2(-dir.y, dir.x);
  push.xy += dir*f*0.05 + tg*f*0.16;  push.z += f*0.55*(aRand.z-0.20);   then  p += push*(0.6+aRand.y*0.5);
Radius ≈ 0.15 world units (~1.5% of screen width). Outward push stays ~0.05 so no hole ever appears under the cursor. Pointer→world: unproject onto the z=0 plane, lerp 0.15. Expose CURSOR_RADIUS / CURSOR_STRENGTH in config.ts.
(b) Capsules: 5 DOM pills positioned every frame by projecting a 3D ellipse through the camera (RX 4.2, RZ 2.6, Y 0.55), slow rotation, depth→opacity/blur/scale/tilt/z-index. Never a straight row. Show them for testing with a temporary key press 'c'.
Done when the cursor makes a tiny shimmer with no dark spot and capsules orbit in a U-shaped arc. Report in 5 lines.
```

## STEP 3 — scroll timeline, cube, section 2
```
Step 3. Add Lenis + GSAP ScrollTrigger: one 500vh scroll container with a sticky 100vh stage and ONE master timeline (scrub 1.2) driving a shared state object read by the shaders and DOM. Use the prototype's timeline curves (see docs/SPEC_LITE.md timeline), scaling its seconds to 0–1 scroll progress: hero out → capsules in/out → uMorph 0→1 (tree→cube, edges first, faces last) → cube hold → push-in, rotate to 3-face view, shift right/down, rings dim → headline mask reveal, paragraph, glowing "HECTOR TECH LABS" text on the cube face, cards staggered. Scrolling backwards must reverse everything. Cube must stay clear of the nav; headline above the cube, cards above the cube's bottom edge. Scroll stays locked until the intro finishes.
Done when `npm run build` passes. Open ONLY preview_frames/prev_12.00s.jpg and prev_20.00s.jpg and compare with a screenshot at scroll 0.5 and 1.0; fix big differences. Report in 5 lines.
```

## STEP 4 — polish
```
Step 4. Fix only what is clearly wrong versus the prototype: hover states on cards/capsules/buttons, prefers-reduced-motion (skip intro and drift), WebGL-unavailable fallback (dark page with the same HTML text), mobile particle count 40k and hidden custom cursor, no horizontal overflow at 390px, no console errors. Do not add features. Report in 5 lines.
```

## If something looks off
- Blobby/smooth tree: lower bloom, raise point size slightly, use alpha smoothstep(.5,.16,d).
- Hole or dark spot under cursor: set the outward push 0.05 → 0.0 and the exponent 45 → 70.
- Capsules in a row: they must come from the projected ellipse, not hand-placed.
- Cube hits the nav: increase the downward cube offset in the final stage.
