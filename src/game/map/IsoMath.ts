const ISO_GRID: typeof import('../config').ISO_GRID = {
	tileWidth: 128,
	tileHeight: 64,
	halfTileWidth: 64,
	halfTileHeight: 32
};

export interface GridPoint {
	x: number;
	y: number;
}

export interface ScreenPoint {
	x: number;
	y: number;
}

export const ISO_ORIGIN: Readonly<ScreenPoint> = {
	x: 0,
	y: 0
};

export function gridToScreen(
	grid: GridPoint,
	origin: ScreenPoint = ISO_ORIGIN
): ScreenPoint {
	return {
		x: origin.x + (grid.x - grid.y) * ISO_GRID.halfTileWidth,
		y: origin.y + (grid.x + grid.y) * ISO_GRID.halfTileHeight
	};
}

export function screenToGrid(
	screen: ScreenPoint,
	origin: ScreenPoint = ISO_ORIGIN
): GridPoint {
	const localX = screen.x - origin.x;
	const localY = screen.y - origin.y;

	return {
		x: (localX / ISO_GRID.halfTileWidth + localY / ISO_GRID.halfTileHeight) / 2,
		y: (localY / ISO_GRID.halfTileHeight - localX / ISO_GRID.halfTileWidth) / 2
	};
}

export function screenToNearestGrid(
	screen: ScreenPoint,
	origin: ScreenPoint = ISO_ORIGIN
): GridPoint {
	const grid = screenToGrid(screen, origin);

	return {
		x: Math.round(grid.x),
		y: Math.round(grid.y)
	};
}

export function getTileDiamond(
	grid: GridPoint,
	origin: ScreenPoint = ISO_ORIGIN
): readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
	const center = gridToScreen(grid, origin);

	return [
		{ x: center.x, y: center.y - ISO_GRID.halfTileHeight },
		{ x: center.x + ISO_GRID.halfTileWidth, y: center.y },
		{ x: center.x, y: center.y + ISO_GRID.halfTileHeight },
		{ x: center.x - ISO_GRID.halfTileWidth, y: center.y }
	];
}
