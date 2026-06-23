import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		GameObjects: {
			Container: class {}
		}
	}
}));

import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';
import {
	ProximityTransferClock,
	canAfford,
	spendResources
} from './EconomySystem';

describe('economy build-cost API', () => {
	it('checks and spends typed multi-resource costs atomically', () => {
		const events = new GameEventBus();
		const resourceChanges = vi.fn();
		events.on('resource:changed', resourceChanges);
		const state = new GameState(events);
		state.changeResource('wood', 8);
		state.changeResource('meat', 5);
		state.changeResource('money', 10);
		resourceChanges.mockClear();

		expect(canAfford(state.snapshot.resources, { wood: 4, meat: 2, money: 6 })).toBe(true);
		expect(spendResources(state, { wood: 4, meat: 2, money: 6 })).toEqual({
			ok: true,
			cost: { wood: 4, meat: 2, money: 6 },
			missing: { wood: 0, meat: 0, money: 0 },
			remaining: { wood: 4, meat: 3, money: 4 }
		});
		expect(resourceChanges.mock.calls.map(([event]) => event.delta)).toEqual([-4, -2, -6]);
	});

	it('reports every missing resource and changes nothing when unaffordable', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('wood', 2);
		const before = state.snapshot.resources;

		expect(spendResources(state, { wood: 3, meat: 2, money: 1 })).toEqual({
			ok: false,
			cost: { wood: 3, meat: 2, money: 1 },
			missing: { wood: 1, meat: 2, money: 1 },
			remaining: before
		});
		expect(state.snapshot.resources).toEqual(before);
	});
});

describe('ProximityTransferClock', () => {
	it('transfers immediately on entry and once per deterministic interval', () => {
		const transfer = vi.fn((_id: string) => true);
		const clock = new ProximityTransferClock(350);

		expect(clock.update('wood-station', 16, transfer)).toBe(true);
		expect(clock.update('wood-station', 334, transfer)).toBe(false);
		expect(clock.update('wood-station', 16, transfer)).toBe(true);
		expect(clock.update('wood-station', 1050, transfer)).toBe(true);
		expect(transfer).toHaveBeenCalledTimes(5);
	});

	it('resets on target changes and is safe after scene cleanup', () => {
		const transfer = vi.fn((_id: string) => true);
		const clock = new ProximityTransferClock();

		clock.update('wood-station', 0, transfer);
		clock.update(null, 5000, transfer);
		clock.update('meat-station', 0, transfer);
		clock.destroy();
		expect(clock.update('meat-station', 5000, transfer)).toBe(false);
		expect(transfer.mock.calls.map(([id]) => id)).toEqual([
			'wood-station',
			'meat-station'
		]);
	});

	it.each([0, -1, Number.NaN, Infinity])(
		'rejects invalid intervals: %s',
		(interval) => {
			expect(() => new ProximityTransferClock(interval)).toThrow(RangeError);
		}
	);
});
