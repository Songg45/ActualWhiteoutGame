import type { MapMarker, MarkerKind } from '../map/MapData';
import type { GridPoint } from '../map/IsoMath';

export type InteractionKind = Extract<MarkerKind, 'resource-station' | 'build-pad'> | 'drop-zone';

export interface Interactable {
	id: string;
	kind: InteractionKind;
	grid: GridPoint;
	radius?: number;
	marker?: MapMarker;
}

export interface InteractionChange {
	current: Interactable | null;
	previous: Interactable | null;
}

function gridDistance(left: GridPoint, right: GridPoint): number {
	return Math.hypot(left.x - right.x, left.y - right.y);
}

export function findNearestInteractable(
	playerGrid: GridPoint,
	interactables: readonly Interactable[],
	defaultRadius = 1.35
): Interactable | null {
	return interactables
		.map((interactable) => ({
			interactable,
			distance: gridDistance(playerGrid, interactable.grid)
		}))
		.filter(({ interactable, distance }) => distance <= (interactable.radius ?? defaultRadius))
		.sort((left, right) => (
			left.distance - right.distance
			|| left.interactable.id.localeCompare(right.interactable.id)
		))[0]?.interactable ?? null;
}

export function createMarkerInteractables(
	markers: readonly MapMarker[]
): Interactable[] {
	return markers
		.filter((marker): marker is MapMarker & {
			kind: 'resource-station' | 'build-pad';
		} => marker.kind === 'resource-station' || marker.kind === 'build-pad')
		.map((marker) => ({
			id: marker.id,
			kind: marker.kind,
			grid: marker.grid,
			marker
		}));
}

export class InteractionSystem {
	private nearby: Interactable | null = null;

	constructor(
		private readonly interactables: readonly Interactable[],
		private readonly onChange?: (change: InteractionChange) => void
	) {}

	get current(): Interactable | null {
		return this.nearby;
	}

	update(playerGrid: GridPoint): Interactable | null {
		const next = findNearestInteractable(playerGrid, this.interactables);
		if (next?.id === this.nearby?.id) {
			return this.nearby;
		}

		const previous = this.nearby;
		this.nearby = next;
		this.onChange?.({ current: next, previous });
		return next;
	}
}
