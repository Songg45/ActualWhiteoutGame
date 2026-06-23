import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import { gameEvents, type GameEventBus } from '../events/GameEvents';
import { gridToScreen, type GridPoint, type ScreenPoint } from '../map/IsoMath';
import { ResourceStore } from '../resources/ResourceStore';
import { normalizeResourceAmount } from '../resources/ResourceTypes';
import type { ResourceType } from '../state/GameState';

export interface ResourceStationDefinition {
	id: string;
	resource: Extract<ResourceType, 'wood' | 'meat'>;
	grid: GridPoint;
	initialStock: number;
	capacity: number;
	productionIntervalMs: number;
	maxCatchUpMs: number;
}

export const RESOURCE_STATION_DEFINITIONS: readonly ResourceStationDefinition[] = [
	{
		id: 'wood-station',
		resource: 'wood',
		grid: { x: 4.5, y: 7.5 },
		initialStock: 4,
		capacity: 12,
		productionIntervalMs: 1500,
		maxCatchUpMs: 30_000
	},
	{
		id: 'meat-station',
		resource: 'meat',
		grid: { x: 8.5, y: 4.5 },
		initialStock: 3,
		capacity: 10,
		productionIntervalMs: 2000,
		maxCatchUpMs: 30_000
	}
] as const;

export class StationProduction {
	readonly store: ResourceStore;
	private elapsedMs = 0;
	private paused = false;
	private destroyed = false;

	constructor(
		readonly definition: ResourceStationDefinition,
		private readonly onStockChange?: (value: number, delta: number) => void
	) {
		normalizeResourceAmount(definition.initialStock, 'Station initial stock');
		normalizeResourceAmount(definition.capacity, 'Station capacity');
		if (definition.initialStock > definition.capacity) {
			throw new RangeError('Station initial stock exceeds capacity.');
		}
		if (
			!Number.isFinite(definition.productionIntervalMs)
			|| definition.productionIntervalMs <= 0
			|| !Number.isFinite(definition.maxCatchUpMs)
			|| definition.maxCatchUpMs < 0
		) {
			throw new RangeError('Station timing values must be finite and valid.');
		}
		this.store = new ResourceStore(
			{ [definition.resource]: definition.initialStock },
			{ [definition.resource]: definition.capacity },
			(resource, value, delta) => {
				if (resource === definition.resource) {
					this.onStockChange?.(value, delta);
				}
			}
		);
	}

	get stock(): number {
		return this.store.get(this.definition.resource);
	}

	get capacity(): number {
		return this.definition.capacity;
	}

	get isReady(): boolean {
		return this.stock > 0;
	}

	setPaused(paused: boolean): void {
		this.paused = paused;
	}

	update(deltaMs: number): number {
		if (!Number.isFinite(deltaMs) || deltaMs < 0) {
			throw new RangeError('Station delta must be a non-negative finite number.');
		}
		if (this.destroyed || this.paused || deltaMs === 0) {
			return 0;
		}
		if (this.stock >= this.capacity) {
			this.elapsedMs = 0;
			return 0;
		}

		this.elapsedMs += Math.min(deltaMs, this.definition.maxCatchUpMs);
		const produced = Math.floor(this.elapsedMs / this.definition.productionIntervalMs);
		if (produced === 0) {
			return 0;
		}
		this.elapsedMs -= produced * this.definition.productionIntervalMs;
		const accepted = this.store.add(this.definition.resource, produced);
		if (this.stock >= this.capacity) {
			this.elapsedMs = 0;
		}
		return accepted;
	}

	take(requested: number): number {
		if (this.destroyed) {
			return 0;
		}
		return this.store.remove(this.definition.resource, requested);
	}

	returnStock(amount: number): number {
		if (this.destroyed) {
			return 0;
		}
		return this.store.add(this.definition.resource, amount);
	}

	destroy(): void {
		this.destroyed = true;
		this.elapsedMs = 0;
	}
}

export class ResourceStation extends Phaser.GameObjects.Container {
	readonly production: StationProduction;
	private readonly countText: Phaser.GameObjects.Text;
	private readonly readyBadge: Phaser.GameObjects.Text;

	constructor(
		scene: Phaser.Scene,
		readonly definition: ResourceStationDefinition,
		origin: ScreenPoint,
		private readonly events: GameEventBus = gameEvents
	) {
		const point = gridToScreen(definition.grid, origin);
		super(scene, point.x, point.y);
		scene.add.existing(this);
		this.setDepth(worldDepthFromBaseY(point.y + 1));

		this.countText = scene.add.text(0, -62, '', {
			color: '#17384c',
			backgroundColor: 'rgba(255,255,255,0.92)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px',
			fontStyle: 'bold',
			padding: { x: 6, y: 3 }
		}).setOrigin(0.5);
		this.readyBadge = scene.add.text(38, -63, '✓', {
			color: '#ffffff',
			backgroundColor: '#2f9e62',
			fontFamily: 'Arial, sans-serif',
			fontSize: '15px',
			fontStyle: 'bold',
			padding: { x: 5, y: 2 }
		}).setOrigin(0.5);
		this.add([this.countText, this.readyBadge]);

		this.production = new StationProduction(definition, (value, delta) => {
			this.refresh();
			this.events.emit('station:changed', {
				stationId: definition.id,
				resource: definition.resource,
				value,
				capacity: definition.capacity,
				delta,
				ready: value > 0
			});
		});
		this.refresh();
	}

	update(deltaMs: number): number {
		return this.production.update(deltaMs);
	}

	override destroy(fromScene?: boolean): void {
		this.production.destroy();
		super.destroy(fromScene);
	}

	private refresh(): void {
		this.countText.setText(`${this.production.stock}/${this.definition.capacity}`);
		this.readyBadge.setVisible(this.production.isReady);
	}
}
