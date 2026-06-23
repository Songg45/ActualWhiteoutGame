import type { ResourceBalances, ResourceType } from '../state/GameState';

export type ResourceAmounts = Partial<Record<ResourceType, number>>;
export type ResourceCost = Readonly<ResourceAmounts>;

export const RESOURCE_TYPES = ['wood', 'meat', 'money'] as const satisfies readonly ResourceType[];

export function emptyResourceBalances(): ResourceBalances {
	return { wood: 0, meat: 0, money: 0 };
}

export function normalizeResourceAmount(amount: number, label = 'Resource amount'): number {
	if (!Number.isSafeInteger(amount) || amount < 0) {
		throw new RangeError(`${label} must be a non-negative finite integer.`);
	}
	return amount;
}

export function normalizeResourceCost(cost: ResourceCost): ResourceBalances {
	const normalized = emptyResourceBalances();
	for (const resource of RESOURCE_TYPES) {
		normalized[resource] = normalizeResourceAmount(
			cost[resource] ?? 0,
			`${resource} cost`
		);
	}
	return normalized;
}
