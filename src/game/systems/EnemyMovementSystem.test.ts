import { describe, expect, it } from 'vitest';
import { advanceEnemyPath, createEnemyPathState, pruneInactiveEnemies } from './EnemyMovementSystem';

const origin = { x: 960, y: 130 };

describe('EnemyMovementSystem', () => {
	it('moves an enemy toward the next lane point without overshooting', () => {
		const path = [
			{ x: 13, y: 6.5 },
			{ x: 11.5, y: 6.5 }
		];
		const start = createEnemyPathState(path, origin);
		const next = advanceEnemyPath(start, path, origin, 60, 500);

		expect(next.complete).toBe(false);
		expect(next.position.x).toBeLessThan(start.position.x);
		expect(next.position.y).toBeLessThan(start.position.y);
		expect(Math.hypot(
			next.position.x - start.position.x,
			next.position.y - start.position.y
		)).toBeCloseTo(30, 3);
	});

	it('marks the path complete when enough movement reaches the objective', () => {
		const path = [
			{ x: 6.5, y: 0 },
			{ x: 6.5, y: 1.5 },
			{ x: 6.5, y: 3 }
		];
		const start = createEnemyPathState(path, origin);
		const finished = advanceEnemyPath(start, path, origin, 500, 1000);

		expect(finished.complete).toBe(true);
		expect(finished.targetIndex).toBe(2);
		expect(finished.position).toEqual({ x: 1184, y: 434 });
	});

	it('prunes dead enemies and enemies that reached the objective', () => {
		const active = { reachedObjective: false, isDead: () => false };
		const dead = { reachedObjective: false, isDead: () => true };
		const finished = { reachedObjective: true, isDead: () => false };

		expect(pruneInactiveEnemies([active, dead, finished])).toEqual([active]);
	});
});
