import type { GridPoint } from './IsoMath';

export type TerrainKind = 'snow' | 'camp';
export type EnvironmentKind = 'tree' | 'rock' | 'fence' | 'gate';
export type MarkerKind = 'build-pad' | 'resource-station' | 'campfire';

export interface TerrainTile {
	kind: TerrainKind;
	grid: GridPoint;
}

export interface EnvironmentDefinition {
	id: string;
	kind: EnvironmentKind;
	grid: GridPoint;
	orientation?: 'x' | 'y';
	blockedFootprint: readonly GridPoint[];
}

export interface MapMarker {
	id: string;
	kind: MarkerKind;
	grid: GridPoint;
	label: string;
	variant?: 'wood' | 'meat' | 'turret' | 'trap' | 'furnace';
}

export interface SpawnLane {
	id: string;
	points: readonly GridPoint[];
}

export interface MapData {
	width: number;
	height: number;
	terrain: readonly TerrainTile[];
	environment: readonly EnvironmentDefinition[];
	markers: readonly MapMarker[];
	spawnLanes: readonly SpawnLane[];
}

const SINGLE_CELL_FOOTPRINT: readonly GridPoint[] = [{ x: 0, y: 0 }];
const OPEN_FOOTPRINT: readonly GridPoint[] = [];

function createTerrain(width: number, height: number): TerrainTile[] {
	const terrain: TerrainTile[] = [];

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const insideCamp = x >= 3 && x <= 10 && y >= 3 && y <= 10;
			terrain.push({
				kind: insideCamp ? 'camp' : 'snow',
				grid: { x, y }
			});
		}
	}

	return terrain;
}

function createFenceLine(
	prefix: string,
	points: readonly GridPoint[],
	orientation: 'x' | 'y'
): EnvironmentDefinition[] {
	return points.map((grid, index) => ({
		id: `${prefix}-${index}`,
		kind: 'fence',
		grid,
		orientation,
		blockedFootprint: SINGLE_CELL_FOOTPRINT
	}));
}

function createForest(): EnvironmentDefinition[] {
	const treePoints: GridPoint[] = [
		{ x: 0, y: 1 }, { x: 0, y: 3 }, { x: 0, y: 6 }, { x: 0, y: 9 },
		{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 5 }, { x: 1, y: 8 },
		{ x: 1, y: 11 }, { x: 2, y: 1 }, { x: 2, y: 12 },
		{ x: 3, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 0 }, { x: 8, y: 0 },
		{ x: 10, y: 1 }, { x: 12, y: 0 }, { x: 13, y: 2 },
		{ x: 12, y: 4 }, { x: 13, y: 8 }, { x: 12, y: 10 },
		{ x: 13, y: 12 }, { x: 10, y: 13 }, { x: 7, y: 12 },
		{ x: 5, y: 13 }, { x: 3, y: 12 }, { x: 1, y: 13 }
	];
	const rockPoints: GridPoint[] = [
		{ x: 2, y: 3 },
		{ x: 11, y: 2 },
		{ x: 12, y: 7 },
		{ x: 4, y: 12 }
	];

	return [
		...treePoints.map((grid, index): EnvironmentDefinition => ({
			id: `tree-${index}`,
			kind: 'tree',
			grid,
			blockedFootprint: SINGLE_CELL_FOOTPRINT
		})),
		...rockPoints.map((grid, index): EnvironmentDefinition => ({
			id: `rock-${index}`,
			kind: 'rock',
			grid,
			blockedFootprint: SINGLE_CELL_FOOTPRINT
		}))
	];
}

export function createMapData(): MapData {
	const width = 14;
	const height = 14;
	const northFence = createFenceLine(
		'fence-north',
		[3, 4, 5, 8, 9, 10].map((x) => ({ x, y: 3 })),
		'x'
	);
	const southFence = createFenceLine(
		'fence-south',
		[3, 4, 5, 6, 8, 9, 10].map((x) => ({ x, y: 10 })),
		'x'
	);
	const westFence = createFenceLine(
		'fence-west',
		[4, 5, 6, 7, 8, 9].map((y) => ({ x: 3, y })),
		'y'
	);
	const eastFence = createFenceLine(
		'fence-east',
		[4, 5, 8, 9].map((y) => ({ x: 10, y })),
		'y'
	);

	return {
		width,
		height,
		terrain: createTerrain(width, height),
		environment: [
			...northFence,
			...southFence,
			...westFence,
			...eastFence,
			{
				id: 'gate-north',
				kind: 'gate',
				grid: { x: 6.5, y: 3 },
				orientation: 'x',
				blockedFootprint: OPEN_FOOTPRINT
			},
			{
				id: 'gate-east',
				kind: 'gate',
				grid: { x: 10, y: 6.5 },
				orientation: 'y',
				blockedFootprint: OPEN_FOOTPRINT
			},
			{
				id: 'gate-south',
				kind: 'gate',
				grid: { x: 7, y: 10 },
				orientation: 'x',
				blockedFootprint: OPEN_FOOTPRINT
			},
			...createForest()
		],
		markers: [
			{
				id: 'campfire',
				kind: 'campfire',
				grid: { x: 7, y: 7 },
				label: 'Warmth'
			},
			{
				id: 'wood-station',
				kind: 'resource-station',
				grid: { x: 4.5, y: 7.5 },
				label: 'Wood',
				variant: 'wood'
			},
			{
				id: 'meat-station',
				kind: 'resource-station',
				grid: { x: 8.5, y: 4.5 },
				label: 'Meat',
				variant: 'meat'
			},
			{
				id: 'turret-pad',
				kind: 'build-pad',
				grid: { x: 8.5, y: 8 },
				label: 'Turret',
				variant: 'turret'
			},
			{
				id: 'trap-pad',
				kind: 'build-pad',
				grid: { x: 6, y: 5 },
				label: 'Trap',
				variant: 'trap'
			}
		],
		spawnLanes: [
			{
				id: 'east-breach',
				points: [
					{ x: 13, y: 6.5 },
					{ x: 11.5, y: 6.5 },
					{ x: 10, y: 6.5 },
					{ x: 8.5, y: 6.5 }
				]
			},
			{
				id: 'north-breach',
				points: [
					{ x: 6.5, y: 0 },
					{ x: 6.5, y: 1.5 },
					{ x: 6.5, y: 3 },
					{ x: 6.5, y: 5 }
				]
			}
		]
	};
}

export function gridKey(grid: GridPoint): string {
	return `${grid.x},${grid.y}`;
}

export function getBlockedGridKeys(data: MapData): ReadonlySet<string> {
	const blocked = new Set<string>();

	for (const object of data.environment) {
		for (const offset of object.blockedFootprint) {
			blocked.add(gridKey({
				x: object.grid.x + offset.x,
				y: object.grid.y + offset.y
			}));
		}
	}

	return blocked;
}
