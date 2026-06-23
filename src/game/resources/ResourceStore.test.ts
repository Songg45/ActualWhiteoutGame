import { describe, expect, it, vi } from 'vitest';
import { ResourceStore } from './ResourceStore';

describe('ResourceStore', () => {
	it('transfers partially without duplication or negative values', () => {
		const source = new ResourceStore({ wood: 7 }, { wood: 10 });
		const target = new ResourceStore({ wood: 3 }, { wood: 5 });

		expect(source.transferTo(target, 'wood', 6)).toEqual({
			resource: 'wood',
			requested: 6,
			transferred: 2,
			remainder: 4
		});
		expect(source.get('wood')).toBe(5);
		expect(target.get('wood')).toBe(5);
		expect(source.get('wood') + target.get('wood')).toBe(10);
	});

	it('tracks mixed resources independently and reports exact changes', () => {
		const onChange = vi.fn();
		const store = new ResourceStore(
			{ wood: 1, meat: 2 },
			{ wood: 3, meat: 4, money: 5 },
			onChange
		);

		expect(store.add('wood', 5)).toBe(2);
		expect(store.remove('meat', 9)).toBe(2);
		expect(store.snapshot).toEqual({ wood: 3, meat: 0, money: 0 });
		expect(onChange.mock.calls).toEqual([
			['wood', 3, 2],
			['meat', 0, -2]
		]);
	});

	it.each([Number.NaN, Infinity, -1, 1.5])(
		'rejects invalid amounts without changing state: %s',
		(amount) => {
			const store = new ResourceStore({ wood: 2 }, { wood: 4 });
			expect(() => store.add('wood', amount)).toThrow(RangeError);
			expect(() => store.remove('wood', amount)).toThrow(RangeError);
			expect(store.get('wood')).toBe(2);
		}
	);

	it('rejects invalid initial values and capacities', () => {
		expect(() => new ResourceStore({ wood: 2 }, { wood: 1 })).toThrow(RangeError);
		expect(() => new ResourceStore({}, { meat: Number.NaN })).toThrow(RangeError);
	});
});
