import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';
import { CustomerSalesSystem } from './CustomerSalesSystem';
import type { PreparedFoodInventory } from './FurnaceCookingSystem';

const slots = [
	{ x: 1, y: 1 },
	{ x: 2, y: 2 }
] as const;
const spawn = { x: 0, y: 0 };
const service = { x: 3, y: 3 };

class TestPreparedFood implements PreparedFoodInventory {
	constructor(private food: number) {}

	get preparedFood(): number {
		return this.food;
	}

	consumePreparedFood(amount: number): number {
		const consumed = Math.min(amount, this.food);
		this.food -= consumed;
		return consumed;
	}
}

describe('CustomerSalesSystem', () => {
	it('does not serve or mutate resources without available food', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('meat', 2);
		const preparedFood = new TestPreparedFood(0);
		const system = new CustomerSalesSystem(state, preparedFood, slots, {
			foodPerSale: 1,
			moneyPerSale: 6
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);

		expect(system.tryServeNext()).toEqual({
			status: 'insufficient-food',
			customer: expect.objectContaining({ id: 'customer-a' }),
			consumedPreparedFood: 0,
			paidMoney: 0
		});
		expect(system.queue.peek()?.id).toBe('customer-a');
		expect(preparedFood.preparedFood).toBe(0);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 2, money: 0 });
	});

	it('serves the head customer, consumes bounded prepared food, and pays money', () => {
		const events = new GameEventBus();
		const resourceChanges = vi.fn();
		events.on('resource:changed', resourceChanges);
		const state = new GameState(events);
		state.changeResource('meat', 2);
		resourceChanges.mockClear();
		const preparedFood = new TestPreparedFood(2);
		const system = new CustomerSalesSystem(state, preparedFood, slots, {
			foodPerSale: 1,
			moneyPerSale: 6
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);
		system.enqueueCustomer('customer-b', spawn, service, 1);

		expect(system.tryServeNext()).toEqual({
			status: 'served',
			customer: expect.objectContaining({ id: 'customer-a', state: 'served' }),
			consumedPreparedFood: 1,
			paidMoney: 6
		});
		expect(system.queue.peek()?.id).toBe('customer-b');
		expect(preparedFood.preparedFood).toBe(1);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 2, money: 6 });
		expect(resourceChanges.mock.calls.map(([event]) => ({
			resource: event.resource,
			delta: event.delta,
			value: event.value
		}))).toEqual([{ resource: 'money', delta: 6, value: 6 }]);
	});

	it('does not duplicate payment or lose extra food when a money listener throws', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const preparedFood = new TestPreparedFood(2);
		const system = new CustomerSalesSystem(state, preparedFood, slots, {
			foodPerSale: 1,
			moneyPerSale: 6
		});
		events.on('resource:changed', (event) => {
			if (event.resource === 'money') {
				throw new Error('subscriber failed after money mutation');
			}
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);

		expect(system.tryServeNext()).toEqual({
			status: 'served',
			customer: expect.objectContaining({ id: 'customer-a', state: 'served' }),
			consumedPreparedFood: 1,
			paidMoney: 6
		});
		expect(system.queue.peek()).toBeUndefined();
		expect(preparedFood.preparedFood).toBe(1);
		expect(state.snapshot.resources.money).toBe(6);
		expect(system.tryServeNext()).toEqual({
			status: 'empty-queue',
			consumedPreparedFood: 0,
			paidMoney: 0
		});
		expect(preparedFood.preparedFood).toBe(1);
		expect(state.snapshot.resources.money).toBe(6);
	});

	it('keeps totals finite and non-negative over repeated attempted sales', () => {
		const state = new GameState(new GameEventBus());
		state.changeResource('meat', 1);
		const preparedFood = new TestPreparedFood(1);
		const system = new CustomerSalesSystem(state, preparedFood, slots, {
			foodPerSale: 1,
			moneyPerSale: 5
		});
		system.enqueueCustomer('customer-a', spawn, service, 0);
		system.enqueueCustomer('customer-b', spawn, service, 1);

		expect(system.tryServeNext().status).toBe('served');
		expect(system.tryServeNext().status).toBe('insufficient-food');
		expect(preparedFood.preparedFood).toBe(0);
		expect(Object.values(state.snapshot.resources).every((value) => (
			Number.isFinite(value) && value >= 0
		))).toBe(true);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 1, money: 5 });
	});
});
