import Phaser from 'phaser';
import { worldDepthFromBaseY } from '../config';
import type { GridPoint, ScreenPoint } from '../map/IsoMath';
import { gridToScreen } from '../map/IsoMath';
import type { DamageSource, Damageable } from '../combat/CombatTypes';
import { EnemyModel, type EnemyDefinition } from '../combat/EnemyModel';

export { EnemyModel, type EnemyDefinition, type EnemyKind, type EnemyLifecycleState } from '../combat/EnemyModel';

export interface EnemyOptions {
	definition: EnemyDefinition;
	spawnGrid: GridPoint;
	origin: ScreenPoint;
	textureKey?: string;
}

export class Enemy extends Phaser.GameObjects.Container implements Damageable {
	readonly model: EnemyModel;
	private readonly healthFill: Phaser.GameObjects.Rectangle;
	private readonly healthBack: Phaser.GameObjects.Rectangle;

	constructor(
		scene: Phaser.Scene,
		options: EnemyOptions
	) {
		const spawn = gridToScreen(options.spawnGrid, options.origin);
		super(scene, spawn.x, spawn.y);
		this.model = new EnemyModel(options.definition);
		scene.add.existing(this);

		const shadow = scene.add.ellipse(0, -2, 78, 28, 0x183445, 0.22);
		const visual = options.textureKey
			? scene.add.image(0, 0, options.textureKey)
				.setOrigin(0.5, 0.88)
				.setDisplaySize(92, 76)
			: scene.add.ellipse(0, -38, 88, 58, 0x77828d, 1)
				.setStrokeStyle(4, 0xf2fbff, 0.8);
		this.healthBack = scene.add.rectangle(0, -86, 58, 7, 0x142f3d, 0.8)
			.setOrigin(0.5);
		this.healthFill = scene.add.rectangle(-29, -86, 58, 7, 0x53c874, 1)
			.setOrigin(0, 0.5);

		this.add([shadow, visual, this.healthBack, this.healthFill]);
		this.updateDepth();
	}

	get hp(): number {
		return this.model.hp;
	}

	get maxHp(): number {
		return this.model.maxHp;
	}

	takeDamage(amount: number, source?: DamageSource): number {
		const applied = this.model.takeDamage(amount, source);
		this.refreshHealthBar();
		if (this.model.isDead()) {
			this.setAlpha(0.55);
			this.setActive(false);
		}
		return applied;
	}

	isDead(): boolean {
		return this.model.isDead();
	}

	setBasePosition(point: ScreenPoint): void {
		this.setPosition(point.x, point.y);
		this.updateDepth();
	}

	override destroy(fromScene?: boolean): void {
		this.model.markDestroyed();
		super.destroy(fromScene);
	}

	private refreshHealthBar(): void {
		const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
		this.healthFill.setDisplaySize(58 * ratio, 7);
		this.healthBack.setVisible(ratio < 1);
		this.healthFill.setVisible(ratio < 1);
	}

	private updateDepth(): void {
		this.setDepth(worldDepthFromBaseY(this.y));
	}
}
