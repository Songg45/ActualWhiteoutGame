import type { GridPoint, ScreenPoint } from '../map/IsoMath';
import { gridToScreen } from '../map/IsoMath';

export interface EnemyPathState {
	readonly position: ScreenPoint;
	readonly targetIndex: number;
	readonly complete: boolean;
}

export interface EnemyRuntimeState {
	readonly reachedObjective: boolean;
	isDead(): boolean;
}

function cloneScreen(point: ScreenPoint): ScreenPoint {
	return { x: point.x, y: point.y };
}

function requireFiniteSpeed(speed: number): void {
	if (!Number.isFinite(speed) || speed < 0) {
		throw new RangeError('Enemy movement speed must be a non-negative finite number.');
	}
}

export function createEnemyPathState(
	path: readonly GridPoint[],
	origin: ScreenPoint
): EnemyPathState {
	if (path.length === 0) {
		throw new Error('Enemy path must include at least one point.');
	}
	return {
		position: gridToScreen(path[0], origin),
		targetIndex: path.length > 1 ? 1 : 0,
		complete: path.length === 1
	};
}

export function advanceEnemyPath(
	state: EnemyPathState,
	path: readonly GridPoint[],
	origin: ScreenPoint,
	speed: number,
	deltaMs: number
): EnemyPathState {
	requireFiniteSpeed(speed);
	if (state.complete || path.length === 0) {
		return {
			position: cloneScreen(state.position),
			targetIndex: state.targetIndex,
			complete: true
		};
	}

	let remainingDistance = speed * Math.max(0, deltaMs) / 1000;
	let position = cloneScreen(state.position);
	let targetIndex = state.targetIndex;

	while (remainingDistance > 0 && targetIndex < path.length) {
		const target = gridToScreen(path[targetIndex], origin);
		const dx = target.x - position.x;
		const dy = target.y - position.y;
		const distance = Math.hypot(dx, dy);

		if (distance <= remainingDistance || distance <= 0.001) {
			position = target;
			remainingDistance -= distance;
			targetIndex += 1;
			continue;
		}

		position = {
			x: position.x + dx / distance * remainingDistance,
			y: position.y + dy / distance * remainingDistance
		};
		remainingDistance = 0;
	}

	return {
		position,
		targetIndex: Math.min(targetIndex, path.length - 1),
		complete: targetIndex >= path.length
	};
}

export function pruneInactiveEnemies<T extends EnemyRuntimeState>(
	enemies: readonly T[]
): T[] {
	return enemies.filter((enemy) => !enemy.isDead() && !enemy.reachedObjective);
}
