import { describe, expect, it, vi } from 'vitest';
import { EnemyModel } from '../combat/EnemyModel';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';
import { applyCombatDamage } from './CombatSystem';
import { grantDeathRewards } from './EnemyRewardSystem';

describe('EnemyRewardSystem', () => {
	it('grants bear death rewards to meat instead of making bear kills a cash source', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const resourceChanged = vi.fn();
		events.on('resource:changed', resourceChanged);
		const bear = new EnemyModel({
			id: 'bear',
			kind: 'bear',
			stats: {
				maxHp: 10,
				speed: 0,
				attackDamage: 0,
				rewards: [{ resource: 'meat', amount: 2 }]
			}
		});

		const result = applyCombatDamage(bear, 10, 'player');
		const rewards = result.killed ? grantDeathRewards(state, bear.rewards) : [];

		expect(rewards).toEqual([{ resource: 'meat', amount: 2, applied: 2 }]);
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 2, money: 0 });
		expect(resourceChanged).toHaveBeenCalledWith({
			resource: 'meat',
			value: 2,
			delta: 2
		});
	});

	it('does not duplicate rewards when already-dead enemies receive more damage', () => {
		const state = new GameState(new GameEventBus());
		const bear = new EnemyModel({
			id: 'bear',
			kind: 'bear',
			stats: {
				maxHp: 10,
				speed: 0,
				attackDamage: 0,
				rewards: [{ resource: 'meat', amount: 2 }]
			}
		});

		const first = applyCombatDamage(bear, 10, 'player');
		if (first.killed) {
			grantDeathRewards(state, bear.rewards);
		}
		const second = applyCombatDamage(bear, 10, 'player');
		if (second.killed) {
			grantDeathRewards(state, bear.rewards);
		}

		expect(first.killed).toBe(true);
		expect(second).toEqual({ applied: 0, killed: false });
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 2, money: 0 });
	});

	it('rejects invalid reward amounts before changing resources', () => {
		const state = new GameState(new GameEventBus());

		expect(() => grantDeathRewards(state, [
			{ resource: 'meat', amount: -1 }
		])).toThrow('Enemy reward amount must be a positive finite number.');
		expect(() => grantDeathRewards(state, [
			{ resource: 'meat', amount: Number.POSITIVE_INFINITY }
		])).toThrow('Enemy reward amount must be a positive finite number.');
		expect(state.snapshot.resources).toEqual({ wood: 0, meat: 0, money: 0 });
	});
});
