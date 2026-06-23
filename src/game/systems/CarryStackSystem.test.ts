import { describe, expect, it, vi } from 'vitest';
import { CarryInventory, CarryStackSystem } from './CarryStackSystem';

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

	it('returns zero at full capacity and for zero requests', () => {
		const inventory = new CarryInventory({ wood: 1, meat: 2, money: 3 });

		expect(inventory.add('wood', 1)).toBe(1);
		expect(inventory.add('wood', 1)).toBe(0);
		expect(inventory.add('meat', 0)).toBe(0);
		expect(inventory.remove('wood', 0)).toBe(0);
		expect(inventory.snapshot).toEqual({ wood: 1, meat: 0, money: 0 });
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

	it.each([Number.NaN, Infinity, -Infinity])(
		'rejects non-finite amount %s without corrupting counts',
		(amount) => {
			const inventory = new CarryInventory();
			inventory.add('wood', 2);

			expect(() => inventory.add('wood', amount)).toThrow(RangeError);
			expect(() => inventory.remove('wood', amount)).toThrow(RangeError);
			expect(inventory.snapshot).toEqual({ wood: 2, meat: 0, money: 0 });
			expect(inventory.total).toBe(2);
		}
	);

	it.each([
		{ wood: -1, meat: 2, money: 3 },
		{ wood: Number.NaN, meat: 2, money: 3 },
		{ wood: Infinity, meat: 2, money: 3 },
		{ wood: 1.5, meat: 2, money: 3 }
	])('rejects invalid custom limits', (limits) => {
		expect(() => new CarryInventory(limits)).toThrow(RangeError);
	});

	it('publishes one canonical change path for clear and mixed-resource reuse', () => {
		const onChange = vi.fn();
		const inventory = new CarryInventory(undefined, onChange);

		inventory.add('wood', 2);
		inventory.add('meat', 1);
		inventory.clear();
		inventory.add('money', 3);

		expect(onChange.mock.calls.map(([snapshot]) => snapshot)).toEqual([
			{ wood: 2, meat: 0, money: 0 },
			{ wood: 2, meat: 1, money: 0 },
			{ wood: 0, meat: 0, money: 0 },
			{ wood: 0, meat: 0, money: 3 }
		]);
		expect(inventory.snapshot).toEqual({ wood: 0, meat: 0, money: 3 });
	});

	it('clears stale visual items and supports mixed-resource reuse', () => {
		const children: unknown[] = [];
		const view = {
			add: (item: unknown) => children.push(item),
			removeAll: () => {
				children.length = 0;
			}
		};
		const createVisual = () => ({
			setPosition() {
				return this;
			},
			setStrokeStyle() {
				return this;
			}
		});
		const scene = {
			add: {
				container: () => view,
				rectangle: createVisual
			},
			textures: {
				exists: () => false
			}
		};
		const parent = { add: vi.fn() };
		const carry = new CarryStackSystem(scene as never, parent as never);

		carry.add('wood', 2);
		carry.add('meat', 1);
		expect(children).toHaveLength(3);

		carry.clear();
		expect(carry.snapshot).toEqual({ wood: 0, meat: 0, money: 0 });
		expect(children).toHaveLength(0);

		carry.add('money', 2);
		expect(carry.snapshot).toEqual({ wood: 0, meat: 0, money: 2 });
		expect(children).toHaveLength(2);
	});
});
