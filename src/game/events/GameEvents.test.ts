import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from './GameEvents';

describe('GameEventBus', () => {
	it('returns an unsubscribe function that stops future notifications', () => {
		const events = new GameEventBus();
		const listener = vi.fn();
		const unsubscribe = events.on('wave:changed', listener);

		events.emit('wave:changed', { wave: 1 });
		unsubscribe();
		events.emit('wave:changed', { wave: 2 });

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({ wave: 1 });
	});

	it('runs once listeners only for the first matching event', () => {
		const events = new GameEventBus();
		const listener = vi.fn();

		events.once('building:unlocked', listener);
		events.emit('building:unlocked', { buildingId: 'furnace' });
		events.emit('building:unlocked', { buildingId: 'turret' });

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith({ buildingId: 'furnace' });
	});
});
