import Phaser from 'phaser';
import { DEPTH_LAYERS } from '../config';
import { gridToScreen, type ScreenPoint } from '../map/IsoMath';
import type { CompletedBuilding } from '../buildings/BuildingTypes';
import type { ProgressionSystem } from './ProgressionSystem';
import type { DamageResult } from './CombatSystem';
import { distanceSquared } from './CombatSystem';

interface DefensePlacements {
	turrets: readonly CompletedBuilding[];
	traps: readonly CompletedBuilding[];
}

export interface DefenseProgressionPort {
	getCompletedDefensePlacements(): DefensePlacements;
}

export interface DefenseTarget extends ScreenPoint {
	readonly id: string;
	isDead(): boolean;
}

export interface DefenseCombatPort {
	getCombatTargets(): readonly DefenseTarget[];
	applyDamageToEnemy(enemyId: string, amount: number): DamageResult | undefined;
}

export interface DefenseSystemOptions {
	readonly turretRange?: number;
	readonly turretDamage?: number;
	readonly turretCooldownMs?: number;
	readonly trapRange?: number;
	readonly trapDamage?: number;
	readonly trapCooldownMs?: number;
}

interface DefenseRuntimeState {
	lastActivatedAt: number;
}

const DEFAULT_OPTIONS = {
	turretRange: 360,
	turretDamage: 12,
	turretCooldownMs: 900,
	trapRange: 115,
	trapDamage: 8,
	trapCooldownMs: 1200
} as const;

export class DefenseSystem {
	private readonly options: Required<DefenseSystemOptions>;
	private readonly turretStates = new Map<string, DefenseRuntimeState>();
	private readonly trapStates = new Map<string, DefenseRuntimeState>();
	private destroyed = false;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly progression: DefenseProgressionPort | ProgressionSystem,
		private readonly origin: ScreenPoint,
		private readonly combat: DefenseCombatPort,
		options: DefenseSystemOptions = {}
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
		this.validateOptions();
	}

	update(timeMs: number): void {
		if (this.destroyed) {
			return;
		}
		if (!Number.isFinite(timeMs)) {
			throw new RangeError('Defense update time must be finite.');
		}

		const placements = this.progression.getCompletedDefensePlacements();
		const targets = this.combat.getCombatTargets();
		for (const turret of placements.turrets) {
			this.updateTurret(turret, targets, timeMs);
		}
		for (const trap of placements.traps) {
			this.updateTrap(trap, targets, timeMs);
		}
	}

	destroy(): void {
		this.destroyed = true;
		this.turretStates.clear();
		this.trapStates.clear();
	}

	private updateTurret(
		turret: CompletedBuilding,
		targets: readonly DefenseTarget[],
		timeMs: number
	): void {
		const state = this.getState(this.turretStates, turret.padId);
		if (timeMs - state.lastActivatedAt < this.options.turretCooldownMs) {
			return;
		}
		const origin = gridToScreen(turret.grid, this.origin);
		const target = findNearestDefenseTarget(targets, origin, this.options.turretRange);
		if (!target) {
			return;
		}
		state.lastActivatedAt = timeMs;
		const result = this.combat.applyDamageToEnemy(target.id, this.options.turretDamage);
		if (result && result.applied > 0) {
			this.createBolt(origin, target);
			this.createImpact(target);
		}
	}

	private updateTrap(
		trap: CompletedBuilding,
		targets: readonly DefenseTarget[],
		timeMs: number
	): void {
		const state = this.getState(this.trapStates, trap.padId);
		if (timeMs - state.lastActivatedAt < this.options.trapCooldownMs) {
			return;
		}
		const origin = gridToScreen(trap.grid, this.origin);
		const victims = findTargetsInRange(targets, origin, this.options.trapRange);
		if (victims.length === 0) {
			return;
		}
		state.lastActivatedAt = timeMs;
		for (const victim of victims) {
			this.combat.applyDamageToEnemy(victim.id, this.options.trapDamage);
		}
		this.createTrapPulse(origin);
	}

	private getState(
		states: Map<string, DefenseRuntimeState>,
		padId: string
	): DefenseRuntimeState {
		const existing = states.get(padId);
		if (existing) {
			return existing;
		}
		const created = { lastActivatedAt: Number.NEGATIVE_INFINITY };
		states.set(padId, created);
		return created;
	}

	private createBolt(origin: ScreenPoint, target: ScreenPoint): void {
		const bolt = this.scene.add.graphics()
			.setDepth(DEPTH_LAYERS.effects);
		bolt.lineStyle(4, 0xf8fbff, 1)
			.lineBetween(origin.x, origin.y - 72, target.x, target.y - 42)
			.lineStyle(2, 0xffd166, 0.95)
			.lineBetween(origin.x, origin.y - 72, target.x, target.y - 42);
		this.scene.tweens.add({
			targets: bolt,
			alpha: 0,
			duration: 140,
			ease: 'Quad.easeOut',
			onComplete: () => bolt.destroy()
		});
	}

	private createImpact(target: ScreenPoint): void {
		const impact = this.scene.add.circle(target.x, target.y - 44, 5, 0xfff1a6, 0.95)
			.setDepth(DEPTH_LAYERS.effects);
		this.scene.tweens.add({
			targets: impact,
			alpha: 0,
			scaleX: 2.4,
			scaleY: 2.4,
			duration: 190,
			ease: 'Cubic.easeOut',
			onComplete: () => impact.destroy()
		});
	}

	private createTrapPulse(origin: ScreenPoint): void {
		const pulse = this.scene.add.graphics()
			.setDepth(DEPTH_LAYERS.effects);
		pulse.lineStyle(5, 0xffd166, 0.9)
			.strokeEllipse(origin.x, origin.y - 5, 118, 54)
			.lineStyle(4, 0x17384c, 0.42)
			.lineBetween(origin.x - 38, origin.y - 5, origin.x + 38, origin.y - 5)
			.lineBetween(origin.x, origin.y - 24, origin.x, origin.y + 14);
		this.scene.tweens.add({
			targets: pulse,
			alpha: 0,
			angle: 28,
			duration: 260,
			ease: 'Cubic.easeOut',
			onComplete: () => pulse.destroy()
		});
	}

	private validateOptions(): void {
		validatePositive(this.options.turretRange, 'Turret range');
		validatePositive(this.options.turretDamage, 'Turret damage');
		validatePositive(this.options.turretCooldownMs, 'Turret cooldown');
		validatePositive(this.options.trapRange, 'Trap range');
		validatePositive(this.options.trapDamage, 'Trap damage');
		validatePositive(this.options.trapCooldownMs, 'Trap cooldown');
	}
}

