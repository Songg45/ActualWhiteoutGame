# Test Plan

## Tooling Smoke Test

- `pnpm build` completes.
- `pnpm dev` serves the game locally.
- Browser opens to the local URL without console-blocking errors.

## Prototype Loop

- Player can move.
- Player can collect resources.
- Player can deposit resources at build pads.
- Buildings can complete.
- Enemies can spawn.
- Defenses can damage enemies.
- At 320x480, the lower-right attack button damages an in-range enemy without blocking the lower-left movement joystick.
- The player can survive or fail a wave.
