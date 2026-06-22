import { worldDepthFromBaseY } from '../config';
import type { EnvironmentDefinition } from '../map/MapData';
import { gridToScreen, type ScreenPoint } from '../map/IsoMath';

export interface EnvironmentPlacement {
	basePoint: ScreenPoint;
	visualOffset: ScreenPoint;
	depth: number;
}

export function getEnvironmentGroundContactOffset(
	definition: EnvironmentDefinition
): number {
	const isSegment = definition.kind === 'fence' || definition.kind === 'gate';
	return isSegment && definition.orientation === 'x' ? 38 : 0;
}

export function resolveEnvironmentPlacement(
	definition: EnvironmentDefinition,
	origin: ScreenPoint
): EnvironmentPlacement {
	const projectedPoint = gridToScreen(definition.grid, origin);
	const groundContactOffset = getEnvironmentGroundContactOffset(definition);
	const basePoint = {
		x: projectedPoint.x,
		y: projectedPoint.y + groundContactOffset
	};

	return {
		basePoint,
		visualOffset: {
			x: 0,
			y: groundContactOffset === 0 ? 0 : -groundContactOffset
		},
		depth: worldDepthFromBaseY(basePoint.y)
	};
}
