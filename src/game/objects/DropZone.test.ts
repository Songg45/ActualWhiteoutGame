import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		GameObjects: {
			Container: class {}
		}
	}
}));

import { GameEventBus } from '../events/GameEvents';
import { GameState, type ResourceType } from '../state/GameState';
import {
	transferAtDropZone,
	type CarryPort,
	type DropZoneDefinition
} from './DropZone';

class TestCarry implements CarryPort {
	private readonly counts: Record<ResourceType, number>;

	constructor(counts: Partial<Record<ResourceType, number>>) {
		this.counts = { wood: 0, meat: 0, money: 0, ...counts };
	}

	get carrySnapshot(): Readonly<Record<ResourceType, number>> {
		return { ...this.counts };
	}

	removeCarry(type: ResourceType, amount: number): number {
		const removed = Math.min(this.counts[type], amount);
		this.counts[type] -= removed;
		return removed;
	}

	addCarry(type: ResourceType, amount: number): number {
		this.counts[type] += amount;
		return amount;
	}
}

function zone(overrides: Partial<DropZoneDefinition> = {}): DropZoneDefinition {
	return {
		id: 'test-zone',
		label: 'Test',
		mode: 'deposit',
		grid: { x: 0, y: 0 },
		accepted: ['wood', 'meat'],
		maxUnitsPerTick: 3,
		...overrides
	};
}

describe('drop-zone transfers', () => {
	it('partially deposits mixed carry while leaving the remainder intact', () => {
		const events = new GameEventBus();
		const transfers = vi.fn();
		events.on('economy:transfer', transfers);
		const state = new GameState(events);
		const carry = new TestCarry({ wood: 2, meat: 3 });

		const result = transferAtDropZone(zone(), carry, state, events);

		expect(result.removed).toEqual({ wood: 2, meat: 1, money: 0 });
		expect(result.credited).toEqual({ wood: 2, meat: 1, money: 0 });
		expect(carry.carrySnapshot).toEqual({ wood: 0, meat: 2, money: 0 });
		expect(state.snapshot.resources).toEqual({ wood: 2, meat: 1, money: 0 });
		expect(transfers).toHaveBeenCalledTimes(2);
	});

	it('converts mixed resources with transparent rates and emits money changes', () => {
		const events = new GameEventBus();
		const resourceChanges = vi.fn();
		events.on('resource:changed', resourceChanges);
		const state = new GameState(events);
		const carry = new TestCarry({ wood: 1, meat: 1 });

		const result = transferAtDropZone(zone({
			mode: 'convert',
			accepted: ['meat', 'wood'],
			maxUnitsPerTick: 2,
			conversionRates: { wood: 2, meat: 3 }
		}), carry, state, events);

		expect(result.credited.money).toBe(5);
		expect(state.snapshot.resources.money).toBe(5);
		expect(carry.carrySnapshot).toEqual({ wood: 0, meat: 0, money: 0 });
		expect(resourceChanges.mock.calls.map(([payload]) => payload.delta)).toEqual([3, 2]);
	});

	it('does nothing when inventory is empty and rejects invalid balance data', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const carry = new TestCarry({});

		expect(transferAtDropZone(zone(), carry, state, events).removed)
			.toEqual({ wood: 0, meat: 0, money: 0 });
		expect(() => transferAtDropZone(zone({
			maxUnitsPerTick: Number.NaN
		}), carry, state, events)).toThrow(RangeError);

		const stockedCarry = new TestCarry({ wood: 1 });
		expect(() => transferAtDropZone(zone({
			mode: 'convert',
			conversionRates: { wood: Infinity }
		}), stockedCarry, state, events)).toThrow(RangeError);
		expect(stockedCarry.carrySnapshot.wood).toBe(1);
	});
});
