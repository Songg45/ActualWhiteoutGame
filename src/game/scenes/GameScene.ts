import Phaser from 'phaser';
import { DEPTH_LAYERS, GAME_COLORS, SCENE_KEYS, WORLD_BOUNDS } from '../config';
import { PLACEHOLDER_TEXTURE_KEY } from './PreloadScene';

export class GameScene extends Phaser.Scene {
	private backdrop?: Phaser.GameObjects.Graphics;
	private shell?: Phaser.GameObjects.Container;

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
		this.createShell();
		this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutShell, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutShell, this);
		});
	}

	private createShell(): void {
		this.backdrop = this.add.graphics().setDepth(DEPTH_LAYERS.ground);

		const badge = this.add.image(0, -76, PLACEHOLDER_TEXTURE_KEY).setDisplaySize(64, 64);
		const title = this.add.text(0, -20, 'Actual Whiteout Game', {
			color: GAME_COLORS.ink,
			fontFamily: 'Arial, sans-serif',
			fontSize: '30px',
			fontStyle: 'bold'
		}).setOrigin(0.5);
		const status = this.add.text(0, 25, 'Foundation scene flow ready', {
			color: GAME_COLORS.mutedInk,
			fontFamily: 'Arial, sans-serif',
			fontSize: '16px'
		}).setOrigin(0.5);
		const detail = this.add.text(0, 58, 'Boot  >  Preload  >  Game', {
			color: GAME_COLORS.mutedInk,
			fontFamily: 'Arial, sans-serif',
			fontSize: '13px'
		}).setOrigin(0.5).setAlpha(0.8);

		this.shell = this.add.container(0, 0, [badge, title, status, detail])
			.setDepth(DEPTH_LAYERS.world);
		this.layoutShell();
	}

	private layoutShell(): void {
		const width = this.scale.width;
		const height = this.scale.height;

		this.backdrop?.clear()
			.fillStyle(GAME_COLORS.snow, 1)
			.fillRect(0, 0, width, height)
			.fillStyle(GAME_COLORS.snowShadow, 0.28)
			.fillEllipse(width / 2, height * 0.72, Math.min(width * 0.85, 720), 120);
		this.shell?.setPosition(width / 2, height / 2);
	}
}
