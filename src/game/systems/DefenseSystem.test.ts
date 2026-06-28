import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { CompletedBuilding } from '../buildings/BuildingTypes';
import type { DefenseTarget } from './DefenseSystem';
import {
	DefenseSystem,
	findNearestDefenseTarget,
	findTargetsInRange,
	type DefenseCombatPort,
	type DefenseProgressionPort
} from './DefenseSystem';

function target(id: string, x: number, y: number, dead = false): DefenseTarget {
	return {
		id,
		x,
		y,
		isDead: () => dead
	};
}

function completed(
	id: 'turret' | 'trap',
	padId: string,
	x = 0,
	y = 0
): CompletedBuilding {
	return {
		id,
		padId,
		label: id,
		grid: { x, y },
		completedAtMs: 1
	};
}

function fakeScene(): Phaser.Scene {
	const graphics = {
		setDepth: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		lineBetween: vi.fn().mockReturnThis(),
		strokeEllipse: vi.fn().mockReturnThis(),
		destroy: vi.fn()
	};
	const circle = {
		setDepth: vi.fn().mockReturnThis(),
		destroy: vi.fn()
	};
	return {
		add: {
			graphics: vi.fn(() => graphics),
			circle: vi.fn(() => circle)
		},
		tweens: {
			add: vi.fn()
		}
	} as unknown as Phaser.Scene;
}

describe('DefenseSystem target selection', () => {
	it('picks the nearest living target in range with deterministic id tie breaks', () => {
		const origin = { x: 0, y: 0 };
		const selected = findNearestDefenseTarget([
			target('bear-c', 90, 0),
			target('bear-b', 50, 0, true),
			target('bear-a', -90, 0),
			target('bear-d', 180, 0)
		], origin, 100);

		expect(selected?.id).toBe('bear-a');
		expect(findNearestDefenseTarget([target('far', 101, 0)], origin, 100)).toBeUndefined();
	});

	it('sorts trap victims by distance and id while ignoring dead/out-of-range enemies', () => {
		expect(findTargetsInRange([
			target('bear-c', 75, 0),
			target('bear-b', -25, 0),
			target('bear-a', 25, 0),
			target('dead', 10, 0, true),
			target('far', 150, 0)
		], { x: 0, y: 0 }, 100).map((candidate) => candidate.id)).toEqual([
			'bear-a',
			'bear-b',
			'bear-c'
		]);
	});
});

describe('DefenseSystem', () => {
	it('fires completed turrets through the combat hook and respects cooldown', () => {
		const progression: DefenseProgressionPort = {
			getCompletedDefensePlacements: () => ({
				turrets: [completed('turret', 'turret-pad')],
				traps: []
			})
		};
		const combat: DefenseCombatPort = {
			getCombatTargets: () => [
				target('far-bear', 250, 0),
				target('near-bear', 80, 0)
			],
			applyDamageToEnemy: vi.fn(() => ({ applied: 12, killed: false }))
		};
		const system = new DefenseSystem(fakeScene(), progression, { x: 0, y: 0 }, combat, {
			turretRange: 200,
			turretDamage: 12,
			turretCooldownMs: 900
		});

		system.update(0);
		system.update(500);
		system.update(900);

		expect(combat.applyDamageToEnemy).toHaveBeenCalledTimes(2);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(1, 'near-bear', 12);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(2, 'near-bear', 12);
	});

	it('tracks cooldown separately for distinct completed turret pad ids', () => {
		const progression: DefenseProgressionPort = {
			getCompletedDefensePlacements: () => ({
				turrets: [
					completed('turret', 'south-tower-pad', 0, 0),
					completed('turret', 'north-tower-pad', 0, 0)
				],
				traps: []
			})
		};
		const combat: DefenseCombatPort = {
			getCombatTargets: () => [target('near-bear', 80, 0)],
			applyDamageToEnemy: vi.fn(() => ({ applied: 12, killed: false }))
		};
		const system = new DefenseSystem(fakeScene(), progression, { x: 0, y: 0 }, combat, {
			turretRange: 200,
			turretDamage: 12,
			turretCooldownMs: 900
		});

		system.update(0);
		system.update(500);

		expect(combat.applyDamageToEnemy).toHaveBeenCalledTimes(2);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(1, 'near-bear', 12);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(2, 'near-bear', 12);
	});

	it('pulses completed traps against every nearby target on trap cooldown', () => {
		const progression: DefenseProgressionPort = {
			getCompletedDefensePlacements: () => ({
				turrets: [],
				traps: [completed('trap', 'trap-pad')]
			})
		};
		const combat: DefenseCombatPort = {
			getCombatTargets: () => [
				target('bear-a', 30, 0),
				target('bear-b', 90, 0),
				target('far-bear', 150, 0)
			],
			applyDamageToEnemy: vi.fn(() => ({ applied: 8, killed: false }))
		};
		const system = new DefenseSystem(fakeScene(), progression, { x: 0, y: 0 }, combat, {
			trapRange: 100,
			trapDamage: 8,
			trapCooldownMs: 1200
		});

		system.update(0);
		system.update(600);
		system.update(1200);

		expect(combat.applyDamageToEnemy).toHaveBeenCalledTimes(4);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(1, 'bear-a', 8);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(2, 'bear-b', 8);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(3, 'bear-a', 8);
		expect(combat.applyDamageToEnemy).toHaveBeenNthCalledWith(4, 'bear-b', 8);
	});
});
