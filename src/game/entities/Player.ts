import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { BuiltMap } from '../map/MapBuilder';
import { gridToScreen, screenToGrid, screenToNearestGrid, type GridPoint } from '../map/IsoMath';
import {
	CarryStackSystem,
} from '../systems/CarryStackSystem';
import {
	createMarkerInteractables,
	InteractionSystem,
	type DropZoneInteractable,
	type Interactable
} from '../systems/InteractionSystem';
import {
	findGridPath,
	MovementSystem,
	type MovementStep
} from '../systems/MovementSystem';
import type { ResourceType } from '../state/GameState';

export type PlayerState = 'idle' | 'walking' | 'carrying' | 'interacting';

export interface PlayerOptions {
	spawnGrid: GridPoint;
	onInteractionChange?: (interactable: Interactable | null) => void;
}

export class Player extends Phaser.GameObjects.Container {
	readonly movement = new MovementSystem();
	readonly interactions: InteractionSystem;
	readonly carry: CarryStackSystem;
	private animationStateValue: PlayerState = 'idle';
	private pointerTarget?: Phaser.GameObjects.Graphics;

	constructor(
		scene: Phaser.Scene,
		private readonly map: BuiltMap,
		options: PlayerOptions
	) {
		const spawn = gridToScreen(options.spawnGrid, map.origin);
		super(scene, spawn.x, spawn.y);
		scene.add.existing(this);

		const shadow = scene.add.ellipse(0, -2, 54, 20, 0x193b4c, 0.2);
		const sprite = scene.add.image(0, 0, 'player-blue')
			.setOrigin(0.5, 0.9)
			.setDisplaySize(70, 88);
		this.add([shadow, sprite]);

		this.carry = new CarryStackSystem(scene, this);
		this.interactions = new InteractionSystem(
			createMarkerInteractables(map.data.markers),
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

	moveToWorld(world: Phaser.Math.Vector2): boolean {
		const targetGrid = screenToNearestGrid(world, this.map.origin);
		const path = findGridPath(this.gridPosition, targetGrid, {
			width: this.map.data.width,
			height: this.map.data.height,
			blockedGridKeys: this.map.blockedGridKeys
		});

		if (path.length === 0) {
			return false;
		}

		const steps: MovementStep[] = path.map((grid) => ({
			grid,
			screen: gridToScreen(grid, this.map.origin)
		}));
		this.movement.setPath(steps);
		this.showPointerTarget(steps.at(-1)!.screen);
		this.setAnimationState('walking');
		return true;
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

		if (!this.movement.isMoving && this.animationStateValue === 'walking') {
			this.pointerTarget?.setVisible(false);
			this.setAnimationState(this.carry.total > 0 ? 'carrying' : 'idle');
		}
	}

	override destroy(fromScene?: boolean): void {
		this.pointerTarget?.destroy();
		super.destroy(fromScene);
	}

	private setAnimationState(state: PlayerState): void {
		this.animationStateValue = state;
	}

	private updateDepth(): void {
		this.setDepth(worldDepthFromBaseY(this.y));
	}

	private showPointerTarget(point: { x: number; y: number }): void {
		if (!this.pointerTarget) {
			this.pointerTarget = this.scene.add.graphics();
		}
		this.pointerTarget
			.clear()
			.lineStyle(3, 0xffffff, 0.9)
			.strokeCircle(0, 0, 13)
			.lineStyle(2, 0x4fc66b, 0.9)
			.strokeCircle(0, 0, 8)
			.setPosition(point.x, point.y)
			.setDepth(worldDepthFromBaseY(point.y - 1))
			.setVisible(true);
	}
}
