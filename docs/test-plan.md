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

## Defense Smoke

- Complete the furnace, then complete the turret pad; start a bear wave and verify the turret fires visible bolts at nearby bears.
- Verify turret damage has a cooldown by confirming a bear is not damaged every frame while inside range.
- Complete the trap pad; lure bears near it and verify the trap pulse damages bears in its area without changing player movement or attack input.
- Kill a bear with defense damage and verify the reward is still meat/food, not direct money.
