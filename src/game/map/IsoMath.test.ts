import { describe, expect, it } from 'vitest';
import {
	getTileDiamond,
	gridToScreen,
	screenToGrid,
	screenToNearestGrid
} from './IsoMath';

describe('isometric coordinate helpers', () => {
	it('projects the authoritative 128x64 grid', () => {
		expect(gridToScreen({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
		expect(gridToScreen({ x: 1, y: 0 })).toEqual({ x: 64, y: 32 });
		expect(gridToScreen({ x: 0, y: 1 })).toEqual({ x: -64, y: 32 });
		expect(gridToScreen({ x: 3, y: 2 })).toEqual({ x: 64, y: 160 });
	});

	it('round trips positive, fractional, and negative grid positions', () => {
		const positions = [
			{ x: 4, y: 7 },
			{ x: 1.25, y: 3.5 },
			{ x: -2, y: 5 }
		];

		for (const position of positions) {
			const result = screenToGrid(gridToScreen(position));
			expect(result.x).toBeCloseTo(position.x);
			expect(result.y).toBeCloseTo(position.y);
		}
	});

	it('applies the same custom origin in both directions', () => {
		const origin = { x: 960, y: 180 };
		const screen = gridToScreen({ x: 2, y: 4 }, origin);

		expect(screen).toEqual({ x: 832, y: 372 });
		expect(screenToGrid(screen, origin)).toEqual({ x: 2, y: 4 });
	});

	it('snaps screen positions to the nearest tile center', () => {
		expect(screenToNearestGrid({ x: 69, y: 36 })).toEqual({ x: 1, y: 0 });
		expect(screenToNearestGrid({ x: -58, y: 35 })).toEqual({ x: 0, y: 1 });
	});

	it('returns diamond corners in clockwise order', () => {
		expect(getTileDiamond({ x: 0, y: 0 })).toEqual([
			{ x: 0, y: -32 },
			{ x: 64, y: 0 },
			{ x: 0, y: 32 },
			{ x: -64, y: 0 }
		]);
	});
});
