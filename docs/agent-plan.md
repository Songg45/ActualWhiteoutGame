# Actual Whiteout Game Agent Plan

## Project Goal

Build a browser-playable isometric survival/resource-management prototype inspired by the provided Whiteout-style screenshots.

Recommended stack:

- Vite
- TypeScript
- Phaser
- GitHub branch-per-agent workflow

## Current Status

Merged through PR #17:

- Agent 1 foundation, Agent 10 placeholder art, Agent 2 map, Agent 3 movement, free-movement controls, Agent 4 economy, Agent 5 build pads/progression, tree collision pass, map runtime architecture, Agent 7 enemy combat skeleton, Agent 8 defensive turrets/traps, and Agent 6 NPC customer sales are on `main`.
- The current map is authored as `camp-01` through `MapRecipe` / `MapRuntime`.
- Ordinary trees are non-blocking scenery. Rocks, fences, bounds, build pads, and authored blockers remain blocking.
- Player movement is continuous free-walk with keyboard and mobile joystick input.
- Enemy combat currently supports bear waves, enemy health bars, player attack by `Space`, mobile `ATK` button, meat-first death rewards, and stable hooks for future defenses.
- Completed turret and trap placements now automatically damage bears through the public combat hooks.
- Customer NPCs now queue near the exchange/food area, consume bounded `meat`, and pay `money`.
- The intended economy direction is:
  - bear drops food/meat
  - furnace cooks food
  - cooked food is sold to NPCs for money
  - later: forest wood powers the furnace and repairs bear-damaged walls

Next recommended implementation slice: furnace cooking, scoped to converting bear meat into a prepared food output that NPCs buy.

## Agent 1: Project Foundation / Game Architecture

Mission: Set up the browser game project and core Phaser structure.

Responsibilities:

- Create or adapt the app structure for Phaser 3.
- Configure Vite, TypeScript, linting if appropriate.
- Create the main game boot flow:
  - `BootScene`
  - `PreloadScene`
  - `GameScene`
  - optional `UIScene`
- Define shared constants:
  - tile size
  - world bounds
  - depth sorting rules
  - game scale config
- Add a central game state model:
  - money
  - wood
  - meat
  - unlocked buildings
  - wave number
- Create a lightweight event bus for communication between gameplay and UI.

Deliverables:

- Running browser game shell.
- Phaser canvas fills available viewport.
- Empty `GameScene` loads successfully.
- Placeholder assets can be loaded and displayed.
- Basic debug overlay optional.

Suggested files:

- `src/main.ts`
- `src/game/config.ts`
- `src/game/scenes/BootScene.ts`
- `src/game/scenes/PreloadScene.ts`
- `src/game/scenes/GameScene.ts`
- `src/game/state/GameState.ts`
- `src/game/events/GameEvents.ts`

Acceptance criteria:

- `npm run dev` starts the game.
- Game opens in browser with a visible canvas.
- Scene switching works.
- Resize/mobile scaling is stable.

## Agent 2: Isometric Map / Environment

Mission: Build the snowy isometric playfield.

Responsibilities:

- Create the first playable map:
  - fenced camp area
  - snow outside
  - trees around edges
  - gates/openings
  - build pads
  - resource stations
  - enemy spawn lanes
- Implement isometric coordinate helpers:
  - grid-to-screen conversion
  - screen-to-grid conversion if needed
- Implement depth sorting based on `y` position.
- Add collision/blocking zones:
  - fences
  - trees
  - buildings
  - rocks
- Use placeholder art first: colored shapes or generated/simple sprites.
- Make the map readable from a top-down/isometric perspective.

Deliverables:

- A navigable isometric camp.
- Static objects placed in a data-driven way.
- Collision map or blocked regions.
- Spawn zones for enemies.

Suggested files:

- `src/game/map/IsoMath.ts`
- `src/game/map/MapData.ts`
- `src/game/map/MapBuilder.ts`
- `src/game/objects/EnvironmentObject.ts`

Acceptance criteria:

- Player can visually understand camp boundaries.
- Objects sort correctly when player walks behind/in front of them.
- Collision prevents walking through major obstacles.
- Map works at desktop and mobile aspect ratios.

## Agent 3: Player Movement / Interaction

Mission: Implement click/tap movement and player interaction with stations/build pads.

Responsibilities:

