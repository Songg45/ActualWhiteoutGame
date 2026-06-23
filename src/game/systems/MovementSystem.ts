import { ISO_GRID } from '../config';
import type { ScreenPoint } from '../map/IsoMath';
import { screenToGrid } from '../map/IsoMath';
import { gridKey } from '../map/MapData';

export interface MovementMap {
	width: number;
	height: number;
	origin: ScreenPoint;
	blockedGridKeys: ReadonlySet<string>;
}

export interface MovementDirection {
	x: number;
	y: number;
}

export interface MovementResult extends ScreenPoint {
	moved: boolean;
}

export const PLAYER_BODY_RADIUS = 16;
const MAX_SUBSTEP_DISTANCE = 8;
const GRID_RADIUS_PER_SCREEN_PIXEL = Math.hypot(
	1 / (ISO_GRID.halfTileWidth * 2),
	1 / (ISO_GRID.halfTileHeight * 2)
);

export function normalizeMovementDirection(
	direction: MovementDirection
): MovementDirection {
	const magnitude = Math.hypot(direction.x, direction.y);
	if (magnitude <= 1) {
		return { ...direction };
	}
	return {
		x: direction.x / magnitude,
		y: direction.y / magnitude
	};
}

export function combineMovementDirections(
	...directions: readonly MovementDirection[]
): MovementDirection {
	return normalizeMovementDirection(directions.reduce(
		(combined, direction) => ({
			x: combined.x + direction.x,
			y: combined.y + direction.y
		}),
		{ x: 0, y: 0 }
	));
}

export function keyboardMovementDirection(keys: {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
}): MovementDirection {
	return normalizeMovementDirection({
		x: Number(keys.right) - Number(keys.left),
		y: Number(keys.down) - Number(keys.up)
	});
}

export function canOccupyWorldPosition(
	position: ScreenPoint,
	map: MovementMap,
	bodyRadius = PLAYER_BODY_RADIUS
): boolean {
	const grid = screenToGrid(position, map.origin);
	const gridPadding = bodyRadius * GRID_RADIUS_PER_SCREEN_PIXEL;

	if (
		grid.x < -0.5 + gridPadding
		|| grid.x > map.width - 0.5 - gridPadding
		|| grid.y < -0.5 + gridPadding
		|| grid.y > map.height - 0.5 - gridPadding
	) {
		return false;
	}

	const minX = Math.max(0, Math.floor(grid.x - 0.5 - gridPadding));
	const maxX = Math.min(map.width - 1, Math.ceil(grid.x + 0.5 + gridPadding));
	const minY = Math.max(0, Math.floor(grid.y - 0.5 - gridPadding));
	const maxY = Math.min(map.height - 1, Math.ceil(grid.y + 0.5 + gridPadding));

	for (let y = minY; y <= maxY; y += 1) {
		for (let x = minX; x <= maxX; x += 1) {
			if (
				map.blockedGridKeys.has(gridKey({ x, y }))
				&& Math.abs(grid.x - x) < 0.5 + gridPadding
				&& Math.abs(grid.y - y) < 0.5 + gridPadding
			) {
				return false;
			}
		}
	}

	return true;
}

export function moveWithCollision(
	position: ScreenPoint,
	displacement: MovementDirection,
	map: MovementMap,
	bodyRadius = PLAYER_BODY_RADIUS
): MovementResult {
	const distance = Math.hypot(displacement.x, displacement.y);
	const substeps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP_DISTANCE));
	const stepX = displacement.x / substeps;
	const stepY = displacement.y / substeps;
	let x = position.x;
	let y = position.y;

	for (let step = 0; step < substeps; step += 1) {
		const horizontal = { x: x + stepX, y };
		if (canOccupyWorldPosition(horizontal, map, bodyRadius)) {
			x = horizontal.x;
		}

		const vertical = { x, y: y + stepY };
		if (canOccupyWorldPosition(vertical, map, bodyRadius)) {
			y = vertical.y;
		}
	}

	return {
		x,
		y,
		moved: Math.abs(x - position.x) > 0.001 || Math.abs(y - position.y) > 0.001
	};
}

export class MovementSystem {
	private direction: MovementDirection = { x: 0, y: 0 };

	constructor(
		private readonly map: MovementMap,
		private readonly speed = 245,
		private readonly bodyRadius = PLAYER_BODY_RADIUS
	) {}

	setDirection(direction: MovementDirection): void {
		this.direction = normalizeMovementDirection(direction);
	}

	clear(): void {
		this.direction = { x: 0, y: 0 };
	}

	get isMoving(): boolean {
		return this.direction.x !== 0 || this.direction.y !== 0;
	}

	update(position: ScreenPoint, delta: number): MovementResult {
		const seconds = Math.max(0, delta) / 1000;
		return moveWithCollision(
			position,
			{
				x: this.direction.x * this.speed * seconds,
				y: this.direction.y * this.speed * seconds
			},
			this.map,
			this.bodyRadius
		);
	}
}
