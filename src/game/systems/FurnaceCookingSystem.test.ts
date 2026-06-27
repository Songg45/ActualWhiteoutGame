import { describe, expect, it } from 'vitest';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';
import { FurnaceCookingSystem } from './FurnaceCookingSystem';

describe('FurnaceCookingSystem', () => {
	it('cooks raw meat into bounded prepared food over deterministic ticks', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('meat', 5);
		const furnace = new FurnaceCookingSystem(state, {
			capacity: 2,
			meatPerBatch: 1,
			foodPerBatch: 1,
			cookIntervalMs: 1000
		});

		expect(furnace.update(999)).toBe(0);
		expect(furnace.preparedFood).toBe(0);
		expect(furnace.update(1)).toBe(1);
		expect(furnace.update(3000)).toBe(1);

		expect(furnace.preparedFood).toBe(2);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 3, money: 0 });
		expect(furnace.update(1000)).toBe(0);
		expect(furnace.preparedFood).toBe(2);
		expect(state.snapshot.resources.meat).toBe(3);
	});

	it('does not mutate resources when raw meat is insufficient', () => {
		const state = new GameState(new GameEventBus());
		const furnace = new FurnaceCookingSystem(state, {
			capacity: 3,
			meatPerBatch: 2,
			foodPerBatch: 1,
			cookIntervalMs: 100
		});

		expect(furnace.update(500)).toBe(0);
		expect(furnace.preparedFood).toBe(0);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 0, money: 0 });
	});

	it('consumes prepared food without going negative', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('meat', 2);
		const furnace = new FurnaceCookingSystem(state, {
			capacity: 4,
			cookIntervalMs: 100
		});
		furnace.update(200);

		expect(furnace.consumePreparedFood(1)).toBe(1);
		expect(furnace.preparedFood).toBe(1);
		expect(furnace.consumePreparedFood(5)).toBe(1);
		expect(furnace.preparedFood).toBe(0);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 0, money: 0 });
	});

	it('can be disabled until the furnace is available in scene progression', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('meat', 1);
		const furnace = new FurnaceCookingSystem(state, {
			enabled: false,
			cookIntervalMs: 100
		});

		expect(furnace.update(500)).toBe(0);
		expect(furnace.preparedFood).toBe(0);
		furnace.setEnabled(true);
		expect(furnace.update(100)).toBe(1);
		expect(furnace.preparedFood).toBe(1);
		expect(state.snapshot.resources.meat).toBe(0);
	});
});
