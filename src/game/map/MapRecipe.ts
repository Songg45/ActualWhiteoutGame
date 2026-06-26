import type { EnvironmentKind, TerrainKind } from './MapData';
import type { GridPoint } from './IsoMath';
import type { GameplayAnchor } from './GameplayAnchor';

export interface TerrainRegionRecipe {
	kind: TerrainKind;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TerrainRecipe {
	defaultKind: TerrainKind;
	regions: readonly TerrainRegionRecipe[];
}

export interface SceneryPlacement {
	id: string;
	kind: EnvironmentKind;
	grid: GridPoint;
	orientation?: 'x' | 'y';
}

export interface BlockerPlacement extends SceneryPlacement {
	blockedFootprint: readonly GridPoint[];
}

export type SpawnLaneTeam = 'enemy' | 'npc';

export interface SpawnLaneRecipe {
	id: string;
	team: SpawnLaneTeam;
	points: readonly GridPoint[];
}

export interface MapRecipe {
	id: string;
	name: string;
	size: { width: number; height: number };
	terrain: TerrainRecipe;
	scenery: readonly SceneryPlacement[];
	blockers: readonly BlockerPlacement[];
	anchors: readonly GameplayAnchor[];
	spawnLanes: readonly SpawnLaneRecipe[];
}
