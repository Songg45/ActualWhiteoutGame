import { describe, expect, it } from 'vitest';
import { gridToScreen } from '../map/IsoMath';
import { gridKey } from '../map/MapData';
import {
	canOccupyWorldPosition,
	combineMovementDirections,
	keyboardMovementDirection,
	moveWithCollision,
	MovementSystem,
	normalizeMovementDirection
} from './MovementSystem';

const origin = { x: 500, y: 100 };
const map = {
	width: 5,
	height: 5,
	origin,
	blockedGridKeys: new Set([gridKey({ x: 2, y: 2 })])
};

describe('continuous movement input', () => {
	it('normalizes keyboard diagonals without slowing cardinal input', () => {
		expect(keyboardMovementDirection({
			left: false,
			right: true,
			up: true,
			down: false
		})).toEqual({
			x: 1 / Math.sqrt(2),
			y: -1 / Math.sqrt(2)
		});
		expect(keyboardMovementDirection({
			left: true,
			right: true,
			up: false,
			down: false
		})).toEqual({ x: 0, y: 0 });
	});

	it('combines keyboard and joystick input with a maximum magnitude of one', () => {
		const direction = combineMovementDirections(
			{ x: 1, y: 0 },
			{ x: 0.7, y: 0.7 }
		);
		expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
		expect(normalizeMovementDirection({ x: 0.25, y: 0 })).toEqual({ x: 0.25, y: 0 });
	});

	it('moves by speed times delta and stops immediately after clear', () => {
		const movement = new MovementSystem(map, 100, 0);
		const start = gridToScreen({ x: 1, y: 1 }, origin);
		movement.setDirection({ x: 0.6, y: 0 });

		const moved = movement.update(start, 500);
		expect(moved.x).toBeCloseTo(start.x + 30);
		expect(moved.y).toBe(start.y);
		expect(movement.isMoving).toBe(true);

		movement.clear();
		expect(movement.update(moved, 500)).toEqual({ ...moved, moved: false });
		expect(movement.isMoving).toBe(false);
	});
});

describe('continuous collision', () => {
	it('keeps the player body inside map bounds', () => {
		const nearEdge = gridToScreen({ x: 0, y: 1 }, origin);
		const result = moveWithCollision(nearEdge, { x: -500, y: -500 }, map, 12);

		expect(canOccupyWorldPosition(result, map, 12)).toBe(true);
		expect(result.x).not.toBe(nearEdge.x - 500);
	});

	it('blocks occupied footprints while allowing free positions', () => {
		expect(canOccupyWorldPosition(gridToScreen({ x: 2, y: 2 }, origin), map, 12)).toBe(false);
		expect(canOccupyWorldPosition(gridToScreen({ x: 1, y: 1 }, origin), map, 12)).toBe(true);
	});

	it('slides along a blocked footprint when one movement axis remains open', () => {
		const start = gridToScreen({ x: 1.1, y: 2 }, origin);
		const result = moveWithCollision(start, { x: 90, y: 55 }, map, 10);

		expect(result.moved).toBe(true);
		expect(result.y).toBeGreaterThan(start.y);
		expect(canOccupyWorldPosition(result, map, 10)).toBe(true);
	});

	it('uses substeps so a large delta cannot tunnel through a blocked cell', () => {
		const start = gridToScreen({ x: 1, y: 2 }, origin);
		const result = moveWithCollision(start, { x: 180, y: 90 }, map, 10);
		const blockedCenter = gridToScreen({ x: 2, y: 2 }, origin);

		expect(canOccupyWorldPosition(result, map, 10)).toBe(true);
		expect(result.x).toBeLessThan(blockedCenter.x + 64);
	});
});
