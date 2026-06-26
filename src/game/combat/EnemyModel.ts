import {
	assertFiniteNonNegativeStat,
	assertFinitePositiveDamage,
	assertFinitePositiveStat,
	type DamageSource,
	type Damageable,
	type DeathReward,
	type EnemyCombatStats
} from './CombatTypes';

export type EnemyKind = 'bear';
export type EnemyLifecycleState = 'alive' | 'dead' | 'destroyed';

export interface EnemyDefinition {
	id: string;
	kind: EnemyKind;
	stats: EnemyCombatStats;
}

export interface EnemyModelSnapshot {
	id: string;
	kind: EnemyKind;
	hp: number;
	maxHp: number;
	speed: number;
	attackDamage: number;
	lifecycle: EnemyLifecycleState;
	rewards: readonly DeathReward[];
	lastDamageSource?: DamageSource;
}

export class EnemyModel implements Damageable {
	private hpValue: number;
	private lifecycle: EnemyLifecycleState = 'alive';
	private lastDamageSourceValue?: DamageSource;
	readonly maxHp: number;
	readonly speed: number;
	readonly attackDamage: number;
	readonly rewards: readonly DeathReward[];

	constructor(readonly definition: EnemyDefinition) {
		const { maxHp, speed, attackDamage, rewards = [] } = definition.stats;
		assertFinitePositiveStat(maxHp, 'Enemy maxHp');
		assertFiniteNonNegativeStat(speed, 'Enemy speed');
		assertFiniteNonNegativeStat(attackDamage, 'Enemy attackDamage');

		this.maxHp = maxHp;
		this.hpValue = maxHp;
		this.speed = speed;
		this.attackDamage = attackDamage;
		this.rewards = rewards.map((reward) => {
			assertFiniteNonNegativeStat(reward.amount, 'Enemy reward amount');
			return { ...reward };
		});
	}

	get id(): string {
		return this.definition.id;
	}

	get kind(): EnemyKind {
		return this.definition.kind;
	}

	get hp(): number {
		return this.hpValue;
	}

	get lastDamageSource(): DamageSource | undefined {
		return this.lastDamageSourceValue;
	}

	get snapshot(): EnemyModelSnapshot {
		return {
			id: this.id,
			kind: this.kind,
			hp: this.hp,
			maxHp: this.maxHp,
			speed: this.speed,
			attackDamage: this.attackDamage,
			lifecycle: this.lifecycle,
			rewards: this.rewards.map((reward) => ({ ...reward })),
			lastDamageSource: this.lastDamageSource
		};
	}

	takeDamage(amount: number, source: DamageSource = 'unknown'): number {
		assertFinitePositiveDamage(amount);
		if (this.isDead()) {
			return 0;
		}

		const previous = this.hpValue;
		this.hpValue = Math.max(0, this.hpValue - amount);
		this.lastDamageSourceValue = source;
		if (this.hpValue === 0) {
			this.lifecycle = 'dead';
		}
		return previous - this.hpValue;
	}

	isDead(): boolean {
		return this.lifecycle !== 'alive';
	}

	markDestroyed(): void {
		this.lifecycle = 'destroyed';
	}
}
