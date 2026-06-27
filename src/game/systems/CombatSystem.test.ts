import { describe, expect, it } from 'vitest';
import { EnemyModel } from '../combat/EnemyModel';
import { applyCombatDamage, findNearestTarget, type CombatTarget } from './CombatSystem';

function target(id: string, x: number, y: number, hp = 10): CombatTarget {
	const model = new EnemyModel({
		id,
		kind: 'bear',
		stats: {
			maxHp: hp,
			speed: 0,
			attackDamage: 0
		}
	});
	return {
		id,
		x,
		y,
		get hp() {
			return model.hp;
		},
		get maxHp() {
			return model.maxHp;
		},
		takeDamage: (amount, source) => model.takeDamage(amount, source),
		isDead: () => model.isDead()
	};
}

describe('CombatSystem', () => {
	it('finds the nearest living target inside range', () => {
		const near = target('near', 10, 0);
		const closerDead = target('dead', 2, 0);
		closerDead.takeDamage(10, 'player');
		const far = target('far', 200, 0);

		expect(findNearestTarget([far, near, closerDead], { x: 0, y: 0 }, 50)?.id).toBe('near');
		expect(findNearestTarget([far], { x: 0, y: 0 }, 50)).toBeUndefined();
	});

	it('reports when damage kills a target', () => {
		const enemy = target('bear', 0, 0, 15);

		expect(applyCombatDamage(enemy, 5, 'player')).toEqual({
			applied: 5,
			killed: false
		});
		expect(applyCombatDamage(enemy, 20, 'player')).toEqual({
			applied: 10,
			killed: true
		});
	});
});
