import Phaser from 'phaser';
import { GAME_COLORS, SCENE_KEYS } from '../config';

export class BootScene extends Phaser.Scene {
	constructor() {
		super(SCENE_KEYS.boot);
	}

	create(): void {
		this.cameras.main.setBackgroundColor(GAME_COLORS.snow);
		this.scene.start(SCENE_KEYS.preload);
	}
}
