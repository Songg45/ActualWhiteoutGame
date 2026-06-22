import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, SCENE_KEYS, WORLD_BOUNDS } from '../config';
import { MapBuilder, type BuiltMap } from '../map/MapBuilder';
import { createMapData } from '../map/MapData';

export class GameScene extends Phaser.Scene {
	private backdrop?: Phaser.GameObjects.Graphics;
	private builtMap?: BuiltMap;

	constructor() {
		super(SCENE_KEYS.game);
	}

	create(): void {
		this.cameras.main.setBounds(
			WORLD_BOUNDS.x,
			WORLD_BOUNDS.y,
			WORLD_BOUNDS.width,
			WORLD_BOUNDS.height
		);
		this.cameras.main.setBackgroundColor(GAME_COLORS.snowShadow);
		this.createWorld();
		this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutWorld, this);
			this.builtMap?.destroy();
		});
	}

	private createWorld(): void {
		this.backdrop = this.add.graphics().setDepth(DEPTH_LAYERS.ground);
		this.backdrop
			.fillStyle(GAME_COLORS.snowShadow)
			.fillRect(WORLD_BOUNDS.x, WORLD_BOUNDS.y, WORLD_BOUNDS.width, WORLD_BOUNDS.height)
			.fillStyle(0xffffff, 0.2)
			.fillEllipse(WORLD_BOUNDS.width / 2, 530, 1680, 900);

		this.builtMap = new MapBuilder(
			this,
			createMapData(),
			{ x: WORLD_BOUNDS.width / 2, y: 130 }
		).build();
		this.layoutWorld();
	}

	private layoutWorld(): void {
		if (!this.builtMap) {
			return;
		}

		const width = this.scale.width;
		const height = this.scale.height;
		const portrait = height > width;
		const targetWidth = portrait ? 900 : this.builtMap.bounds.width;
		const targetHeight = portrait ? 1120 : this.builtMap.bounds.height;
		const zoom = Phaser.Math.Clamp(
			Math.min(width / targetWidth, height / targetHeight) * 0.96,
			0.28,
			1
		);
		const centerX = this.builtMap.bounds.x + this.builtMap.bounds.width / 2;
		const centerY = portrait
			? 500
			: this.builtMap.bounds.y + this.builtMap.bounds.height / 2;

		this.cameras.main
			.setZoom(zoom)
			.centerOn(centerX, centerY);
	}
}
