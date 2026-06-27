import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';
import { CustomerSalesSystem } from './CustomerSalesSystem';

const slots = [
	{ x: 1, y: 1 },
	{ x: 2, y: 2 }
] as const;
const spawn = { x: 0, y: 0 };
const service = { x: 3, y: 3 };

describe('CustomerSalesSystem', () => {
	it('does not serve or mutate resources without available food', () => {
		const state = new GameState(new GameEventBus());
		const system = new CustomerSalesSystem(state, slots, {
			foodPerSale: 1,
			moneyPerSale: 6
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);

		expect(system.tryServeNext()).toEqual({
			status: 'insufficient-food',
			customer: expect.objectContaining({ id: 'customer-a' }),
			consumedMeat: 0,
			paidMoney: 0
		});
		expect(system.queue.peek()?.id).toBe('customer-a');
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 0, money: 0 });
	});

	it('serves the head customer, consumes bounded meat, and pays money', () => {
		const events = new GameEventBus();
		const resourceChanges = vi.fn();
		events.on('resource:changed', resourceChanges);
		const state = new GameState(events);
		state.changeResource('meat', 2);
		resourceChanges.mockClear();
		const system = new CustomerSalesSystem(state, slots, {
			foodPerSale: 1,
			moneyPerSale: 6
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);
		system.enqueueCustomer('customer-b', spawn, service, 1);

		expect(system.tryServeNext()).toEqual({
			status: 'served',
			customer: expect.objectContaining({ id: 'customer-a', state: 'served' }),
			consumedMeat: 1,
			paidMoney: 6
		});
		expect(system.queue.peek()?.id).toBe('customer-b');
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 1, money: 6 });
		expect(resourceChanges.mock.calls.map(([event]) => ({
			resource: event.resource,
			delta: event.delta,
			value: event.value
		}))).toEqual([
			{ resource: 'meat', delta: -1, value: 1 },
			{ resource: 'money', delta: 6, value: 6 }
		]);
	});

	it('keeps totals finite and non-negative over repeated attempted sales', () => {
		const state = new GameState(new GameEventBus());
		const system = new CustomerSalesSystem(state, slots, {
			foodPerSale: 1,
			moneyPerSale: 5
		});
		state.changeResource('meat', 1);
		system.enqueueCustomer('customer-a', spawn, service, 0);
		system.enqueueCustomer('customer-b', spawn, service, 1);

		expect(system.tryServeNext().status).toBe('served');
		expect(system.tryServeNext().status).toBe('insufficient-food');
		expect(Object.values(state.snapshot.resources).every((value) => (
			Number.isFinite(value) && value >= 0
		))).toBe(true);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 0, money: 5 });
	});
});
