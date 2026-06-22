import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from './GameState';

describe('GameState', () => {
	it('clamps resource underflow and only spends available resources', () => {
		const state = new GameState(new GameEventBus());

		expect(state.changeResource('wood', 5)).toBe(5);
		expect(state.spendResource('wood', 7)).toBe(false);
		expect(state.snapshot.resources.wood).toBe(5);
		expect(state.spendResource('wood', 3)).toBe(true);
		expect(state.changeResource('wood', -10)).toBe(-2);
		expect(state.snapshot.resources.wood).toBe(0);
	});

	it('rejects invalid resource amounts and wave values', () => {
		const state = new GameState(new GameEventBus());

		expect(() => state.changeResource('meat', Number.NaN)).toThrow(TypeError);
		expect(() => state.spendResource('money', -1)).toThrow(RangeError);
		expect(() => state.setWave(-1)).toThrow(RangeError);
		expect(() => state.setWave(1.5)).toThrow(RangeError);
	});

	it('unlocks normalized building ids once', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const listener = vi.fn();
		events.on('building:unlocked', listener);

		expect(state.unlockBuilding('  furnace  ')).toBe(true);
		expect(state.unlockBuilding('furnace')).toBe(false);
		expect(state.snapshot.unlockedBuildings).toEqual(['furnace']);
		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith({ buildingId: 'furnace' });
	});

	it('emits field changes before one final reset snapshot', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const notifications: string[] = [];
		const resourceListener = vi.fn((event: { resource: string; value: number; delta: number }) => {
			notifications.push(`resource:${event.resource}`);
		});
		const waveListener = vi.fn(() => notifications.push('wave'));
		const stateListener = vi.fn(() => notifications.push('state'));

		state.changeResource('wood', 4);
		state.changeResource('money', 9);
		state.setWave(3);
		state.unlockBuilding('furnace');
		events.on('resource:changed', resourceListener);
		events.on('wave:changed', waveListener);
		events.on('state:changed', stateListener);

		state.reset();

		expect(resourceListener.mock.calls).toEqual([
			[{ resource: 'wood', value: 0, delta: -4 }],
			[{ resource: 'money', value: 0, delta: -9 }]
		]);
		expect(waveListener).toHaveBeenCalledWith({ wave: 0 });
		expect(stateListener).toHaveBeenCalledOnce();
		expect(stateListener).toHaveBeenCalledWith({
			resources: { wood: 0, meat: 0, money: 0 },
			unlockedBuildings: [],
			wave: 0
		});
		expect(notifications).toEqual(['resource:wood', 'resource:money', 'wave', 'state']);
	});
});
