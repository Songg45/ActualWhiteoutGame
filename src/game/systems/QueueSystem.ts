import type { GridPoint } from '../map/IsoMath';

export type QueueCustomerState = 'queued' | 'served' | 'left';

export interface QueueCustomer {
	readonly id: string;
	readonly spawnGrid: GridPoint;
	readonly serviceGrid: GridPoint;
	readonly slotGrid: GridPoint;
	readonly state: QueueCustomerState;
	readonly queuedAtMs: number;
	readonly slotIndex: number;
}

export interface QueueSnapshot {
	readonly customers: readonly QueueCustomer[];
	readonly capacity: number;
}

export class QueueSystem {
	private readonly customers: QueueCustomer[] = [];

	constructor(
		private readonly slotGrids: readonly GridPoint[],
		readonly capacity = slotGrids.length
	) {
		if (!Number.isSafeInteger(capacity) || capacity < 1) {
			throw new RangeError('Queue capacity must be a positive safe integer.');
		}
		if (slotGrids.length < capacity) {
			throw new RangeError('Queue needs at least one slot grid for each capacity unit.');
		}
	}

	get length(): number {
		return this.customers.length;
	}

	get isFull(): boolean {
		return this.customers.length >= this.capacity;
	}

	get snapshot(): QueueSnapshot {
		return {
			capacity: this.capacity,
			customers: this.customers.map((customer) => ({ ...customer }))
		};
	}

	enqueue(
		id: string,
		spawnGrid: GridPoint,
		serviceGrid: GridPoint,
		queuedAtMs: number
	): QueueCustomer | undefined {
		const normalizedId = id.trim();
		if (!normalizedId) {
			throw new Error('Queue customer id cannot be empty.');
		}
		if (!Number.isFinite(queuedAtMs)) {
			throw new RangeError('Customer queued time must be finite.');
		}
		if (this.isFull || this.customers.some((customer) => customer.id === normalizedId)) {
			return undefined;
		}
		const slotIndex = this.customers.length;
		const customer: QueueCustomer = {
			id: normalizedId,
			spawnGrid: { ...spawnGrid },
			serviceGrid: { ...serviceGrid },
			slotGrid: { ...this.slotGrids[slotIndex] },
			state: 'queued',
			queuedAtMs,
			slotIndex
		};
		this.customers.push(customer);
		return { ...customer };
	}

	peek(): QueueCustomer | undefined {
		const customer = this.customers[0];
		return customer ? { ...customer } : undefined;
	}

	serveNext(): QueueCustomer | undefined {
		const served = this.customers.shift();
		if (!served) {
			return undefined;
		}
		this.reassignSlots();
		return { ...served, state: 'served' };
	}

	remove(id: string): QueueCustomer | undefined {
		const index = this.customers.findIndex((customer) => customer.id === id);
		if (index < 0) {
			return undefined;
		}
		const [removed] = this.customers.splice(index, 1);
		this.reassignSlots();
		return { ...removed, state: 'left' };
	}

	clear(): void {
		this.customers.length = 0;
	}

	private reassignSlots(): void {
		for (let index = 0; index < this.customers.length; index += 1) {
			const current = this.customers[index];
			this.customers[index] = {
				...current,
				slotIndex: index,
				slotGrid: { ...this.slotGrids[index] }
			};
		}
	}
}
