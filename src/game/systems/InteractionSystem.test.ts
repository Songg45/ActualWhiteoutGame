import { describe, expect, it, vi } from 'vitest';
import type { Interactable } from './InteractionSystem';
import {
	findNearestInteractable,
	InteractionSystem
} from './InteractionSystem';

const interactables: Interactable[] = [
	{
		id: 'wood',
		kind: 'resource-station',
		grid: { x: 2, y: 2 }
	},
	{
		id: 'turret',
		kind: 'build-pad',
		grid: { x: 4, y: 4 }
	}
];

describe('interaction proximity', () => {
	it('finds the nearest interactable inside its radius', () => {
		expect(findNearestInteractable({ x: 2.5, y: 2 }, interactables)?.id).toBe('wood');
	});

	it('returns null outside all interaction radii', () => {
		expect(findNearestInteractable({ x: 0, y: 0 }, interactables)).toBeNull();
	});

	it('uses stable IDs to resolve equal-distance ties', () => {
		const tied: Interactable[] = [
			{ id: 'z-station', kind: 'resource-station', grid: { x: 1, y: 0 } },
			{ id: 'a-pad', kind: 'build-pad', grid: { x: -1, y: 0 } }
		];

		expect(findNearestInteractable({ x: 0, y: 0 }, tied)?.id).toBe('a-pad');
	});

	it('notifies only when the nearby interaction changes', () => {
		const onChange = vi.fn();
		const system = new InteractionSystem(interactables, onChange);

		system.update({ x: 2, y: 2 });
		system.update({ x: 2.1, y: 2 });
		system.update({ x: 0, y: 0 });

		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange.mock.calls[0][0].current.id).toBe('wood');
		expect(onChange.mock.calls[1][0]).toEqual({
			current: null,
			previous: interactables[0]
		});
	});
});
