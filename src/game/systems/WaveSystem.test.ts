import { describe, expect, it } from 'vitest';
import { MapRuntime } from '../map/MapRuntime';
import { camp01Recipe } from '../map/recipes/camp01';
import { WaveSystem } from './WaveSystem';

describe('WaveSystem', () => {
	it('reads camp01 enemy anchors and lanes into immutable lane plans', () => {
		const runtime = new MapRuntime(camp01Recipe);
		const waves = new WaveSystem(runtime);
		const lanes = waves.getSpawnLanes();

		expect(lanes.map((lane) => lane.laneId)).toEqual(['east-breach', 'north-breach']);
		expect(lanes.map((lane) => lane.spawnAnchorId)).toEqual([
			'enemy-spawn-east',
			'enemy-spawn-north'
		]);
		expect(lanes[0].points[0]).toEqual({ x: 14, y: 6.5 });

		lanes[0].points[0].x = 999;
		expect(waves.getSpawnLanes()[0].points[0]).toEqual({ x: 14, y: 6.5 });
	});

	it('creates deterministic spawn plans without marker ids', () => {
		const runtime = new MapRuntime(camp01Recipe);
		const waves = new WaveSystem(runtime, {
			baseCount: 2,
			countPerWave: 1,
			spawnIntervalMs: 500,
			baseHp: 20,
			hpPerWave: 5,
			baseSpeed: 60,
			attackDamage: 4
		});

		const plan = waves.createSpawnPlan(2);

		expect(plan.wave).toBe(2);
		expect(plan.entries).toHaveLength(3);
		expect(plan.entries.map((entry) => entry.laneId)).toEqual([
			'north-breach',
			'east-breach',
			'north-breach'
		]);
		expect(plan.entries.map((entry) => entry.delayMs)).toEqual([0, 500, 1000]);
		expect(plan.entries[0].spawnGrid).toEqual({ x: 6.5, y: 0 });
		expect(plan.entries[0].path).toEqual([
			{ x: 6.5, y: 0 },
			{ x: 6.5, y: 1.5 },
			{ x: 6.5, y: 3 },
			{ x: 6.5, y: 5 }
		]);
		expect(plan.entries[0].enemy).toEqual({
			id: 'wave-2-enemy-1',
			kind: 'bear',
			stats: {
				maxHp: 25,
				speed: 60,
				attackDamage: 4,
				rewards: [{ resource: 'meat', amount: 2 }]
			}
		});
	});

	it('rejects invalid wave numbers', () => {
		const waves = new WaveSystem(new MapRuntime(camp01Recipe));

		expect(() => waves.createSpawnPlan(0)).toThrow(
			'Wave must be a positive integer.'
		);
		expect(() => waves.createSpawnPlan(1.5)).toThrow(
			'Wave must be a positive integer.'
		);
	});
});