- Add player character entity.
- Implement click/tap-to-move.
- Add simple pathfinding or steering:
  - minimum: move directly toward tapped point with collision checks
  - better: grid-based A* around obstacles
- Add player animation states:
  - idle
  - walking
  - carrying
  - interacting
- Add interaction detection:
  - near resource station
  - near build pad
  - near drop zone
- Add visible carry stack above/behind player.
- Define inventory limits:
  - max carried wood
  - max carried meat
  - max carried money/items if relevant

Deliverables:

- Player moves smoothly to click/tap targets.
- Player can collect from stations.
- Player can deposit resources into build pads.
- Carrying resources is visibly represented.

Suggested files:

- `src/game/entities/Player.ts`
- `src/game/systems/MovementSystem.ts`
- `src/game/systems/InteractionSystem.ts`
- `src/game/systems/CarryStackSystem.ts`

Acceptance criteria:

- Movement feels responsive.
- Player cannot leave intended play area.
- Carry stack updates visually as resources change.
- Player can complete a collect/deposit loop.

## Agent 4: Resource Economy

Mission: Build the gather, carry, sell, and spend loop.

Responsibilities:

- Define resource types:
  - wood
  - meat
  - money
- Add production stations:
  - wood pile / logging station
  - meat table / hunting station
  - money collection pad
- Implement resource generation over time.
- Implement collection logic:
  - station holds resources
  - player picks up until capacity
  - player deposits into target
- Implement build costs.
- Implement upgrade costs if included.
- Add floating resource feedback:
  - `+wood`
  - `+meat`
  - `+$`
- Balance starting values.

Deliverables:

- Data-driven resource system.
- Stations generate or store resources.
- Build pads consume resources.
- UI receives resource updates.

Suggested files:

- `src/game/resources/ResourceTypes.ts`
- `src/game/resources/ResourceStore.ts`
- `src/game/objects/ResourceStation.ts`
- `src/game/objects/DropZone.ts`
- `src/game/systems/EconomySystem.ts`

Acceptance criteria:

- Player can collect resources.
- Player can spend resources.
- Resource totals stay consistent.
- No negative resource states.
- Economy loop is fun enough for a prototype.

## Agent 5: Buildings / Build Pads / Progression

Mission: Implement unlockable buildings and construction zones.

Responsibilities:

- Add build pads with visible cost labels.
- Build pad states:
  - locked
  - available
  - partially funded
  - building
  - completed
- Add building types:
  - furnace/campfire
  - turret tower
  - meat station
  - wood station
  - worker hut
  - gate/fence repair
- Allow resources to be deposited incrementally.
- On completion, replace pad with building.
- Add simple progression:
  - build furnace first
  - unlock turret
  - unlock worker
  - trigger bear wave

Deliverables:

- Multiple build pads.
- Construction progress display.
- Buildings appear when completed.
- New gameplay features unlock from buildings.

Suggested files:

- `src/game/buildings/BuildingTypes.ts`
- `src/game/buildings/BuildPad.ts`
- `src/game/buildings/BuildingFactory.ts`
- `src/game/systems/ProgressionSystem.ts`

Acceptance criteria:

- Player sees what each pad costs.
- Depositing resources progresses construction.
- Completed buildings affect gameplay.
- Progression has a clear first 5-minute loop.

## Agent 6: Workers / NPC Queue System

Mission: Add customer NPCs that queue and buy food, plus reserve worker hooks for later automation. Agent 6 is merged as PR #17.

Responsibilities:

- Create NPC entity.
- Add queue path positions.
- Implement queue behavior:
  - NPC spawns
  - walks to queue
  - waits
  - receives food/service
  - pays money or leaves
- Add worker behavior only if it can stay small:
  - assigned worker gathers resource
  - transports to station/drop zone
  - repeats loop
- Prefer the customer sales loop before worker automation.
- Keep behaviors simple and data-driven.
- Add visual distinction:
  - customers in blue coats
  - workers with tools/backpacks

Deliverables:

- NPCs queue at resource table or gate.
- NPCs can exchange money for food.
- Optional hired worker automates one route.

Suggested files:

- `src/game/entities/NPC.ts`
- `src/game/entities/Worker.ts`
- `src/game/systems/QueueSystem.ts`
- `src/game/systems/WorkerSystem.ts`

Acceptance criteria:

