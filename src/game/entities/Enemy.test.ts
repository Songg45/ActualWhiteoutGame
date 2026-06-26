import { describe, expect, it } from 'vitest';
import { EnemyModel, type EnemyDefinition } from '../combat/EnemyModel';

const bearDefinition: EnemyDefinition = {
	id: 'test-bear',
	kind: 'bear',
	stats: {
		maxHp: 30,
		speed: 70,
		attackDamage: 6,
		rewards: [{ resource: 'meat', amount: 1 }]
	}
};

describe('EnemyModel', () => {
	it('applies damage, clamps hp, and enters the death lifecycle once', () => {
		const enemy = new EnemyModel(bearDefinition);

		expect(enemy.takeDamage(12, 'player')).toBe(12);
		expect(enemy.hp).toBe(18);
		expect(enemy.isDead()).toBe(false);
		expect(enemy.lastDamageSource).toBe('player');

		expect(enemy.takeDamage(99, 'defense')).toBe(18);
		expect(enemy.hp).toBe(0);
		expect(enemy.isDead()).toBe(true);
		expect(enemy.snapshot.lifecycle).toBe('dead');
		expect(enemy.takeDamage(5, 'player')).toBe(0);

		enemy.markDestroyed();
		expect(enemy.snapshot.lifecycle).toBe('destroyed');
	});

	it('rejects non-finite and non-positive damage', () => {
		const enemy = new EnemyModel(bearDefinition);

		expect(() => enemy.takeDamage(Number.NaN)).toThrow(
			'Damage amount must be a positive finite number.'
		);
		expect(() => enemy.takeDamage(Number.POSITIVE_INFINITY)).toThrow(
			'Damage amount must be a positive finite number.'
		);
		expect(() => enemy.takeDamage(0)).toThrow(
			'Damage amount must be a positive finite number.'
		);
	});

	it('validates combat stats and reward amounts', () => {
		expect(() => new EnemyModel({
			...bearDefinition,
			stats: { ...bearDefinition.stats, maxHp: Number.NaN }
		})).toThrow('Enemy maxHp must be a positive finite number.');

		expect(() => new EnemyModel({
			...bearDefinition,
			stats: { ...bearDefinition.stats, speed: -1 }
		})).toThrow('Enemy speed must be a non-negative finite number.');

		expect(() => new EnemyModel({
			...bearDefinition,
			stats: {
				...bearDefinition.stats,
				rewards: [{ resource: 'meat', amount: Number.POSITIVE_INFINITY }]
			}
		})).toThrow('Enemy reward amount must be a positive finite number.');
	});
});
