import { gridKey } from './MapData';
import type { GridPoint } from './IsoMath';
import {
	REQUIRED_PLAYABLE_ANCHORS,
	type GameplayAnchor
} from './GameplayAnchor';
import type {
	BlockerPlacement,
	MapRecipe,
	SceneryPlacement,
	SpawnLaneRecipe,
	TerrainRegionRecipe
} from './MapRecipe';

export interface MapRecipeValidationResult {
	ok: boolean;
	errors: readonly string[];
}

function inBounds(recipe: MapRecipe, point: GridPoint): boolean {
	return (
		Number.isFinite(point.x)
		&& Number.isFinite(point.y)
		&& point.x >= 0
		&& point.y >= 0
		&& point.x <= recipe.size.width - 1
		&& point.y <= recipe.size.height - 1
	);
}

function validateUniqueIds(
	errors: string[],
	label: string,
	items: readonly { id: string }[]
): void {
	const seen = new Set<string>();
	for (const item of items) {
		if (!item.id.trim()) {
			errors.push(`${label} has a blank id.`);
			continue;
		}
		if (seen.has(item.id)) {
			errors.push(`Duplicate ${label} id: ${item.id}.`);
		}
		seen.add(item.id);
	}
}

function validatePoint(
	errors: string[],
	recipe: MapRecipe,
	label: string,
	point: GridPoint
): void {
	if (!inBounds(recipe, point)) {
		errors.push(`${label} is out of bounds at ${gridKey(point)}.`);
	}
}

function validateTerrainRegion(
	errors: string[],
	recipe: MapRecipe,
	region: TerrainRegionRecipe
): void {
	if (
		!Number.isSafeInteger(region.x)
		|| !Number.isSafeInteger(region.y)
		|| !Number.isSafeInteger(region.width)
		|| !Number.isSafeInteger(region.height)
		|| region.width <= 0
		|| region.height <= 0
	) {
		errors.push(`Terrain region ${region.kind} has invalid dimensions.`);
		return;
	}
	validatePoint(errors, recipe, `Terrain region ${region.kind} start`, {
		x: region.x,
		y: region.y
	});
	validatePoint(errors, recipe, `Terrain region ${region.kind} end`, {
		x: region.x + region.width - 1,
		y: region.y + region.height - 1
	});
}

function validatePlacement(
	errors: string[],
	recipe: MapRecipe,
	label: string,
	placement: SceneryPlacement
): void {
	validatePoint(errors, recipe, `${label} ${placement.id}`, placement.grid);
}

function validateBlocker(
	errors: string[],
	recipe: MapRecipe,
	blocker: BlockerPlacement
): void {
	validatePlacement(errors, recipe, 'Blocker', blocker);
	for (const offset of blocker.blockedFootprint) {
		validatePoint(errors, recipe, `Blocker ${blocker.id} footprint`, {
			x: blocker.grid.x + offset.x,
			y: blocker.grid.y + offset.y
		});
	}
}

function validateAnchor(
	errors: string[],
	recipe: MapRecipe,
	anchor: GameplayAnchor,
	blockedCells: ReadonlySet<string>
): void {
	validatePoint(errors, recipe, `Anchor ${anchor.id}`, anchor.grid);
	if (blockedCells.has(gridKey(anchor.grid))) {
		errors.push(`Anchor ${anchor.id} is on a blocked cell.`);
	}
	if (anchor.kind === 'wood' && anchor.resource && anchor.resource !== 'wood') {
		errors.push(`Anchor ${anchor.id} is wood but uses ${anchor.resource}.`);
	}
	if (anchor.kind === 'food' && anchor.resource && anchor.resource !== 'meat') {
		errors.push(`Anchor ${anchor.id} is food but uses ${anchor.resource}.`);
	}
}

function validateSpawnLane(
	errors: string[],
	recipe: MapRecipe,
	lane: SpawnLaneRecipe
): void {
	if (lane.points.length === 0) {
		errors.push(`Spawn lane ${lane.id} has no points.`);
		return;
	}
	lane.points.forEach((point, index) => {
		validatePoint(errors, recipe, `Spawn lane ${lane.id} point ${index}`, point);
	});
}

export function validateMapRecipe(recipe: MapRecipe): MapRecipeValidationResult {
	const errors: string[] = [];
	if (!recipe.id.trim()) {
		errors.push('Map recipe id is required.');
	}
	if (!Number.isSafeInteger(recipe.size.width) || recipe.size.width <= 0) {
		errors.push('Map recipe width must be a positive integer.');
	}
	if (!Number.isSafeInteger(recipe.size.height) || recipe.size.height <= 0) {
		errors.push('Map recipe height must be a positive integer.');
	}

	validateUniqueIds(errors, 'scenery', recipe.scenery);
	validateUniqueIds(errors, 'blocker', recipe.blockers);
	validateUniqueIds(errors, 'anchor', recipe.anchors);
	validateUniqueIds(errors, 'spawn lane', recipe.spawnLanes);

	for (const region of recipe.terrain.regions) {
		validateTerrainRegion(errors, recipe, region);
	}

	for (const scenery of recipe.scenery) {
		validatePlacement(errors, recipe, 'Scenery', scenery);
	}

	const blockedCells = new Set<string>();
	for (const blocker of recipe.blockers) {
		validateBlocker(errors, recipe, blocker);
		for (const offset of blocker.blockedFootprint) {
			blockedCells.add(gridKey({
				x: blocker.grid.x + offset.x,
				y: blocker.grid.y + offset.y
			}));
		}
	}

	for (const required of REQUIRED_PLAYABLE_ANCHORS) {
		if (!recipe.anchors.some((anchor) => anchor.kind === required)) {
			errors.push(`Required anchor missing: ${required}.`);
		}
	}

	for (const anchor of recipe.anchors) {
		validateAnchor(errors, recipe, anchor, blockedCells);
	}

	for (const lane of recipe.spawnLanes) {
		validateSpawnLane(errors, recipe, lane);
	}

	return {
		ok: errors.length === 0,
		errors
	};
}

export function assertValidMapRecipe(recipe: MapRecipe): void {
	const result = validateMapRecipe(recipe);
	if (!result.ok) {
		throw new Error(`Invalid map recipe ${recipe.id}: ${result.errors.join(' ')}`);
	}
}
