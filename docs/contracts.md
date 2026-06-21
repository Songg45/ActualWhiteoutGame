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

This contract deliberately matches the asset geometry proposed by Agent 10 in
PR #1.

## Foundation State

`GameState` owns the canonical global totals for `wood`, `meat`, and `money`,
the current wave number, and unlocked building IDs. Consumers read copies
through `gameState.snapshot` and mutate through `GameState` methods.

The typed `GameEventBus` publishes:

- `state:changed`
- `resource:changed`
- `building:unlocked`
- `wave:changed`

Gameplay systems should subscribe through the returned unsubscribe function
and release subscriptions during scene or object shutdown.

