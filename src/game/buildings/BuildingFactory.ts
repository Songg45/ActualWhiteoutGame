import type Phaser from 'phaser';
import type { GameEventBus } from '../events/GameEvents';
import type { BuiltMap } from '../map/MapBuilder';
import type { MapMarker } from '../map/MapData';
import { BuildPad } from './BuildPad';
import {
	BUILDING_DEFINITIONS,
	INITIAL_UNLOCKED_BUILDINGS,
	getBuildingDefinitionByPadId,
	type BuildingId
} from './BuildingTypes';

export function createBuildPads(
	scene: Phaser.Scene,
	map: BuiltMap,
	events: GameEventBus
): BuildPad[] {
	return map.data.markers
		.filter((marker): marker is MapMarker & { kind: 'build-pad' } => marker.kind === 'build-pad')
		.map((marker) => {
			const definition = getBuildingDefinitionByPadId(marker.id);
			if (!definition) {
				throw new Error(`No building definition found for marker ${marker.id}.`);
			}
			return new BuildPad(
				scene,
				definition,
				marker.grid,
				map.origin,
				!INITIAL_UNLOCKED_BUILDINGS.includes(definition.id),
				events
			);
		});
}

export function getDefensePlacementIds(building: BuildingId): readonly string[] {
	if (building === 'turret') {
		return BUILDING_DEFINITIONS
			.filter((definition) => definition.id === 'turret')
			.map((definition) => definition.padId);
	}
	if (building === 'trap') {
		return BUILDING_DEFINITIONS
			.filter((definition) => definition.id === 'trap')
			.map((definition) => definition.padId);
	}
	return [];
}
