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

