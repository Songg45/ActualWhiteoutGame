import { describe, expect, it } from 'vitest';
import { createMapData, getBlockedGridKeys, gridKey } from './MapData';
import { camp01Recipe } from './recipes/camp01';

describe('snowy camp map data', () => {
	const map = createMapData();

	it('is generated from the camp-01 recipe', () => {
		expect(camp01Recipe.id).toBe('camp-01');
		expect(camp01Recipe.anchors.map((anchor) => anchor.kind)).toEqual([
			'furnace',
			'wood',
			'food',
			'storage',
			'exchange',
			'defense-slot',
			'defense-slot',
			'worker-hut',
			'enemy-spawn',
			'enemy-spawn',
			'npc-spawn'
		]);
	});

	it('covers the declared map dimensions with terrain', () => {
		expect(map.width).toBe(14);
		expect(map.height).toBe(14);
		expect(map.terrain).toHaveLength(map.width * map.height);
		expect(map.terrain.filter((tile) => tile.kind === 'camp')).toHaveLength(64);
	});

	it('uses stable unique IDs for interactive and environment definitions', () => {
		const ids = [
			...map.environment.map((object) => object.id),
			...map.markers.map((marker) => marker.id),
			...map.spawnLanes.map((lane) => lane.id)
		];

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('keeps gates and trees open while fences and rocks block movement', () => {
		const blocked = getBlockedGridKeys(map);
		const tree = map.environment.find((object) => object.id === 'tree-0');
		const rock = map.environment.find((object) => object.id === 'rock-0');

		expect(blocked.has(gridKey({ x: 3, y: 3 }))).toBe(true);
		expect(blocked.has(gridKey({ x: 0, y: 1 }))).toBe(false);
		expect(blocked.has(gridKey({ x: 2, y: 3 }))).toBe(true);
		expect(blocked.has(gridKey({ x: 6.5, y: 3 }))).toBe(false);
		expect(blocked.has(gridKey({ x: 10, y: 6.5 }))).toBe(false);
		expect(blocked.has(gridKey({ x: 7, y: 10 }))).toBe(false);
		expect(tree?.blockedFootprint).toHaveLength(0);
		expect(rock?.blockedFootprint).toEqual([{ x: 0, y: 0 }]);
	});

	it('provides lanes that enter camp through declared gates', () => {
		const northLane = map.spawnLanes.find((lane) => lane.id === 'north-breach');
		const eastLane = map.spawnLanes.find((lane) => lane.id === 'east-breach');

		expect(northLane?.points).toContainEqual({ x: 6.5, y: 3 });
		expect(eastLane?.points).toContainEqual({ x: 10, y: 6.5 });
	});

	it('declares future economy and defense markers without behavior', () => {
		expect(map.markers.map((marker) => marker.id)).toEqual([
			'furnace-pad',
			'wood-station',
			'meat-station',
			'turret-pad',
			'trap-pad',
			'worker-hut-pad'
		]);
	});
});
