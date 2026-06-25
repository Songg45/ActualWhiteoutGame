import type Phaser from 'phaser';
import { gameEvents, type GameEventBus } from '../events/GameEvents';
import { gameState, type GameState } from '../state/GameState';
import { ProximityTransferClock, type EconomyFeedback, type EconomySystem } from './EconomySystem';
import type { Player } from '../entities/Player';
import type { BuiltMap } from '../map/MapBuilder';
import { createBuildPads } from '../buildings/BuildingFactory';
import type { BuildPad } from '../buildings/BuildPad';
import type { CompletedBuilding, BuildingId } from '../buildings/BuildingTypes';

export class ProgressionSystem {
	readonly buildPads: readonly BuildPad[];
	private readonly transferClock: ProximityTransferClock;
	private readonly completedBuildings = new Map<BuildingId, CompletedBuilding[]>();
	private destroyed = false;

	constructor(
		scene: Phaser.Scene,
		private readonly player: Player,
		map: BuiltMap,
		private readonly economy: EconomySystem,
		private readonly feedback: EconomyFeedback,
		private readonly state: GameState = gameState,
		private readonly events: GameEventBus = gameEvents,
		transferIntervalMs = 350
	) {
		this.transferClock = new ProximityTransferClock(transferIntervalMs);
		this.buildPads = createBuildPads(scene, map, events);
		this.state.unlockBuilding('furnace');
	}

	update(deltaMs: number): void {
		if (this.destroyed) {
			return;
		}
		for (const pad of this.buildPads) {
			const completed = pad.update(deltaMs);
			if (completed) {
				this.completeBuilding(completed);
			}
		}
		const current = this.player.interactions.current;
		const activePad = current?.kind === 'build-pad'
			? this.buildPads.find((pad) => pad.definition.padId === current.id)
			: undefined;
		if (!activePad) {
			this.transferClock.update(null, deltaMs, () => false);
			return;
		}
		const changed = this.transferClock.update(
			activePad.definition.padId,
			deltaMs,
			(id) => this.fundPad(id)
		);
		this.player.setInteracting(changed);
	}

	getCompletedBuildings(id?: BuildingId): readonly CompletedBuilding[] {
		if (id) {
			return this.completedBuildings.get(id) ?? [];
		}
		return [...this.completedBuildings.values()].flat();
	}

	getCompletedDefensePlacements(): {
		turrets: readonly CompletedBuilding[];
		traps: readonly CompletedBuilding[];
	} {
		return {
			turrets: this.getCompletedBuildings('turret'),
			traps: this.getCompletedBuildings('trap')
		};
	}

	isWorkerHutUnlocked(): boolean {
		return this.state.snapshot.unlockedBuildings.includes('worker-hut');
	}

	destroy(): void {
		if (this.destroyed) {
			return;
		}
		this.destroyed = true;
		this.transferClock.destroy();
		for (const pad of this.buildPads) {
			pad.destroy();
		}
		this.completedBuildings.clear();
	}

	private fundPad(padId: string): boolean {
		const pad = this.buildPads.find((candidate) => candidate.definition.padId === padId);
		if (!pad) {
			return false;
		}
		const fromCarry = pad.fundFromCarry(this.player, 3);
		const carryTotal = fromCarry.accepted.wood + fromCarry.accepted.meat + fromCarry.accepted.money;
		if (carryTotal > 0) {
			this.feedback.atWorld(pad.x, pad.y - 70, `+${carryTotal}`, '#315565');
			return true;
		}
		const fromStorage = pad.fundFromStorage((cost) => this.economy.spend(cost));
		const storageTotal = fromStorage.accepted.wood
			+ fromStorage.accepted.meat
			+ fromStorage.accepted.money;
		if (storageTotal > 0) {
			this.feedback.atWorld(pad.x, pad.y - 70, 'Funded', '#315565');
			return true;
		}
		return false;
	}

	private completeBuilding(completed: CompletedBuilding): void {
		const existing = this.completedBuildings.get(completed.id) ?? [];
		if (existing.some((candidate) => candidate.padId === completed.padId)) {
			return;
		}
		this.completedBuildings.set(completed.id, [...existing, completed]);
		this.state.unlockBuilding(completed.id);
		const pad = this.buildPads.find((candidate) => candidate.definition.padId === completed.padId);
		for (const unlocked of pad?.definition.unlocksAfterComplete ?? []) {
			this.state.unlockBuilding(unlocked);
			for (const target of this.buildPads) {
				if (target.definition.id === unlocked) {
					target.setLocked(false);
				}
			}
		}
		if (pad) {
			this.feedback.atWorld(pad.x, pad.y - 84, `${completed.label} complete`, '#23814d');
		}
	}
}