- NPCs move without blocking the player.
- Queues look believable.
- Player can serve NPCs.
- Money generation works through NPC food sales.
- Bear meat rewards and defensive targeting remain unchanged.
- Current implementation sells raw `meat` as a temporary food input until the furnace cooking pass introduces prepared food.

## Agent 7: Enemies / Combat / Waves

Mission: Implement bears/enemies and the combat wave skeleton.

Responsibilities:

- Create enemy entity:
  - health
  - speed
  - target
  - attack damage
- Add enemy spawn points outside the fence.
- Implement wave manager:
  - wave timer
  - spawn count
  - enemy health scaling
- Implement enemy behavior:
  - spawn from map-runtime enemy anchors/spawn lanes
  - move along the authored lane
  - reserve gate/fence/building attacks for a later wall-defense pass
- Implement health bars.
- Implement death rewards:
  - bears must reward meat/food as the primary resource
  - bear kills must not become the direct main money source
- Add basic combat interactions:
  - player can damage nearby enemy
  - keyboard `Space` attack
  - mobile/touch `ATK` attack button
  - expose target and damage hooks for Agent 8 defenses

Deliverables:

- Enemy waves spawn.
- Enemies move along spawn lanes.
- Enemies can be killed.
- Bear deaths feed the meat/food economy path.
- Combat hooks are available for future turrets/traps.

Suggested files:

- `src/game/entities/Enemy.ts`
- `src/game/combat/CombatTypes.ts`
- `src/game/systems/WaveSystem.ts`
- `src/game/systems/CombatSystem.ts`
- `src/game/systems/EnemyMovementSystem.ts`
- `src/game/systems/EnemyRewardSystem.ts`
- `src/game/systems/MobileAttackButton.ts`

Acceptance criteria:

- Waves create pressure but are survivable.
- Player can attack on desktop and mobile.
- Enemy health bars update correctly.
- Enemy deaths produce usable resources.
- `getCombatTargets()` and `applyDamageToEnemy()` remain stable for Agent 8.

## Agent 8: Defensive Buildings / Turrets / Traps

Mission: Implement auto-defense structures like crossbow towers and spinning axe traps.

Responsibilities:

- Add turret building behavior:
  - query completed defense placements from progression
  - query enemies through `GameScene.getCombatTargets()`
  - apply damage through `GameScene.applyDamageToEnemy()`
  - scan radius
  - target nearest enemy
  - fire projectile
  - cooldown
  - damage
- Add projectile visuals.
- Add spinning axe trap:
  - rotating weapon visuals
  - area damage
  - cooldown or continuous damage
- Add upgrade hooks:
  - damage
  - range
  - rate of fire
- Make defensive effects readable and juicy:
  - impact flashes
  - small knockback
  - hit particles

Deliverables:

- Functional turret.
- Functional area trap.
- Combat feedback effects.

Suggested files:

- `src/game/buildings/Turret.ts`
- `src/game/buildings/Trap.ts`
- `src/game/combat/Projectile.ts`
- `src/game/systems/DefenseSystem.ts`

Acceptance criteria:

- Turrets automatically shoot enemies.
- Traps damage enemies in range.
- Defensive buildings can be built through build pads.
- Bear meat rewards remain unchanged.
- Effects do not tank performance.
- Agent 8 is merged as PR #16; future agents should treat `DefenseSystem` as the current defense integration point.

## Agent 9: UI / Mobile Controls / HUD

Mission: Create game HUD and mobile-friendly interaction polish.

Responsibilities:

- Add HUD:
  - money
  - wood
  - meat
  - current wave
  - carried resources
- Add build pad labels:
  - icon
  - cost
  - progress
- Add floating prompts:
  - checkmark when resource is ready
  - plus icon on build pads
- Add mobile layout:
  - full-screen canvas
  - safe-area padding
  - large readable labels
- Add pause/settings overlay.
- Add start/restart/win/lose screens if needed.

Deliverables:

- Clean HUD over Phaser canvas.
- Mobile and desktop responsive UI.
- Clear affordances for build costs and interactions.

Suggested files:

- `src/game/ui/HUD.ts`
- `src/game/ui/BuildLabel.ts`
- `src/game/ui/FloatingText.ts`
- `src/game/ui/GameOverPanel.ts`

Acceptance criteria:

- Player always knows current resources.
- Build costs are readable.
- UI does not block gameplay.
- Touch targets are comfortable on mobile.

## Agent 10: Art Direction / Placeholder Asset Pipeline

