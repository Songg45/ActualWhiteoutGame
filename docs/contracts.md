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

