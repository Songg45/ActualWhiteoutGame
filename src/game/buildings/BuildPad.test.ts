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
import { spendResources } from '../systems/EconomySystem';
import type { CarryPort } from '../objects/DropZone';
import { BuildPadModel } from './BuildPad';
import {
	BUILDING_DEFINITIONS,
	assertValidBuildingDefinitions,
	getBuildingDefinition,
	type BuildingId
} from './BuildingTypes';

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

function pad(id: BuildingId, locked = false): BuildPadModel {
	return new BuildPadModel(getBuildingDefinition(id), locked);
}

describe('building definitions', () => {
	it('rejects non-finite, duplicate, or negative build data', () => {
		expect(() => assertValidBuildingDefinitions()).not.toThrow();
		expect(BUILDING_DEFINITIONS.every((definition) => (
			Number.isFinite(definition.constructionMs)
			&& definition.constructionMs > 0
			&& Object.values(definition.cost).every((value) => Number.isSafeInteger(value) && value >= 0)
		))).toBe(true);
	});
});

describe('BuildPadModel', () => {
	it('moves deterministically through funding and construction states', () => {
		const model = pad('furnace');
		const carry = new TestCarry({ wood: 8, meat: 2, money: 6 });

		expect(model.snapshot.state).toBe('available');
		expect(model.fundFromCarry(carry, 3).accepted).toEqual({ wood: 3, meat: 0, money: 0 });
		expect(model.snapshot.state).toBe('partially-funded');
		model.fundFromCarry(carry, 20);
		expect(model.snapshot.state).toBe('constructing');
		expect(model.update(2499)).toBeNull();
		const completed = model.update(10);
		expect(completed?.id).toBe('furnace');
		expect(model.snapshot.state).toBe('complete');
		expect(model.update(10)).toBeNull();
	});

	it('partially deposits carry without losing rejected resources', () => {
		const model = pad('trap');
		const carry = new TestCarry({ wood: 10, meat: 5, money: 8 });

		const first = model.fundFromCarry(carry, 4);
		const second = model.fundFromCarry(carry, 20);

		expect(first.accepted).toEqual({ wood: 4, meat: 0, money: 0 });
		expect(second.accepted).toEqual({ wood: 2, meat: 2, money: 8 });
		expect(carry.carrySnapshot).toEqual({ wood: 4, meat: 3, money: 0 });
		expect(model.snapshot.state).toBe('constructing');
	});

	it('rejects funds while locked', () => {
		const model = pad('turret', true);
		const carry = new TestCarry({ wood: 12, money: 12 });

		expect(model.fundFromCarry(carry, 20).accepted).toEqual({ wood: 0, meat: 0, money: 0 });
		expect(carry.carrySnapshot).toEqual({ wood: 12, meat: 0, money: 12 });
		expect(model.snapshot.state).toBe('locked');
		expect(model.setLocked(false)).toBe(true);
		expect(model.snapshot.state).toBe('available');
	});

	it('uses atomic direct storage spend for the remaining cost', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		state.changeResource('wood', 20);
		state.changeResource('meat', 10);
		state.changeResource('money', 20);
		const model = pad('furnace');
		model.fundFromCarry(new TestCarry({ wood: 5 }), 5);

		const result = model.fundFromStorage((cost) => spendResources(state, cost));

		expect(result.spend?.ok).toBe(true);
		expect(result.accepted).toEqual({ wood: 3, meat: 2, money: 6 });
		expect(state.snapshot.resources).toEqual({ wood: 17, meat: 8, money: 14 });
		expect(model.snapshot.state).toBe('constructing');
	});

	it('does not mutate pad progress when direct storage spend is unaffordable', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('wood', 2);
		const model = pad('turret');
		const before = model.snapshot;

		const result = model.fundFromStorage((cost) => spendResources(state, cost));

		expect(result.spend?.ok).toBe(false);
		expect(model.snapshot.funded).toEqual(before.funded);
		expect(state.snapshot.resources).toEqual({ wood: 2, meat: 0, money: 0 });
	});

	it('rejects invalid funding and timer values', () => {
		const model = pad('furnace');

		expect(() => model.fundFromCarry(new TestCarry({ wood: 1 }), Number.NaN)).toThrow(RangeError);
		expect(() => model.update(-1)).toThrow(RangeError);
		expect(() => model.update(Infinity)).toThrow(RangeError);
	});
});
