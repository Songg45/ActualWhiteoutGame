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
