import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { BuiltMap } from '../map/MapBuilder';
import { gridToScreen, screenToGrid, type GridPoint } from '../map/IsoMath';
import {
	CarryStackSystem,
	type CarryCounts,
} from '../systems/CarryStackSystem';
import {
	createMarkerInteractables,
	createRuntimeInteractables,
	InteractionSystem,
	type DropZoneInteractable,
	type Interactable
} from '../systems/InteractionSystem';
import { MovementSystem, type MovementDirection } from '../systems/MovementSystem';
import type { ResourceType } from '../state/GameState';

export type PlayerState = 'idle' | 'walking' | 'carrying' | 'interacting';

export interface PlayerOptions {
	spawnGrid: GridPoint;
	onInteractionChange?: (interactable: Interactable | null) => void;
}

export class Player extends Phaser.GameObjects.Container {
	readonly movement: MovementSystem;
	readonly interactions: InteractionSystem;
	readonly carry: CarryStackSystem;
	private animationStateValue: PlayerState = 'idle';

	constructor(
		scene: Phaser.Scene,
		private readonly map: BuiltMap,
		options: PlayerOptions
	) {
		const spawn = gridToScreen(options.spawnGrid, map.origin);
		super(scene, spawn.x, spawn.y);
		scene.add.existing(this);
		this.movement = new MovementSystem({
			width: map.data.width,
			height: map.data.height,
			origin: map.origin,
			blockedGridKeys: map.blockedGridKeys
		});

		const shadow = scene.add.ellipse(0, -2, 54, 20, 0x193b4c, 0.2);
		const sprite = scene.add.image(0, 0, 'player-blue')
			.setOrigin(0.5, 0.9)
			.setDisplaySize(70, 88);
		this.add([shadow, sprite]);

		this.carry = new CarryStackSystem(scene, this);
		this.interactions = new InteractionSystem(
			map.runtime
				? createRuntimeInteractables(map.runtime)
				: createMarkerInteractables(map.data.markers),
			({ current }) => options.onInteractionChange?.(current)
		);
		this.updateDepth();
	}

	get animationState(): PlayerState {
		return this.animationStateValue;
	}

	get gridPosition(): GridPoint {
		return screenToGrid({ x: this.x, y: this.y }, this.map.origin);
	}

	get carrySnapshot(): Readonly<CarryCounts> {
		return this.carry.snapshot;
	}

	setMovementDirection(direction: MovementDirection): void {
		this.movement.setDirection(direction);
	}

	setInteracting(active: boolean): void {
		this.setAnimationState(active ? 'interacting' : this.carry.total > 0 ? 'carrying' : 'idle');
	}

	setDropZones(dropZones: readonly DropZoneInteractable[]): void {
		this.interactions.setDropZones(dropZones);
	}

	addCarry(type: ResourceType, amount: number): number {
		const accepted = this.carry.add(type, amount);
		if (!this.movement.isMoving && accepted > 0) {
			this.setAnimationState('carrying');
		}
		return accepted;
	}

	removeCarry(type: ResourceType, amount: number): number {
		const removed = this.carry.remove(type, amount);
		if (!this.movement.isMoving && this.carry.total === 0) {
			this.setAnimationState('idle');
		}
		return removed;
	}

	clearCarry(): void {
		this.carry.clear();
		if (!this.movement.isMoving) {
			this.setAnimationState('idle');
		}
	}

	update(_time: number, delta: number): void {
		const next = this.movement.update({ x: this.x, y: this.y }, delta);
		this.setPosition(next.x, next.y);
		this.updateDepth();
		this.interactions.update(this.gridPosition);

		if (next.moved && this.animationStateValue !== 'interacting') {
			this.setAnimationState('walking');
		} else if (!this.movement.isMoving && this.animationStateValue === 'walking') {
			this.setAnimationState(this.carry.total > 0 ? 'carrying' : 'idle');
		}
	}

	override destroy(fromScene?: boolean): void {
		this.movement.clear();
		super.destroy(fromScene);
	}

	private setAnimationState(state: PlayerState): void {
		this.animationStateValue = state;
	}

	private updateDepth(): void {
		this.setDepth(worldDepthFromBaseY(this.y));
	}

}
