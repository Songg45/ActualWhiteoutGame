import type { DropZoneDefinition } from '../objects/DropZone';
import type { ResourceStationDefinition } from '../objects/ResourceStation';
import {
	getBlockedGridKeys,
	type MapData
} from './MapData';
import type { GameplayAnchor, GameplayAnchorKind } from './GameplayAnchor';
import type { GridPoint } from './IsoMath';
import type { MapRecipe, SpawnLaneTeam } from './MapRecipe';
import { buildMapDataFromRecipe } from './MapRecipeBuilder';

const STATION_DEFAULTS = {
	wood: {
		initialStock: 4,
		capacity: 12,
		productionIntervalMs: 1500,
		maxCatchUpMs: 30_000
	},
	meat: {
		initialStock: 3,
		capacity: 10,
		productionIntervalMs: 2000,
		maxCatchUpMs: 30_000
	}
} as const;

export class MapRuntime {
	readonly data: MapData;
	readonly blockedGridKeys: ReadonlySet<string>;

	constructor(readonly recipe: MapRecipe) {
		this.data = buildMapDataFromRecipe(recipe);
		this.blockedGridKeys = getBlockedGridKeys(this.data);
	}

	getAnchors(kind: GameplayAnchorKind): readonly GameplayAnchor[] {
		return this.recipe.anchors
			.filter((anchor) => anchor.kind === kind)
			.map((anchor) => ({ ...anchor, grid: { ...anchor.grid } }));
	}

	getAnchor(kind: GameplayAnchorKind): GameplayAnchor | undefined {
		return this.getAnchors(kind)[0];
	}

	requireAnchor(kind: GameplayAnchorKind): GameplayAnchor {
		const anchor = this.getAnchor(kind);
		if (!anchor) {
			throw new Error(`Map ${this.recipe.id} is missing anchor: ${kind}.`);
		}
		return anchor;
	}

	getSpawnLanes(team: SpawnLaneTeam = 'enemy'): readonly { id: string; points: readonly GridPoint[] }[] {
		return this.recipe.spawnLanes
			.filter((lane) => lane.team === team)
			.map((lane) => ({
				id: lane.id,
				points: lane.points.map((point) => ({ ...point }))
			}));
	}

	getBlockedCells(): ReadonlySet<string> {
		return new Set(this.blockedGridKeys);
	}

	getBuildPads(): readonly GameplayAnchor[] {
		return this.recipe.anchors
			.filter((anchor) => (
				anchor.kind === 'furnace'
				|| anchor.kind === 'build-pad'
				|| anchor.kind === 'defense-slot'
				|| anchor.kind === 'worker-hut'
			))
			.map((anchor) => ({ ...anchor, grid: { ...anchor.grid } }));
	}

	getResourceStations(): readonly ResourceStationDefinition[] {
		return this.recipe.anchors
			.filter((anchor) => (
				(anchor.kind === 'wood' || anchor.kind === 'food')
				&& anchor.markerKind === 'resource-station'
				&& anchor.resource
			))
			.map((anchor): ResourceStationDefinition => {
				const resource = anchor.resource ?? (anchor.kind === 'wood' ? 'wood' : 'meat');
				return {
					id: anchor.legacyMarkerId ?? anchor.id,
					resource,
					grid: { ...anchor.grid },
					...STATION_DEFAULTS[resource]
				};
			});
	}

	getDropZones(): readonly DropZoneDefinition[] {
		return this.recipe.anchors
			.filter((anchor) => anchor.kind === 'storage' || anchor.kind === 'exchange')
			.map((anchor): DropZoneDefinition => {
				if (anchor.kind === 'exchange') {
					return {
						id: anchor.id === 'exchange' ? 'reward-exchange' : anchor.id,
						label: anchor.label ?? 'Supply Exchange',
						mode: 'convert',
						grid: { ...anchor.grid },
						accepted: ['wood', 'meat'] as const,
						maxUnitsPerTick: 2,
						conversionRates: { wood: 2, meat: 3 }
					};
				}
				return {
					id: anchor.id === 'storage' ? 'camp-storage' : anchor.id,
					label: anchor.label ?? 'Camp Storage',
					mode: 'deposit',
					grid: { ...anchor.grid },
					accepted: ['wood', 'meat'] as const,
					maxUnitsPerTick: 3
				};
			});
	}
}
