import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { GameEventBus } from '../events/GameEvents';
import { gridToScreen, type GridPoint, type ScreenPoint } from '../map/IsoMath';
import type { ResourceAmounts } from '../resources/ResourceTypes';
import { normalizeResourceAmount } from '../resources/ResourceTypes';
import type { GameState, ResourceType } from '../state/GameState';
import type { DropZoneInteractable } from '../systems/InteractionSystem';

export type DropZoneMode = 'deposit' | 'convert';

export interface DropZoneDefinition {
	id: string;
	label: string;
	mode: DropZoneMode;
	grid: GridPoint;
	accepted: readonly Extract<ResourceType, 'wood' | 'meat'>[];
	maxUnitsPerTick: number;
	conversionRates?: Readonly<ResourceAmounts>;
}

export const DROP_ZONE_DEFINITIONS: readonly DropZoneDefinition[] = [
	{
		id: 'camp-storage',
		label: 'Camp Storage',
		mode: 'deposit',
		grid: { x: 6.2, y: 8.8 },
		accepted: ['wood', 'meat'],
		maxUnitsPerTick: 3
	},
	{
		id: 'reward-exchange',
		label: 'Supply Exchange',
		mode: 'convert',
		grid: { x: 9.2, y: 7.2 },
		accepted: ['wood', 'meat'],
		maxUnitsPerTick: 2,
		conversionRates: { wood: 2, meat: 3 }
	}
] as const;

export interface CarryPort {
	readonly carrySnapshot: Readonly<Record<ResourceType, number>>;
	removeCarry(type: ResourceType, amount: number): number;
	addCarry(type: ResourceType, amount: number): number;
}

export interface DropTransferResult {
	zoneId: string;
	removed: Readonly<Record<ResourceType, number>>;
	credited: Readonly<Record<ResourceType, number>>;
}

function emptyCounts(): Record<ResourceType, number> {
	return { wood: 0, meat: 0, money: 0 };
}

export function transferAtDropZone(
	definition: DropZoneDefinition,
	player: CarryPort,
	state: GameState,
	events: GameEventBus
): DropTransferResult {
	const removed = emptyCounts();
	const credited = emptyCounts();
	let remaining = normalizeResourceAmount(
		definition.maxUnitsPerTick,
		'Drop-zone transfer limit'
	);
	const conversionRates = new Map<ResourceType, number>();
	for (const resource of definition.accepted) {
		conversionRates.set(
			resource,
			definition.mode === 'convert'
				? normalizeResourceAmount(
					definition.conversionRates?.[resource] ?? 0,
					`${resource} conversion rate`
				)
				: 1
		);
	}

	for (const resource of definition.accepted) {
		if (remaining <= 0) {
			break;
		}
		const requested = Math.min(player.carrySnapshot[resource], remaining);
		const taken = player.removeCarry(resource, requested);
		if (taken === 0) {
			continue;
		}

		const destination: ResourceType = definition.mode === 'convert'
			? 'money'
			: resource;
		const rate = conversionRates.get(resource) ?? 0;
		const value = taken * rate;
		const applied = state.changeResource(destination, value);
		if (applied !== value) {
			player.addCarry(resource, taken);
			continue;
		}

		removed[resource] += taken;
		credited[destination] += value;
		remaining -= taken;
		events.emit('economy:transfer', {
			source: 'carry',
			destination: definition.id,
			resource,
			amount: taken,
			reward: destination === 'money' ? value : undefined
		});
	}

	return { zoneId: definition.id, removed, credited };
}

export class DropZone extends Phaser.GameObjects.Container {
	readonly interactable: DropZoneInteractable;
	private readonly balanceText: Phaser.GameObjects.Text;
	private unsubscribe?: () => void;

	constructor(
		scene: Phaser.Scene,
		readonly definition: DropZoneDefinition,
		origin: ScreenPoint,
		state: GameState,
		events: GameEventBus
	) {
		const point = gridToScreen(definition.grid, origin);
		super(scene, point.x, point.y);
		scene.add.existing(this);
		this.setDepth(worldDepthFromBaseY(point.y));
		this.interactable = {
			id: definition.id,
			kind: 'drop-zone',
			grid: definition.grid,
			radius: 1.25
		};

		const color = definition.mode === 'deposit' ? 0x4e8aa8 : 0x35a867;
		const graphics = scene.add.graphics()
			.fillStyle(color, 0.22)
			.fillEllipse(0, 2, 112, 50)
			.lineStyle(4, color, 0.9)
			.strokeEllipse(0, 2, 112, 50);
		const label = scene.add.text(0, 24, definition.label, {
			color: '#17384c',
			backgroundColor: 'rgba(255,255,255,0.9)',
			fontFamily: 'Arial, sans-serif',
			fontSize: '12px',
			fontStyle: 'bold',
			padding: { x: 6, y: 3 }
		}).setOrigin(0.5, 0);
		this.balanceText = scene.add.text(0, -18, '', {
			color: '#ffffff',
			backgroundColor: definition.mode === 'deposit' ? '#356d88' : '#23814d',
			fontFamily: 'Arial, sans-serif',
			fontSize: '12px',
			fontStyle: 'bold',
			padding: { x: 5, y: 2 }
		}).setOrigin(0.5);
		this.add([graphics, label, this.balanceText]);
		this.refresh(state);
		this.unsubscribe = events.on('resource:changed', () => this.refresh(state));
	}

	transfer(
		player: CarryPort,
		state: GameState,
		events: GameEventBus
	): DropTransferResult {
		return transferAtDropZone(this.definition, player, state, events);
	}

	override destroy(fromScene?: boolean): void {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
		super.destroy(fromScene);
	}

	private refresh(state: GameState): void {
		const resources = state.snapshot.resources;
		this.balanceText.setText(
			this.definition.mode === 'deposit'
				? `W ${resources.wood}  M ${resources.meat}`
				: `$ ${resources.money}`
		);
	}
}
