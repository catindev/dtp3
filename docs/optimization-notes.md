# Optimization Notes

Read this before render, animation, timing, background, or game-loop work. Update it whenever a change is made for performance reasons.

## Current Optimizations

### Animated Background Loop

Problem: the animated canvas background dropped idle FPS to about `30` before real game systems were added.

Cause: `AbstractBackground.tsx` owned canvas drawing, pointer parallax, timers, and `requestAnimationFrame` directly. The component started multiple draw loops during React StrictMode remounts, so stale loops could keep running and compete with Pixi and React on the main thread.

Fix:

- moved the lifecycle into `src/engine/render/animatedBackground.ts`;
- kept `AbstractBackground.tsx` as a mount/unmount adapter only;
- made the background controller own one scheduled draw loop and clean up `requestAnimationFrame`, timeout, resize listener, and pointer listener;
- capped background redraws with `BACKGROUND_FRAME_INTERVAL_MS`;
- lowered `BACKGROUND_DPR_LIMIT` and reduced generated pattern density in `backgroundPattern.ts`;
- kept `prefers-reduced-motion` as a static draw with no repeating loop.

Observed result: in the in-app browser, idle FPS returned to `120` for repeated samples, and stayed at `120` after drag and zoom smoke tests.

### Game Clock Isolation

Problem: game time must update regularly without causing Pixi scene work.

Fix:

- `src/engine/model/gameClock.ts` owns game-time constants and pure clock advancement;
- `src/engine/time/gameTicker.ts` owns the fixed interval controller;
- `GameTicker.tsx` only mounts the ticker and dispatches `advanceGameTick`;
- `createDeskScene.ts` filters Zustand subscriptions so clock-only changes do not sync or redraw the board.

Current rule: one in-game minute advances every `1000ms`.

### FPS Meter Isolation

Problem: FPS measuring needs `requestAnimationFrame`, but React components should not accumulate runtime loops as local implementation details.

Fix:

- `src/engine/performance/fpsMeter.ts` owns the FPS sampling loop;
- `DebugOverlay.tsx` only mounts the meter and displays sampled values.

### Clock HUD Spacing

Problem: SVG digit spacing made the clock look loose.

Fix: `App.css` tightens `.game-clock__time` gap to `2px` and removes extra delimiter margin.

## Future Optimization Rules

- Identify the continuous workload before tuning constants. Look for active `requestAnimationFrame`, `setInterval`, `setTimeout`, canvas draws, Pixi renders, store subscriptions, and React state updates.
- React components should mount runtime controllers, not contain game loops, canvas loops, or animation schedulers directly.
- Every runtime controller needs an explicit `destroy()` that cancels all frames, timers, listeners, and external references.
- Pixi should stay manually rendered. Keep `autoStart: false`; render on dirty state or active motion only.
- Filter store subscriptions so unrelated state changes do not sync or redraw the Pixi scene.
- Background and decorative systems must be cheaper than gameplay. If FPS drops, disable or degrade background work before touching gameplay interaction.
- Always verify performance with multiple samples after a reload, then smoke-test drag, drop, rejected drop, zoom, and inspector interactions.
- Document the reason, the fix, and the measured result in this file for every optimization.