Mission: Produce cohesive prototype assets that resemble the toy-like snowy mobile game style.

Responsibilities:

- Define art style:
  - bright snowy palette
  - chunky isometric props
  - readable silhouettes
  - warm camp interior vs cold forest exterior
- Create placeholder sprites or simple generated assets for:
  - player
  - worker/customer
  - bear
  - trees
  - fence
  - gate
  - turret
  - furnace
  - meat stack
  - wood stack
  - money stack
- Ensure assets support depth sorting.
- Keep assets lightweight for browser performance.
- Document naming conventions.

Deliverables:

- First-pass asset pack.
- Asset manifest.
- Style guide notes.

Suggested folders:

- `public/assets/sprites/`
- `public/assets/ui/`
- `public/assets/effects/`
- `docs/art-style.md`

Acceptance criteria:

- Game has a unified visual identity.
- All placeholder assets are readable at mobile scale.
- Assets are easy to replace later.

## Agent 11: Game Feel / Effects / Polish

Mission: Make interactions satisfying.

Responsibilities:

- Add particle effects:
  - snow puffs
  - resource pickup sparkle
  - hit sparks
  - meat/wood burst
- Add screen/camera polish:
  - gentle follow
  - tiny shake on big impacts
  - zoom framing
- Add animation tweens:
  - resources fly into player stack
  - money flies into HUD
  - build completion pop
  - turret recoil
- Add sound hooks, even if placeholder.
- Tune timings:
  - pickup interval
  - attack cooldown
  - movement speed
  - wave pacing

Deliverables:

- Juicy feedback for key actions.
- Camera follows player comfortably.
- Prototype feels lively.

Suggested files:

- `src/game/effects/ParticleEffects.ts`
- `src/game/effects/TweenEffects.ts`
- `src/game/audio/AudioManager.ts`
- `src/game/camera/CameraController.ts`

Acceptance criteria:

- Collecting and building feel satisfying.
- Combat impacts are readable.
- Effects improve clarity without clutter.

## Agent 12: QA / Integration / Balance

Mission: Keep the whole thing playable and stable.

Responsibilities:

- Test core gameplay loop:
  - start game
  - collect resource
  - build station
  - defend wave
  - earn reward
  - build next item
- Check desktop and mobile viewport sizes.
- Find bugs:
  - stuck player
  - stuck NPC
  - unreachable build pads
  - negative resources
  - enemy pathing failures
- Tune initial values:
  - resource generation rate
  - build costs
  - enemy speed/health
  - turret damage
- Write a small manual test checklist.
- Add automated smoke tests if practical.

Deliverables:

- Bug list with priorities.
- Balance pass.
- Manual test script.
- Final playability sign-off.

Suggested files:

- `docs/test-plan.md`
- `docs/balance-notes.md`
- optional: `tests/game-smoke.spec.ts`

Acceptance criteria:

- Full prototype loop can be completed.
- No major blocker bugs.
- Game remains readable on mobile.
- Performance is acceptable.

## Agent 13: Integration / PR Review

Mission: Review, approve, and merge agent branches in a controlled order.

Responsibilities:

- Review each branch/PR for scope, correctness, and conflicts.
- Run the game locally.
- Verify the PR meets its acceptance criteria.
- Check that shared contracts were not broken.
- Request changes when needed.
- Approve PRs that are ready.
- Merge PRs in the planned order.
- Update `docs/integration-log.md`.

Review checklist:

- Branch is up to date with `main`.
- Scope matches assigned agent area.
- Game starts successfully.
- No obvious console errors.
- Acceptance criteria are met.
- Shared contracts are respected.
- Mobile viewport still works.
- No unrelated files changed.
- PR includes test notes.

## Integration Order

1. Agent 1 creates the foundation.
2. Agent 2 builds the map.
3. Agent 3 adds player movement.
4. Agent 4 adds resources.
5. Agent 5 adds construction/progression.
6. Agent 7 adds enemies.
7. Agent 8 adds defenses.
8. Agent 9 adds HUD and mobile polish.
9. Agent 6 adds workers/NPC queues.
10. Agent 10 improves assets throughout.
11. Agent 11 adds game feel.
12. Agent 12 continuously tests and balances.
13. Agent 13 reviews and merges branches.

The minimum playable slice is Agents 1-5 plus 7-9. Agents 6, 10, 11, and 12 turn it from working prototype into something people might actually keep playing.
