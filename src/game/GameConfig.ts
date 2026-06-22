import Phaser from 'phaser';
import { GAME_COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	parent: 'game',
	backgroundColor: GAME_COLORS.snow,
	render: {
		antialias: true,
		pixelArt: false,
		roundPixels: true
	},
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: '100%',
		height: '100%',
		min: {
			width: 320,
			height: 480
		}
	},
	scene: [BootScene, PreloadScene, GameScene]
};
