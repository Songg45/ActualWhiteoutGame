import type { DeathReward } from '../combat/CombatTypes';
import type { GameState } from '../state/GameState';

export interface AppliedDeathReward extends DeathReward {
	applied: number;
}

export function grantDeathRewards(
	state: GameState,
	rewards: readonly DeathReward[]
): AppliedDeathReward[] {
	const appliedRewards: AppliedDeathReward[] = [];

	for (const reward of rewards) {
		if (!Number.isFinite(reward.amount) || reward.amount <= 0) {
			throw new RangeError('Enemy reward amount must be a positive finite number.');
		}
		const applied = state.changeResource(reward.resource, reward.amount);
		if (applied > 0) {
			appliedRewards.push({
				...reward,
				applied
			});
		}
	}

	return appliedRewards;
}
