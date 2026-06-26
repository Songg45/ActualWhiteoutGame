import type { GridPoint } from './IsoMath';
import { buildMapDataFromRecipe } from './MapRecipeBuilder';
import { camp01Recipe } from './recipes/camp01';

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
	variant?: 'wood' | 'meat' | 'turret' | 'trap' | 'furnace' | 'worker-hut';
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

export function createMapData(): MapData {
	return buildMapDataFromRecipe(camp01Recipe);
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
