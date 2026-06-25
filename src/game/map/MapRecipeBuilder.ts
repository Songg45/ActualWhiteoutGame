import type { BuildingId } from '../buildings/BuildingTypes';
import type {
	EnvironmentDefinition,
	MapData,
	MapMarker,
	TerrainTile
} from './MapData';
import type { GameplayAnchor } from './GameplayAnchor';
import type { GridPoint } from './IsoMath';
import type { MapRecipe } from './MapRecipe';
import { assertValidMapRecipe } from './validateMapRecipe';

const OPEN_FOOTPRINT: readonly GridPoint[] = [];

const BUILDING_MARKER_VARIANTS = {
	furnace: 'furnace',
	turret: 'turret',
	trap: 'trap',
	'worker-hut': 'worker-hut'
} as const satisfies Record<BuildingId, NonNullable<MapMarker['variant']>>;

function createTerrain(recipe: MapRecipe): TerrainTile[] {
	const terrain: TerrainTile[] = [];
	for (let y = 0; y < recipe.size.height; y += 1) {
		for (let x = 0; x < recipe.size.width; x += 1) {
			const region = recipe.terrain.regions.find((candidate) => (
				x >= candidate.x
				&& x < candidate.x + candidate.width
				&& y >= candidate.y
				&& y < candidate.y + candidate.height
			));
			terrain.push({
				kind: region?.kind ?? recipe.terrain.defaultKind,
				grid: { x, y }
			});
		}
	}
	return terrain;
}

function createMarker(anchor: GameplayAnchor): MapMarker | null {
	if (!anchor.markerKind || !anchor.legacyMarkerId) {
		return null;
	}
	const buildingVariant = anchor.buildingId
		? BUILDING_MARKER_VARIANTS[anchor.buildingId]
		: undefined;
	return {
		id: anchor.legacyMarkerId,
		kind: anchor.markerKind,
		grid: { ...anchor.grid },
		label: anchor.label ?? anchor.id,
		variant: anchor.resource ?? buildingVariant
	};
}

export function buildMapDataFromRecipe(recipe: MapRecipe): MapData {
	assertValidMapRecipe(recipe);
	const environment: EnvironmentDefinition[] = [
		...recipe.blockers.map((blocker): EnvironmentDefinition => ({
			id: blocker.id,
			kind: blocker.kind,
			grid: { ...blocker.grid },
			orientation: blocker.orientation,
			blockedFootprint: blocker.blockedFootprint.map((point) => ({ ...point }))
		})),
		...recipe.scenery.map((scenery): EnvironmentDefinition => ({
			id: scenery.id,
			kind: scenery.kind,
			grid: { ...scenery.grid },
			orientation: scenery.orientation,
			blockedFootprint: OPEN_FOOTPRINT
		}))
	];
	const markers = recipe.anchors
		.map(createMarker)
		.filter((marker): marker is MapMarker => marker !== null);

	return {
		width: recipe.size.width,
		height: recipe.size.height,
		terrain: createTerrain(recipe),
		environment,
		markers,
		spawnLanes: recipe.spawnLanes.map((lane) => ({
			id: lane.id,
			points: lane.points.map((point) => ({ ...point }))
		}))
	};
}
