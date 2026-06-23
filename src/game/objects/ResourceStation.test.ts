import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		GameObjects: {
			Container: class {}
		}
	}
}));

import {
	StationProduction,
	type ResourceStationDefinition
} from './ResourceStation';

function definition(
	overrides: Partial<ResourceStationDefinition> = {}
): ResourceStationDefinition {
	return {
		id: 'test-station',
		resource: 'wood',
		grid: { x: 0, y: 0 },
		initialStock: 0,
		capacity: 5,
		productionIntervalMs: 1000,
		maxCatchUpMs: 3000,
		...overrides
	};
}

describe('StationProduction', () => {
	it('produces deterministically with bounded catch-up and finite capacity', () => {
		const changes = vi.fn();
		const station = new StationProduction(definition(), changes);

		expect(station.update(999)).toBe(0);
		expect(station.update(1)).toBe(1);
		expect(station.update(10_000)).toBe(3);
		expect(station.update(1000)).toBe(1);
		expect(station.stock).toBe(5);
		expect(station.update(60_000)).toBe(0);
		expect(changes).toHaveBeenCalledTimes(3);
	});

	it('does not bank production while full, paused, or destroyed', () => {
		const station = new StationProduction(definition({
			initialStock: 5
		}));

		station.update(10_000);
		expect(station.take(2)).toBe(2);
		expect(station.update(999)).toBe(0);
		expect(station.update(1)).toBe(1);
		station.setPaused(true);
		expect(station.update(5000)).toBe(0);
		station.setPaused(false);
		expect(station.update(1000)).toBe(1);
		station.destroy();
		expect(station.update(5000)).toBe(0);
		expect(station.take(1)).toBe(0);
		expect(station.stock).toBe(5);
	});

	it.each([
		{ initialStock: -1 },
		{ capacity: 1.5 },
		{ initialStock: 6 },
		{ productionIntervalMs: 0 },
		{ productionIntervalMs: Number.NaN },
		{ maxCatchUpMs: -1 }
	])('rejects invalid station definitions', (overrides) => {
		expect(() => new StationProduction(definition(overrides))).toThrow(RangeError);
	});

	it.each([Number.NaN, Infinity, -1])(
		'rejects invalid update deltas: %s',
		(delta) => {
			const station = new StationProduction(definition());
			expect(() => station.update(delta)).toThrow(RangeError);
			expect(station.stock).toBe(0);
		}
	);
});
