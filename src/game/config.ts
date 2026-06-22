import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';

export const SCENE_KEYS = {
	boot: 'BootScene',
	preload: 'PreloadScene',
	game: 'GameScene'
} as const;

export const GAME_COLORS = {
	snow: 0xdcefff,
	snowShadow: 0xb8d8ec,
	ink: '#14324a',
	mutedInk: '#37566f',
	warmth: 0xffb548
} as const;

export const ISO_GRID = {
	tileWidth: 128,
	tileHeight: 64,
	halfTileWidth: 64,
	halfTileHeight: 32
} as const;

export const WORLD_BOUNDS = {
	x: 0,
	y: 0,
	width: 1920,
	height: 1080
} as const;

export const DEPTH_LAYERS = {
	ground: -10_000,
	world: 0,
	effects: 100_000,
	ui: 200_000
} as const;

export function worldDepthFromBaseY(baseY: number): number {
	return DEPTH_LAYERS.world + baseY;
}

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
