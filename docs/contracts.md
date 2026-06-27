# Shared Contracts

## Resources

```ts
export type ResourceType = 'wood' | 'meat' | 'money';
```

## Entity Update

```ts
export interface GameEntity {
	update(time: number, delta: number): void;
	destroy(): void;
}
```

## Damage

```ts
export interface Damageable {
	hp: number;
	maxHp: number;
	takeDamage(amount: number): void;
	isDead(): boolean;
}
```

## Depth Sorting

World objects should use their base Y coordinate for depth:

```ts
container.setDepth(baseY);
```

## Isometric Geometry

- Projection: fixed 2:1 isometric.
- Logical tile: `128 x 64` pixels at 1x world scale.
- Half tile: `64 x 32` pixels.
- World sprite origins represent the documented ground-contact base point.
- Runtime code may import `ISO_GRID` and `worldDepthFromBaseY` from
  `src/game/config.ts`.

Foundation owns this authoritative runtime geometry. Art and map branches must
align their assets and placement logic to these values.

## Map Collision

Ordinary trees are decorative and pass-through: they may add visual forest
density, but they must not contribute blocked grid cells. Boundary collision is
separate from visual forest density. Rocks, fences, bounds, and existing
build/economy objects remain authoritative blockers where their systems declare
collision.

## Map Runtime

Playable maps are authored as `MapRecipe` data and built through `MapRuntime`.
Recipes must include at least one `furnace`, `enemy-spawn`, `npc-spawn`,
`food`, and `wood` anchor. Systems should query anchors through runtime APIs
such as `getAnchors(kind)`, `requireAnchor(kind)`, `getResourceStations()`,
`getBuildPads()`, and `getSpawnLanes('enemy')` instead of depending on legacy
marker IDs.

`camp-01` is the compatibility recipe for the original hand-built map. Its
runtime still emits current marker IDs such as `wood-station`, `meat-station`,
and `furnace-pad` so existing interaction, rendering, and prompt code can keep
working while systems migrate to anchor queries.

## Foundation State

`GameState` owns the canonical global totals for `wood`, `meat`, and `money`,
the current wave number, and unlocked building IDs. Consumers read copies
through `gameState.snapshot` and mutate through `GameState` methods.

The typed `GameEventBus` publishes:

- `state:changed`
- `resource:changed`
- `building:unlocked`
- `wave:changed`
- `station:changed`
- `economy:transfer`

Gameplay systems should subscribe through the returned unsubscribe function
and release subscriptions during scene or object shutdown.

`GameState.reset()` emits `resource:changed` for each non-zero resource and
`wave:changed` when a non-zero wave returns to zero, followed by one final
`state:changed` snapshot. This keeps field-specific consumers synchronized.

## Economy

Collection is automatic and interval-based while the player remains within a
resource station's proximity radius. Drop zones use the same automatic timed
transfer behavior so joystick and keyboard movement never pauses for an action.

`EconomySystem.canAfford(cost)` and `EconomySystem.spend(cost)` accept typed
multi-resource costs. Spending is atomic: an unaffordable cost changes nothing
and returns all missing amounts. `ResourceStore.transferTo` supports bounded
partial transfers for future incremental build-pad funding without coupling the
economy to a building implementation.

## Buildings And Progression

Build pads are data-driven through `BUILDING_DEFINITIONS` in
`src/game/buildings/BuildingTypes.ts` and map runtime build anchors. Runtime
pad state is one of `locked`, `available`, `partially-funded`, `constructing`,
or `complete`.

`ProgressionSystem.getCompletedDefensePlacements()` returns completed turret
and trap placements for `DefenseSystem`. Use this for placement queries;
`GameState.snapshot.unlockedBuildings` indicates availability unlocks, not
completed construction.

Worker automation should gate on `ProgressionSystem.isWorkerHutUnlocked()` or
the `worker-hut` building unlock until Agent 6 adds worker behavior.

## Combat And Rewards

Enemy waves are currently driven by `WaveSystem` using map-runtime enemy spawn
lanes. Bears are the first enemy type and must preserve the food-first economy
contract: bear deaths add `meat` through `GameState.changeResource('meat',
amount)`. Bear kills should not become the primary direct-money source.

The intended downstream loop is:

- bear drops food/meat
- furnace cooks food
- cooked food is sold to NPCs for money

`DefenseSystem` integrates through the scene-level combat hooks instead of
reaching into enemy internals:

- `GameScene.getCombatTargets()`
- `GameScene.applyDamageToEnemy()`

Turret and trap damage must stay range/cooldown gated. Future combat systems
should preserve these hooks rather than duplicating enemy lookup or damage
logic.

Desktop player attack uses `Space`; mobile/touch player attack uses the
lower-right `ATK` affordance. Both should invoke the same attack path so combat
rules stay consistent across input modes.

## NPC Sales

Money comes from customer sales, not direct bear kills. The current PR #17 NPC
loop is intentionally narrow:

- bears and combat provide `meat`
- NPC customers queue for food/service
- successful service consumes bounded `meat` and adds `money`
- insufficient `meat` leaves the queue and resources unchanged

This raw-`meat` service is a temporary compatibility step. The next furnace
cooking pass should introduce a prepared/cooked food output and update customer
sales to buy that prepared output instead of raw bear meat.

Worker automation, wall repair, wood fuel, and bear wall damage are separate
future contracts and should not be mixed into the first NPC sales pass unless
explicitly requested.

## Furnace Cooking Direction

The next economy slice should preserve the existing resource types unless a
small, well-tested cooked-food abstraction is clearly necessary. Acceptable
approaches include a local furnace prepared-food counter or a typed station
inventory that does not destabilize `GameState`'s canonical `wood`, `meat`, and
`money` totals.

The required gameplay direction is:

- bear deaths add raw `meat`
- furnace consumes raw `meat` over time
- furnace produces prepared/cooked food
- NPC customers buy prepared/cooked food for `money`

Defer wood fuel, wall repair, bear wall damage, worker automation, and a broad
resource-type redesign unless explicitly requested.

