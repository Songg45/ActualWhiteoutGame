import type { ResourceBalances, ResourceType } from '../state/GameState';
import {
	RESOURCE_TYPES,
	emptyResourceBalances,
	normalizeResourceAmount,
	type ResourceAmounts
} from './ResourceTypes';

export interface ResourceTransferResult {
	resource: ResourceType;
	requested: number;
	transferred: number;
	remainder: number;
}

export class ResourceStore {
	private readonly counts: ResourceBalances;
	private readonly capacities: ResourceBalances;

	constructor(
		initial: ResourceAmounts = {},
		capacities: ResourceAmounts = {
			wood: Number.MAX_SAFE_INTEGER,
			meat: Number.MAX_SAFE_INTEGER,
			money: Number.MAX_SAFE_INTEGER
		},
		private readonly onChange?: (
			resource: ResourceType,
			value: number,
			delta: number
		) => void
	) {
		this.counts = emptyResourceBalances();
		this.capacities = emptyResourceBalances();

		for (const resource of RESOURCE_TYPES) {
			const capacity = normalizeResourceAmount(
				capacities[resource] ?? 0,
				`${resource} capacity`
			);
			const value = normalizeResourceAmount(initial[resource] ?? 0);
			if (value > capacity) {
				throw new RangeError(`${resource} initial value exceeds capacity.`);
			}
			this.capacities[resource] = capacity;
			this.counts[resource] = value;
		}
	}

	get snapshot(): Readonly<ResourceBalances> {
		return { ...this.counts };
	}

	get(resource: ResourceType): number {
		return this.counts[resource];
	}

	capacity(resource: ResourceType): number {
		return this.capacities[resource];
	}

	availableCapacity(resource: ResourceType): number {
		return this.capacities[resource] - this.counts[resource];
	}

	add(resource: ResourceType, requested: number): number {
		const amount = normalizeResourceAmount(requested);
		const accepted = Math.min(amount, this.availableCapacity(resource));
		this.change(resource, accepted);
		return accepted;
	}

	remove(resource: ResourceType, requested: number): number {
		const amount = normalizeResourceAmount(requested);
		const removed = Math.min(amount, this.counts[resource]);
		this.change(resource, -removed);
		return removed;
	}

	transferTo(
		target: ResourceStore,
		resource: ResourceType,
		requested: number
	): ResourceTransferResult {
		const amount = normalizeResourceAmount(requested);
		const transferable = Math.min(
			amount,
			this.get(resource),
			target.availableCapacity(resource)
		);
		if (transferable > 0) {
			this.change(resource, -transferable);
			target.change(resource, transferable);
		}
		return {
			resource,
			requested: amount,
			transferred: transferable,
			remainder: amount - transferable
		};
	}

	private change(resource: ResourceType, delta: number): void {
		if (delta === 0) {
			return;
		}
		this.counts[resource] += delta;
		this.onChange?.(resource, this.counts[resource], delta);
	}
}
