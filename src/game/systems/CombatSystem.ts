import type { DamageSource, Damageable } from '../combat/CombatTypes';
import type { ScreenPoint } from '../map/IsoMath';

export interface CombatTarget extends Damageable, ScreenPoint {
	readonly id: string;
}

export interface DamageResult {
	readonly applied: number;
	readonly killed: boolean;
}

export function distanceSquared(a: ScreenPoint, b: ScreenPoint): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}

export function findNearestTarget<T extends CombatTarget>(
	targets: readonly T[],
	origin: ScreenPoint,
	range: number
): T | undefined {
	if (!Number.isFinite(range) || range < 0) {
		throw new RangeError('Combat range must be a non-negative finite number.');
	}
	const maxDistanceSquared = range * range;
	let nearest: T | undefined;
	let nearestDistanceSquared = Number.POSITIVE_INFINITY;

	for (const target of targets) {
		if (target.isDead()) {
			continue;
		}
		const candidateDistanceSquared = distanceSquared(origin, target);
		if (
			candidateDistanceSquared <= maxDistanceSquared
			&& candidateDistanceSquared < nearestDistanceSquared
		) {
			nearest = target;
			nearestDistanceSquared = candidateDistanceSquared;
		}
	}

	return nearest;
}

export function applyCombatDamage(
	target: Damageable,
	amount: number,
	source: DamageSource
): DamageResult {
	const wasDead = target.isDead();
	const applied = target.takeDamage(amount, source);
	return {
		applied,
		killed: !wasDead && target.isDead()
	};
}
