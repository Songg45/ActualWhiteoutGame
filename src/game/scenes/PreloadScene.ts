import Phaser from 'phaser';
import { GAME_COLORS, SCENE_KEYS } from '../config';

const PLACEHOLDER_TEXTURE_KEY = 'foundation-snowflake';
const PLACEHOLDER_SVG = `
	<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
		<circle cx="32" cy="32" r="29" fill="#ffffff" fill-opacity=".86"/>
		<path d="M32 12v40M15 22l34 20M49 22 15 42M25 16l7 6 7-6M25 48l7-6 7 6"
			stroke="#6eb7df" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
	</svg>
`;

export { PLACEHOLDER_TEXTURE_KEY };

export class PreloadScene extends Phaser.Scene {
	private progressBar?: Phaser.GameObjects.Rectangle;

	constructor() {
		super(SCENE_KEYS.preload);
	}

	preload(): void {
		const { width, height } = this.scale;

		this.cameras.main.setBackgroundColor(GAME_COLORS.snow);
		this.add.text(width / 2, height / 2 - 42, 'Preparing the camp...', {
			color: GAME_COLORS.ink,
			fontFamily: 'Arial, sans-serif',
			fontSize: '18px'
		}).setOrigin(0.5);

		this.add.rectangle(width / 2, height / 2, 220, 12, 0xffffff, 0.7);
		this.progressBar = this.add.rectangle(width / 2 - 108, height / 2, 0, 8, GAME_COLORS.warmth)
			.setOrigin(0, 0.5);

		this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
			this.progressBar?.setSize(216 * progress, 8);
		});
		this.load.svg(
			PLACEHOLDER_TEXTURE_KEY,
			`data:image/svg+xml;base64,${btoa(PLACEHOLDER_SVG)}`
		);
		this.load.image('player-blue', '/assets/sprites/characters/player-blue.png');
		this.load.image('resource-wood-stack', '/assets/sprites/resources/wood-stack.png');
		this.load.image('resource-meat', '/assets/sprites/resources/meat-single.png');
		this.load.image('enemy-bear-gray', '/assets/sprites/enemies/bear-gray.png');
		this.load.image('building-furnace-camp', '/assets/sprites/buildings/furnace-camp.png');
		this.load.image('building-turret-crossbow', '/assets/sprites/buildings/turret-crossbow.png');
	}

	create(): void {
		this.scene.start(SCENE_KEYS.game);
	}
}
