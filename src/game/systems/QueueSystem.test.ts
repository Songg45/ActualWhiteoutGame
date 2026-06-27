import { describe, expect, it } from 'vitest';
import { QueueSystem } from './QueueSystem';

const slots = [
	{ x: 1, y: 1 },
	{ x: 2, y: 2 },
	{ x: 3, y: 3 }
] as const;
const spawn = { x: 0, y: 0 };
const service = { x: 4, y: 4 };

describe('QueueSystem', () => {
	it('keeps first-in queue order and reassigns slots deterministically', () => {
		const queue = new QueueSystem(slots, 3);

		queue.enqueue('customer-a', spawn, service, 100);
		queue.enqueue('customer-b', spawn, service, 200);
		queue.enqueue('customer-c', spawn, service, 300);

		expect(queue.snapshot.customers.map((customer) => customer.id)).toEqual([
			'customer-a',
			'customer-b',
			'customer-c'
		]);
		expect(queue.serveNext()?.id).toBe('customer-a');
		expect(queue.snapshot.customers.map((customer) => ({
			id: customer.id,
			slotIndex: customer.slotIndex,
			slotGrid: customer.slotGrid
		}))).toEqual([
			{ id: 'customer-b', slotIndex: 0, slotGrid: { x: 1, y: 1 } },
			{ id: 'customer-c', slotIndex: 1, slotGrid: { x: 2, y: 2 } }
		]);
	});

	it('bounds queue capacity without duplicating ids', () => {
		const queue = new QueueSystem(slots, 2);

		expect(queue.enqueue('customer-a', spawn, service, 0)?.id).toBe('customer-a');
		expect(queue.enqueue('customer-a', spawn, service, 1)).toBeUndefined();
		expect(queue.enqueue('customer-b', spawn, service, 2)?.id).toBe('customer-b');
		expect(queue.enqueue('customer-c', spawn, service, 3)).toBeUndefined();
		expect(queue.snapshot.customers.map((customer) => customer.id)).toEqual([
			'customer-a',
			'customer-b'
		]);
	});
});
