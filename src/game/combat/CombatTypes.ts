import type { ResourceType } from '../state/GameState';

export type DamageSource = 'player' | 'defense' | 'environment' | 'unknown';

export interface DamageEvent {
	amount: number;
	source: DamageSource;
	time?: number;
}

export interface DeathReward {
	resource: ResourceType;
	amount: number;
}

export interface Damageable {
	readonly hp: number;
	readonly maxHp: number;
	takeDamage(amount: number, source?: DamageSource): number;
	isDead(): boolean;
}

export interface EnemyCombatStats {
	maxHp: number;
	speed: number;
	attackDamage: number;
	rewards?: readonly DeathReward[];
}

export function assertFinitePositiveDamage(amount: number): void {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new RangeError('Damage amount must be a positive finite number.');
	}
}

export function assertFiniteNonNegativeStat(value: number, label: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(`${label} must be a non-negative finite number.`);
	}
}

export function assertFinitePositiveStat(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${label} must be a positive finite number.`);
	}
}
