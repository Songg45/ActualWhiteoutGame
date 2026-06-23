import { describe, expect, it } from 'vitest';
import { CarryInventory } from './CarryStackSystem';

describe('carry inventory', () => {
	it('tracks typed resources independently', () => {
		const inventory = new CarryInventory();

		expect(inventory.add('wood', 3)).toBe(3);
		expect(inventory.add('meat', 2)).toBe(2);
		expect(inventory.snapshot).toEqual({ wood: 3, meat: 2, money: 0 });
		expect(inventory.total).toBe(5);
	});

	it('caps additions at each resource limit', () => {
		const inventory = new CarryInventory({ wood: 4, meat: 2, money: 3 });

		expect(inventory.add('wood', 9)).toBe(4);
		expect(inventory.add('wood', 1)).toBe(0);
		expect(inventory.snapshot.wood).toBe(4);
	});

	it('never removes more than the carried amount', () => {
		const inventory = new CarryInventory();
		inventory.add('money', 6);

		expect(inventory.remove('money', 10)).toBe(6);
		expect(inventory.snapshot.money).toBe(0);
	});

	it('normalizes fractional and negative transfer requests', () => {
		const inventory = new CarryInventory();

		expect(inventory.add('meat', 2.9)).toBe(2);
		expect(inventory.add('meat', -4)).toBe(0);
		expect(inventory.remove('meat', 1.9)).toBe(1);
	});
});
