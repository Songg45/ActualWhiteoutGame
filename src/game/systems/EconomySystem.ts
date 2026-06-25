import type Phaser from 'phaser';
import { gameEvents, type GameEventBus } from '../events/GameEvents';
import type { Player } from '../entities/Player';
import type { BuiltMap } from '../map/MapBuilder';
import {
	DROP_ZONE_DEFINITIONS,
	DropZone,
	type DropTransferResult
} from '../objects/DropZone';
import {
	RESOURCE_STATION_DEFINITIONS,
	ResourceStation
} from '../objects/ResourceStation';
import {
	normalizeResourceCost,
	type ResourceCost
} from '../resources/ResourceTypes';
import { gameState, type GameState, type ResourceBalances } from '../state/GameState';

export interface SpendResult {
	ok: boolean;
	cost: Readonly<ResourceBalances>;
	missing: Readonly<ResourceBalances>;
	remaining: Readonly<ResourceBalances>;
}

export function canAfford(
	balances: Readonly<ResourceBalances>,
	cost: ResourceCost
): boolean {
	const normalized = normalizeResourceCost(cost);
	return Object.entries(normalized).every(
		([resource, amount]) => balances[resource as keyof ResourceBalances] >= amount
	);
}

export function spendResources(state: GameState, cost: ResourceCost): SpendResult {
	const normalized = normalizeResourceCost(cost);
	const before = state.snapshot.resources;
	const missing: ResourceBalances = {
		wood: Math.max(0, normalized.wood - before.wood),
		meat: Math.max(0, normalized.meat - before.meat),
		money: Math.max(0, normalized.money - before.money)
	};
	if (missing.wood || missing.meat || missing.money) {
		return { ok: false, cost: normalized, missing, remaining: before };
	}

	for (const resource of ['wood', 'meat', 'money'] as const) {
		state.changeResource(resource, -normalized[resource]);
	}
	return {
		ok: true,
		cost: normalized,
		missing,
		remaining: state.snapshot.resources
	};
}

export interface EconomyFeedback {
	atPlayer(text: string, color: string): void;
	atWorld(x: number, y: number, text: string, color: string): void;
}

export class ProximityTransferClock {
	private activeId: string | null = null;
	private elapsedMs = 0;
	private destroyed = false;

	constructor(readonly intervalMs = 350) {
		if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
			throw new RangeError('Transfer interval must be a positive finite number.');
		}
	}

	update(
		activeId: string | null,
		deltaMs: number,
		transfer: (id: string) => boolean
	): boolean {
		if (!Number.isFinite(deltaMs) || deltaMs < 0) {
			throw new RangeError('Transfer delta must be a non-negative finite number.');
		}
		if (this.destroyed) {
			return false;
		}
		if (activeId !== this.activeId) {
			this.activeId = activeId;
			this.elapsedMs = 0;
			return activeId ? transfer(activeId) : false;
		}
		if (!activeId) {
			return false;
		}

		this.elapsedMs += deltaMs;
		const ticks = Math.floor(this.elapsedMs / this.intervalMs);
		this.elapsedMs -= ticks * this.intervalMs;
		let changed = false;
		for (let tick = 0; tick < ticks; tick += 1) {
			changed = transfer(activeId) || changed;
		}
		return changed;
	}

	destroy(): void {
		this.destroyed = true;
		this.activeId = null;
		this.elapsedMs = 0;
	}
}

export class EconomySystem {
	readonly stations: readonly ResourceStation[];
	readonly dropZones: readonly DropZone[];
	private readonly transferClock: ProximityTransferClock;
	private destroyed = false;

	constructor(
		scene: Phaser.Scene,
		private readonly player: Player,
		map: BuiltMap,
		private readonly feedback: EconomyFeedback,
		private readonly state: GameState = gameState,
		private readonly events: GameEventBus = gameEvents,
		transferIntervalMs = 350
	) {
		this.transferClock = new ProximityTransferClock(transferIntervalMs);
		const stationDefinitions = map.runtime?.getResourceStations() ?? RESOURCE_STATION_DEFINITIONS;
		const dropZoneDefinitions = map.runtime?.getDropZones() ?? DROP_ZONE_DEFINITIONS;
		this.stations = stationDefinitions.map(
			(definition) => new ResourceStation(scene, definition, map.origin, events)
		);
		this.dropZones = dropZoneDefinitions.map(
			(definition) => new DropZone(scene, definition, map.origin, state, events)
		);
		player.setDropZones(this.dropZones.map(({ interactable }) => interactable));
	}

	update(deltaMs: number): void {
		if (this.destroyed) {
			return;
		}
		for (const station of this.stations) {
			station.update(deltaMs);
		}

		const current = this.player.interactions.current;
		const actionable = current?.kind === 'resource-station' || current?.kind === 'drop-zone'
			? current
			: null;
		if (!actionable) {
			this.transferClock.update(null, deltaMs, () => false);
			this.player.setInteracting(false);
			return;
		}

		const changed = this.transferClock.update(
			actionable.id,
			deltaMs,
			(id) => this.transfer(id)
		);
		this.player.setInteracting(changed);
	}

	canAfford(cost: ResourceCost): boolean {
		return canAfford(this.state.snapshot.resources, cost);
	}

	spend(cost: ResourceCost): SpendResult {
		return spendResources(this.state, cost);
	}

	destroy(): void {
		if (this.destroyed) {
			return;
		}
		this.destroyed = true;
		this.transferClock.destroy();
		this.player.setDropZones([]);
		for (const station of this.stations) {
			station.destroy();
		}
		for (const dropZone of this.dropZones) {
			dropZone.destroy();
		}
	}

	private transfer(id: string): boolean {
		const station = this.stations.find(({ definition }) => definition.id === id);
		if (station) {
			const reserved = station.production.take(1);
			if (reserved === 0) {
				return false;
			}
			const accepted = this.player.addCarry(station.definition.resource, reserved);
			const rejected = reserved - accepted;
			if (rejected > 0) {
				station.production.returnStock(rejected);
			}
			if (accepted === 0) {
				return false;
			}
			this.events.emit('economy:transfer', {
				source: station.definition.id,
				destination: 'carry',
				resource: station.definition.resource,
				amount: accepted
			});
			this.feedback.atPlayer(
				`+${accepted} ${station.definition.resource}`,
				station.definition.resource === 'wood' ? '#9a5a25' : '#b7384d'
			);
			return true;
		}

		const dropZone = this.dropZones.find(({ definition }) => definition.id === id);
		if (!dropZone) {
			return false;
		}
		const result = dropZone.transfer(this.player, this.state, this.events);
		return this.showDropFeedback(dropZone, result);
	}

	private showDropFeedback(dropZone: DropZone, result: DropTransferResult): boolean {
		const deposited = result.removed.wood + result.removed.meat;
		const money = result.credited.money;
		if (deposited === 0) {
			return false;
		}
		const text = money > 0 ? `+$${money}` : `Stored ${deposited}`;
		this.feedback.atWorld(
			dropZone.x,
			dropZone.y - 42,
			text,
			money > 0 ? '#22824d' : '#356d88'
		);
		return true;
	}
}
