import type { BlockerPlacement, MapRecipe, SceneryPlacement } from '../MapRecipe';
import type { GridPoint } from '../IsoMath';

const SINGLE_CELL_FOOTPRINT: readonly GridPoint[] = [{ x: 0, y: 0 }];

function fenceLine(
	prefix: string,
	points: readonly GridPoint[],
	orientation: 'x' | 'y'
): BlockerPlacement[] {
	return points.map((grid, index) => ({
		id: `${prefix}-${index}`,
		kind: 'fence',
		grid,
		orientation,
		blockedFootprint: SINGLE_CELL_FOOTPRINT
	}));
}

const treePoints: readonly GridPoint[] = [
	{ x: 0, y: 1 }, { x: 0, y: 3 }, { x: 0, y: 6 }, { x: 0, y: 9 },
	{ x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 5 }, { x: 1, y: 8 },
	{ x: 1, y: 11 }, { x: 2, y: 1 }, { x: 2, y: 12 },
	{ x: 3, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 0 }, { x: 8, y: 0 },
	{ x: 10, y: 1 }, { x: 12, y: 0 }, { x: 13, y: 2 },
	{ x: 12, y: 4 }, { x: 13, y: 8 }, { x: 12, y: 10 },
	{ x: 14, y: 5 }, { x: 13, y: 12 }, { x: 14, y: 14 },
	{ x: 11, y: 13 }, { x: 10, y: 14 }, { x: 7, y: 13 },
	{ x: 5, y: 14 }, { x: 3, y: 12 }, { x: 1, y: 13 },
	{ x: 2, y: 8 }, { x: 2, y: 9 }
];

const rockPoints: readonly GridPoint[] = [
	{ x: 2, y: 3 },
	{ x: 11, y: 2 },
	{ x: 13, y: 7 },
	{ x: 4, y: 13 }
];

const gates: readonly SceneryPlacement[] = [
	{
		id: 'gate-north',
		kind: 'gate',
		grid: { x: 6.5, y: 3 },
		orientation: 'x'
	},
	{
		id: 'gate-east',
		kind: 'gate',
		grid: { x: 11, y: 6.5 },
		orientation: 'y'
	},
	{
		id: 'gate-south',
		kind: 'gate',
		grid: { x: 7, y: 11 },
		orientation: 'x'
	}
];

export const camp01Recipe: MapRecipe = {
	id: 'camp-01',
	name: 'Snowy Starter Camp',
	size: { width: 15, height: 15 },
	terrain: {
		defaultKind: 'snow',
		regions: [
			{
				kind: 'camp',
				x: 3,
				y: 3,
				width: 9,
				height: 9
			}
		]
	},
	scenery: [
		...gates,
		...treePoints.map((grid, index): SceneryPlacement => ({
			id: `tree-${index}`,
			kind: 'tree',
			grid
		}))
	],
	blockers: [
		...fenceLine(
			'fence-north',
			[3, 4, 5, 8, 9, 10, 11].map((x) => ({ x, y: 3 })),
			'x'
		),
		...fenceLine(
			'fence-south',
			[3, 4, 5, 6, 8, 9, 10, 11].map((x) => ({ x, y: 11 })),
			'x'
		),
		...fenceLine(
			'fence-west',
			[4, 5, 6, 7, 8, 9, 10].map((y) => ({ x: 3, y })),
			'y'
		),
		...fenceLine(
			'fence-east',
			[4, 5, 8, 9, 10].map((y) => ({ x: 11, y })),
			'y'
		),
		...rockPoints.map((grid, index): BlockerPlacement => ({
			id: `rock-${index}`,
			kind: 'rock',
			grid,
			blockedFootprint: SINGLE_CELL_FOOTPRINT
		}))
	],
	anchors: [
		{
			id: 'furnace',
			kind: 'furnace',
			grid: { x: 7, y: 7 },
			label: 'Furnace',
			legacyMarkerId: 'furnace-pad',
			markerKind: 'build-pad',
			buildingId: 'furnace'
		},
		{
			id: 'wood',
			kind: 'wood',
			grid: { x: 2.2, y: 8.6 },
			label: 'Wood',
			legacyMarkerId: 'wood-station',
			markerKind: 'resource-station',
			resource: 'wood'
		},
		{
			id: 'food',
			kind: 'food',
			grid: { x: 8.5, y: 4.5 },
			label: 'Food Service'
		},
		{
			id: 'storage',
			kind: 'storage',
			grid: { x: 6.2, y: 8.8 },
			label: 'Camp Storage'
		},
		{
			id: 'exchange',
			kind: 'exchange',
			grid: { x: 9.2, y: 7.2 },
			label: 'Supply Exchange'
		},
		{
			id: 'south-tower-defense-slot',
			kind: 'defense-slot',
			grid: { x: 9.2, y: 8.7 },
			label: 'Turret',
			legacyMarkerId: 'south-tower-pad',
			markerKind: 'build-pad',
			buildingId: 'turret'
		},
		{
			id: 'north-tower-defense-slot',
			kind: 'defense-slot',
			grid: { x: 5.1, y: 4.6 },
			label: 'Turret',
			legacyMarkerId: 'north-tower-pad',
			markerKind: 'build-pad',
			buildingId: 'turret'
		},
		{
			id: 'worker-hut',
			kind: 'worker-hut',
			grid: { x: 5.2, y: 8.9 },
			label: 'Hut',
			legacyMarkerId: 'worker-hut-pad',
			markerKind: 'build-pad',
			buildingId: 'worker-hut'
		},
		{
			id: 'enemy-spawn-east',
			kind: 'enemy-spawn',
			grid: { x: 14, y: 6.5 },
			label: 'East Breach'
		},
		{
			id: 'enemy-spawn-north',
			kind: 'enemy-spawn',
			grid: { x: 6.5, y: 0 },
			label: 'North Breach'
		},
		{
			id: 'npc-spawn',
			kind: 'npc-spawn',
			grid: { x: 7, y: 9.4 },
			label: 'Camp NPC Spawn'
		}
	],
	spawnLanes: [
		{
			id: 'east-breach',
			team: 'enemy',
			points: [
				{ x: 14, y: 6.5 },
				{ x: 12.5, y: 6.5 },
				{ x: 11, y: 6.5 },
				{ x: 9.2, y: 6.5 }
			]
		},
		{
			id: 'north-breach',
			team: 'enemy',
			points: [
				{ x: 6.5, y: 0 },
				{ x: 6.5, y: 1.5 },
				{ x: 6.5, y: 3 },
				{ x: 6.5, y: 5 }
			]
		}
	]
};
