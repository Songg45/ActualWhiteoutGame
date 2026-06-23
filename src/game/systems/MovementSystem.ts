import type { GridPoint, ScreenPoint } from '../map/IsoMath';
import { gridKey } from '../map/MapData';

export interface MovementMap {
	width: number;
	height: number;
	blockedGridKeys: ReadonlySet<string>;
}

export interface MovementStep {
	grid: GridPoint;
	screen: ScreenPoint;
}

const CARDINAL_DIRECTIONS: readonly GridPoint[] = [
	{ x: 1, y: 0 },
	{ x: -1, y: 0 },
	{ x: 0, y: 1 },
	{ x: 0, y: -1 }
];

function manhattanDistance(left: GridPoint, right: GridPoint): number {
	return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function isSameCell(left: GridPoint, right: GridPoint): boolean {
	return left.x === right.x && left.y === right.y;
}

export function clampGridPoint(point: GridPoint, map: MovementMap): GridPoint {
	return {
		x: Math.max(0, Math.min(map.width - 1, Math.round(point.x))),
		y: Math.max(0, Math.min(map.height - 1, Math.round(point.y)))
	};
}

export function isWalkableGridPoint(point: GridPoint, map: MovementMap): boolean {
	return Number.isInteger(point.x)
		&& Number.isInteger(point.y)
		&& point.x >= 0
		&& point.x < map.width
		&& point.y >= 0
		&& point.y < map.height
		&& !map.blockedGridKeys.has(gridKey(point));
}

export function findNearestWalkableGridPoint(
	point: GridPoint,
	map: MovementMap
): GridPoint | null {
	const start = clampGridPoint(point, map);
	if (isWalkableGridPoint(start, map)) {
		return start;
	}

	const queue: GridPoint[] = [start];
	const visited = new Set<string>([gridKey(start)]);

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const direction of CARDINAL_DIRECTIONS) {
			const next = {
				x: current.x + direction.x,
				y: current.y + direction.y
			};
			const key = gridKey(next);

			if (
				visited.has(key)
				|| next.x < 0
				|| next.x >= map.width
				|| next.y < 0
				|| next.y >= map.height
			) {
				continue;
			}

			if (isWalkableGridPoint(next, map)) {
				return next;
			}

			visited.add(key);
			queue.push(next);
		}
	}

	return null;
}

export function findGridPath(
	startPoint: GridPoint,
	targetPoint: GridPoint,
	map: MovementMap
): GridPoint[] {
	const start = findNearestWalkableGridPoint(startPoint, map);
	const target = findNearestWalkableGridPoint(targetPoint, map);

	if (!start || !target) {
		return [];
	}
	if (isSameCell(start, target)) {
		return [start];
	}

	const open = new Map<string, GridPoint>([[gridKey(start), start]]);
	const cameFrom = new Map<string, string>();
	const points = new Map<string, GridPoint>([[gridKey(start), start]]);
	const gScore = new Map<string, number>([[gridKey(start), 0]]);
	const fScore = new Map<string, number>([
		[gridKey(start), manhattanDistance(start, target)]
	]);

	while (open.size > 0) {
		const currentEntry = [...open.entries()].reduce((best, entry) => {
			return (fScore.get(entry[0]) ?? Infinity) < (fScore.get(best[0]) ?? Infinity)
				? entry
				: best;
		});
		const [currentKey, current] = currentEntry;

		if (isSameCell(current, target)) {
			const path: GridPoint[] = [current];
			let pathKey = currentKey;
			while (cameFrom.has(pathKey)) {
				pathKey = cameFrom.get(pathKey)!;
				path.unshift(points.get(pathKey)!);
			}
			return path;
		}

		open.delete(currentKey);
		for (const direction of CARDINAL_DIRECTIONS) {
			const neighbor = {
				x: current.x + direction.x,
				y: current.y + direction.y
			};
			if (!isWalkableGridPoint(neighbor, map)) {
				continue;
			}

			const neighborKey = gridKey(neighbor);
			const tentativeScore = (gScore.get(currentKey) ?? Infinity) + 1;
			if (tentativeScore >= (gScore.get(neighborKey) ?? Infinity)) {
				continue;
			}

			cameFrom.set(neighborKey, currentKey);
			points.set(neighborKey, neighbor);
			gScore.set(neighborKey, tentativeScore);
			fScore.set(neighborKey, tentativeScore + manhattanDistance(neighbor, target));
			open.set(neighborKey, neighbor);
		}
	}

	return [];
}

export class MovementSystem {
	private path: MovementStep[] = [];
	private currentStep = 0;

	constructor(private readonly speed = 245) {}

	setPath(path: readonly MovementStep[]): void {
		this.path = [...path];
		this.currentStep = this.path.length > 1 ? 1 : 0;
	}

	clear(): void {
		this.path = [];
		this.currentStep = 0;
	}

	get isMoving(): boolean {
		return this.currentStep < this.path.length;
	}

	get targetGrid(): GridPoint | null {
		return this.path.at(-1)?.grid ?? null;
	}

	update(position: ScreenPoint, delta: number): ScreenPoint {
		const step = this.path[this.currentStep];
		if (!step) {
			return position;
		}

		const distance = Math.hypot(step.screen.x - position.x, step.screen.y - position.y);
		const travel = this.speed * delta / 1000;

		if (distance <= travel || distance < 0.5) {
			this.currentStep += 1;
			return { ...step.screen };
		}

		return {
			x: position.x + (step.screen.x - position.x) / distance * travel,
			y: position.y + (step.screen.y - position.y) / distance * travel
		};
	}
}
