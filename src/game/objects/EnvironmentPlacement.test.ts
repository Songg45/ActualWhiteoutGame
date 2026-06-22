import { describe, expect, it } from 'vitest';
import { worldDepthFromBaseY } from '../config';
import type { EnvironmentDefinition } from '../map/MapData';
import { gridToScreen } from '../map/IsoMath';
import {
	getEnvironmentGroundContactOffset,
	resolveEnvironmentPlacement
} from './EnvironmentPlacement';

function segment(
	kind: 'fence' | 'gate',
	orientation: 'x' | 'y'
): EnvironmentDefinition {
	return {
		id: `${kind}-${orientation}`,
		kind,
		orientation,
		grid: { x: 4, y: 3 },
		blockedFootprint: []
	};
}

describe('environment ground-contact placement', () => {
	const origin = { x: 500, y: 120 };
	const projectedPoint = gridToScreen({ x: 4, y: 3 }, origin);

	it.each(['fence', 'gate'] as const)(
		'anchors x-oriented %s segments at their screen-lowest contact',
		(kind) => {
			const definition = segment(kind, 'x');
			const placement = resolveEnvironmentPlacement(definition, origin);

			expect(getEnvironmentGroundContactOffset(definition)).toBe(38);
			expect(placement.basePoint).toEqual({
				x: projectedPoint.x,
				y: projectedPoint.y + 38
			});
			expect(placement.visualOffset).toEqual({ x: 0, y: -38 });
			expect(placement.depth).toBe(worldDepthFromBaseY(projectedPoint.y + 38));
		}
	);

	it.each(['fence', 'gate'] as const)(
		'keeps y-oriented %s segments on the projected lower contact',
		(kind) => {
			const definition = segment(kind, 'y');
			const placement = resolveEnvironmentPlacement(definition, origin);

			expect(getEnvironmentGroundContactOffset(definition)).toBe(0);
			expect(placement.basePoint).toEqual(projectedPoint);
			expect(placement.visualOffset).toEqual({ x: 0, y: 0 });
			expect(placement.depth).toBe(worldDepthFromBaseY(projectedPoint.y));
		}
	);
});
