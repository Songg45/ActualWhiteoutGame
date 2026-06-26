import type { BuildingId } from '../buildings/BuildingTypes';
import type { ResourceType } from '../state/GameState';
import type { GridPoint } from './IsoMath';
import type { MarkerKind } from './MapData';

export type GameplayAnchorKind =
	| 'furnace'
	| 'enemy-spawn'
	| 'npc-spawn'
	| 'food'
	| 'wood'
	| 'storage'
	| 'exchange'
	| 'build-pad'
	| 'defense-slot'
	| 'worker-hut'
	| 'gate';

export interface GameplayAnchor {
	id: string;
	kind: GameplayAnchorKind;
	grid: GridPoint;
	label?: string;
	legacyMarkerId?: string;
	markerKind?: MarkerKind;
	resource?: Extract<ResourceType, 'wood' | 'meat'>;
	buildingId?: BuildingId;
}

export const REQUIRED_PLAYABLE_ANCHORS: readonly GameplayAnchorKind[] = [
	'furnace',
	'enemy-spawn',
	'npc-spawn',
	'food',
	'wood'
] as const;
