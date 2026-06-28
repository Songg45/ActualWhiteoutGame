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

- Complete the furnace, then complete each visible tower pad; start a bear wave and verify both towers fire visible bolts at nearby bears.
- Verify tower damage has a cooldown by confirming a bear is not damaged every frame while inside range.
- Confirm no trap pad appears in `camp-01`; trap behavior remains covered by automated defense tests for future maps.
- Kill a bear with defense damage and verify the reward is still meat/food, not direct money.

## NPC Sales Smoke

- Wait for blue customer NPCs to spawn from the camp NPC anchor and queue near the exchange/food area without blocking player movement.
- Confirm there is no visible or collectable `meat-station`; bear kills are the meat source.
- Complete the furnace and verify raw `meat` in `GameState` cooks into the furnace's prepared-food count over time.
- With prepared food available, verify the head customer is served, one prepared food is consumed, money increases, and the customer walks away.
- With no prepared food available, verify the head customer remains queued and raw `meat`, prepared food, and money do not become negative or non-finite.
- Confirm bear deaths still grant meat and defenses still damage bears through the existing turret/trap cooldown behavior.
