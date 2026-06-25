import { describe, expect, it } from 'vitest';
import { GameEventBus } from '../events/GameEvents';
import { GameState } from '../state/GameState';

function unlockSequence(state: GameState, completed: 'furnace' | 'turret' | 'trap'): void {
	if (completed === 'furnace') {
		state.unlockBuilding('furnace');
		state.unlockBuilding('turret');
		state.unlockBuilding('trap');
		return;
	}
	state.unlockBuilding('worker-hut');
}

describe('progression unlock sequence contract', () => {
	it('emits furnace first, then defense unlocks, then worker hut hook', () => {
		const events = new GameEventBus();
		const state = new GameState(events);
		const emitted: string[] = [];
		events.on('building:unlocked', ({ buildingId }) => emitted.push(buildingId));

		state.unlockBuilding('furnace');
		unlockSequence(state, 'furnace');
		unlockSequence(state, 'turret');

		expect(emitted).toEqual(['furnace', 'turret', 'trap', 'worker-hut']);
		expect(state.snapshot.unlockedBuildings).toEqual([
			'furnace',
			'turret',
			'trap',
			'worker-hut'
		]);
	});

	it('clears unlocks on restart reset', () => {
		const state = new GameState(new GameEventBus());
		state.unlockBuilding('furnace');
		state.unlockBuilding('turret');

		state.reset();

		expect(state.snapshot.unlockedBuildings).toEqual([]);
	});
});
