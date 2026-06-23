import { describe, expect, it } from 'vitest';
import { gridKey } from '../map/MapData';
import {
	clampGridPoint,
	findGridPath,
	findNearestWalkableGridPoint,
	isWalkableGridPoint,
	MovementSystem
} from './MovementSystem';

const map = {
	width: 5,
	height: 5,
	blockedGridKeys: new Set([
		gridKey({ x: 2, y: 1 }),
		gridKey({ x: 2, y: 2 }),
		gridKey({ x: 2, y: 3 })
	])
};

describe('grid pathfinding', () => {
	it('clamps targets to the declared map bounds', () => {
		expect(clampGridPoint({ x: -4, y: 9 }, map)).toEqual({ x: 0, y: 4 });
	});

	it('recognizes blocked and out-of-bounds cells', () => {
		expect(isWalkableGridPoint({ x: 1, y: 1 }, map)).toBe(true);
		expect(isWalkableGridPoint({ x: 2, y: 2 }, map)).toBe(false);
		expect(isWalkableGridPoint({ x: 5, y: 2 }, map)).toBe(false);
	});

	it('chooses a nearby valid cell when the pointer lands on an obstacle', () => {
		const target = findNearestWalkableGridPoint({ x: 2, y: 2 }, map);
		expect(target).toEqual({ x: 3, y: 2 });
	});

	it('routes around representative blocked footprints', () => {
		const path = findGridPath({ x: 1, y: 2 }, { x: 3, y: 2 }, map);

		expect(path[0]).toEqual({ x: 1, y: 2 });
		expect(path.at(-1)).toEqual({ x: 3, y: 2 });
		expect(path.some((point) => map.blockedGridKeys.has(gridKey(point)))).toBe(false);
		expect(path.length).toBe(7);
	});

	it('returns no route when a walkable target is disconnected', () => {
		const disconnectedMap = {
			width: 3,
			height: 3,
			blockedGridKeys: new Set([
				gridKey({ x: 1, y: 0 }),
				gridKey({ x: 1, y: 1 }),
				gridKey({ x: 1, y: 2 })
			])
		};

		expect(findGridPath(
			{ x: 0, y: 1 },
			{ x: 2, y: 1 },
			disconnectedMap
		)).toEqual([]);
	});
});

describe('screen movement', () => {
	it('moves through waypoints without overshooting and stops at the target', () => {
		const movement = new MovementSystem(100);
		movement.setPath([
			{ grid: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
			{ grid: { x: 1, y: 0 }, screen: { x: 100, y: 0 } }
		]);

		expect(movement.update({ x: 0, y: 0 }, 500)).toEqual({ x: 50, y: 0 });
		expect(movement.isMoving).toBe(true);
		expect(movement.update({ x: 50, y: 0 }, 500)).toEqual({ x: 100, y: 0 });
		expect(movement.isMoving).toBe(false);
	});

	it('replaces an active route with a new pointer target', () => {
		const movement = new MovementSystem(100);
		movement.setPath([
			{ grid: { x: 0, y: 0 }, screen: { x: 0, y: 0 } },
			{ grid: { x: 1, y: 0 }, screen: { x: 100, y: 0 } }
		]);
		const midway = movement.update({ x: 0, y: 0 }, 250);
		expect(midway).toEqual({ x: 25, y: 0 });

		movement.setPath([
			{ grid: { x: 0, y: 0 }, screen: midway },
			{ grid: { x: 0, y: 1 }, screen: { x: 25, y: 100 } }
		]);

		expect(movement.targetGrid).toEqual({ x: 0, y: 1 });
		expect(movement.update(midway, 250)).toEqual({ x: 25, y: 25 });
		expect(movement.isMoving).toBe(true);
	});
});
