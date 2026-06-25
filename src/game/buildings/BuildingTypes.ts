import type { GridPoint } from '../map/IsoMath';
import {
	RESOURCE_TYPES,
	normalizeResourceCost,
	type ResourceCost
} from '../resources/ResourceTypes';

export type BuildingId = 'furnace' | 'turret' | 'trap' | 'worker-hut';
export type BuildPadState = 'locked' | 'available' | 'partially-funded' | 'constructing' | 'complete';

export interface BuildingDefinition {
	id: BuildingId;
	padId: string;
	label: string;
	description: string;
	markerVariant: 'furnace' | 'turret' | 'trap' | 'worker-hut';
	cost: ResourceCost;
	constructionMs: number;
	unlocksAfterComplete: readonly BuildingId[];
	completedAssetKey?: string;
	placeholderColor: number;
}

export interface CompletedBuilding {
	id: BuildingId;
	padId: string;
	label: string;
	grid: GridPoint;
	completedAtMs: number;
}

const BUILDING_DEFINITIONS_INTERNAL = [
	{
		id: 'furnace',
		padId: 'furnace-pad',
		label: 'Furnace',
		description: 'Warms the camp and opens defense construction.',
		markerVariant: 'furnace',
		cost: { wood: 8, meat: 2, money: 6 },
		constructionMs: 2500,
		unlocksAfterComplete: ['turret', 'trap'],
		completedAssetKey: 'building-furnace-camp',
		placeholderColor: 0xffa13b
	},
	{
		id: 'turret',
		padId: 'turret-pad',
		label: 'Tower',
		description: 'Future crossbow tower hook for defense agents.',
		markerVariant: 'turret',
		cost: { wood: 10, meat: 0, money: 12 },
		constructionMs: 2800,
		unlocksAfterComplete: ['worker-hut'],
		completedAssetKey: 'building-turret-crossbow',
		placeholderColor: 0x6e8aa2
	},
	{
		id: 'trap',
		padId: 'trap-pad',
		label: 'Trap',
		description: 'Future trap placement hook for defense agents.',
		markerVariant: 'trap',
		cost: { wood: 6, meat: 2, money: 8 },
		constructionMs: 2200,
		unlocksAfterComplete: ['worker-hut'],
		placeholderColor: 0x8a627c
	},
	{
		id: 'worker-hut',
		padId: 'worker-hut-pad',
		label: 'Worker Hut',
		description: 'Placeholder unlock for future worker automation.',
		markerVariant: 'worker-hut',
		cost: { wood: 14, meat: 4, money: 18 },
		constructionMs: 3000,
		unlocksAfterComplete: [],
		placeholderColor: 0x4c8c7c
	}
] as const satisfies readonly BuildingDefinition[];

export const BUILDING_DEFINITIONS: readonly BuildingDefinition[] =
	BUILDING_DEFINITIONS_INTERNAL.map((definition) => ({
		...definition,
		cost: normalizeResourceCost(definition.cost)
	}));

export const INITIAL_UNLOCKED_BUILDINGS: readonly BuildingId[] = ['furnace'];

export function getBuildingDefinition(id: BuildingId): BuildingDefinition {
	const definition = BUILDING_DEFINITIONS.find((candidate) => candidate.id === id);
	if (!definition) {
		throw new Error(`Unknown building definition: ${id}`);
	}
	return definition;
}

export function getBuildingDefinitionByPadId(padId: string): BuildingDefinition | undefined {
	return BUILDING_DEFINITIONS.find((definition) => definition.padId === padId);
}

export function assertValidBuildingDefinitions(
	definitions: readonly BuildingDefinition[] = BUILDING_DEFINITIONS
): void {
	const ids = new Set<string>();
	const padIds = new Set<string>();
	for (const definition of definitions) {
		if (ids.has(definition.id)) {
			throw new Error(`Duplicate building id: ${definition.id}`);
		}
		if (padIds.has(definition.padId)) {
			throw new Error(`Duplicate build pad id: ${definition.padId}`);
		}
		ids.add(definition.id);
		padIds.add(definition.padId);
		const normalizedCost = normalizeResourceCost(definition.cost);
		if (!Number.isFinite(definition.constructionMs) || definition.constructionMs <= 0) {
			throw new RangeError(`${definition.id} construction time must be positive and finite.`);
		}
		for (const resource of RESOURCE_TYPES) {
			if (normalizedCost[resource] < 0) {
				throw new RangeError(`${definition.id} has a negative ${resource} cost.`);
			}
		}
	}
}
