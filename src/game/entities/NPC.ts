import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { ScreenPoint } from '../map/IsoMath';

export type NPCState = 'walking' | 'waiting' | 'served' | 'leaving';

export interface NPCOptions {
	readonly id: string;
	readonly spawn: ScreenPoint;
	readonly speed?: number;
}

export class NPC extends Phaser.GameObjects.Container {
	readonly id: string;
	private readonly speed: number;
	private readonly coat: Phaser.GameObjects.Ellipse;
	private target?: ScreenPoint;
	private stateValue: NPCState = 'walking';

	constructor(scene: Phaser.Scene, options: NPCOptions) {
		super(scene, options.spawn.x, options.spawn.y);
		this.id = options.id;
		this.speed = options.speed ?? 72;
		scene.add.existing(this);

		const shadow = scene.add.ellipse(0, -1, 42, 16, 0x17384c, 0.18);
		this.coat = scene.add.ellipse(0, -38, 34, 52, 0x3e8dcc, 1)
			.setStrokeStyle(4, 0xf3fbff, 0.86);
		const hood = scene.add.circle(0, -66, 14, 0xf1d0b2, 1)
			.setStrokeStyle(3, 0x23638e, 0.9);
		const hat = scene.add.rectangle(0, -78, 30, 9, 0x23638e, 1)
			.setOrigin(0.5);
		const scarf = scene.add.rectangle(0, -50, 28, 7, 0xffd166, 1)
			.setOrigin(0.5);
		this.add([shadow, this.coat, hood, hat, scarf]);
		this.updateDepth();
	}

	get npcState(): NPCState {
		return this.stateValue;
	}

	setTarget(target: ScreenPoint, state: NPCState = 'walking'): void {
		this.target = { ...target };
		this.setNpcState(state);
	}

	setNpcState(state: NPCState): void {
		this.stateValue = state;
		if (state === 'waiting') {
			this.coat.setFillStyle(0x3e8dcc, 1);
		} else if (state === 'served') {
			this.coat.setFillStyle(0x35a867, 1);
		} else {
			this.coat.setFillStyle(0x4f9ed5, 1);
		}
	}

	update(_time: number, deltaMs: number): void {
		if (!this.target) {
			return;
		}
		const dx = this.target.x - this.x;
		const dy = this.target.y - this.y;
		const distance = Math.hypot(dx, dy);
		const step = this.speed * (deltaMs / 1000);
		if (distance <= step || distance <= 0.5) {
			this.setPosition(this.target.x, this.target.y);
			this.target = undefined;
			if (this.stateValue === 'walking') {
				this.setNpcState('waiting');
			}
			this.updateDepth();
			return;
		}
		this.setPosition(
			this.x + (dx / distance) * step,
			this.y + (dy / distance) * step
		);
		this.updateDepth();
	}

	private updateDepth(): void {
		this.setDepth(worldDepthFromBaseY(this.y));
	}
}