export function findNearestDefenseTarget<T extends DefenseTarget>(
	targets: readonly T[],
	origin: ScreenPoint,
	range: number
): T | undefined {
	validateNonNegative(range, 'Defense range');
	const maxDistanceSquared = range * range;
	let nearest: T | undefined;
	let nearestDistanceSquared = Number.POSITIVE_INFINITY;

	for (const target of targets) {
		if (target.isDead()) {
			continue;
		}
		const candidateDistanceSquared = distanceSquared(origin, target);
		const closer = candidateDistanceSquared < nearestDistanceSquared;
		const tiedAndEarlier = candidateDistanceSquared === nearestDistanceSquared
			&& nearest !== undefined
			&& target.id.localeCompare(nearest.id) < 0;
		if (
			candidateDistanceSquared <= maxDistanceSquared
			&& (closer || tiedAndEarlier)
		) {
			nearest = target;
			nearestDistanceSquared = candidateDistanceSquared;
		}
	}

	return nearest;
}

export function findTargetsInRange<T extends DefenseTarget>(
	targets: readonly T[],
	origin: ScreenPoint,
	range: number
): readonly T[] {
	validateNonNegative(range, 'Defense range');
	const maxDistanceSquared = range * range;
	return targets
		.filter((target) => !target.isDead() && distanceSquared(origin, target) <= maxDistanceSquared)
		.sort((a, b) => {
			const distanceDelta = distanceSquared(origin, a) - distanceSquared(origin, b);
			return distanceDelta === 0 ? a.id.localeCompare(b.id) : distanceDelta;
		});
}

function validatePositive(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${label} must be a positive finite number.`);
	}
}

function validateNonNegative(value: number, label: string): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(`${label} must be a non-negative finite number.`);
	}
}
