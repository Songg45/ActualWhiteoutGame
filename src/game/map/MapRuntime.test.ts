import { describe, expect, it } from 'vitest';
import { gridKey } from './MapData';
import { MapRuntime } from './MapRuntime';
import { camp01Recipe } from './recipes/camp01';

describe('MapRuntime', () => {
	const runtime = new MapRuntime(camp01Recipe);

	it('exposes anchor queries without leaking mutable recipe objects', () => {
		const furnace = runtime.requireAnchor('furnace');

		expect(furnace.id).toBe('furnace');
		expect(runtime.getAnchor('wood')?.legacyMarkerId).toBe('wood-station');
		expect(runtime.getAnchors('enemy-spawn')).toHaveLength(2);
		furnace.grid.x = 999;
		expect(runtime.requireAnchor('furnace').grid.x).toBe(7);
	});

	it('builds compatible map data and runtime collections from anchors', () => {
		expect(runtime.data.markers.map((marker) => marker.id)).toEqual([
			'furnace-pad',
			'wood-station',
			'meat-station',
			'turret-pad',
			'trap-pad',
			'worker-hut-pad'
		]);
		expect(runtime.getResourceStations().map((station) => station.id)).toEqual([
			'wood-station',
			'meat-station'
		]);
		expect(runtime.getDropZones().map((zone) => zone.id)).toEqual([
			'camp-storage',
			'reward-exchange'
		]);
		expect(runtime.getBuildPads().map((anchor) => anchor.buildingId)).toEqual([
			'furnace',
			'turret',
			'trap',
			'worker-hut'
		]);
	});

	it('reports spawn lanes and blocked cells from the recipe-built map', () => {
		expect(runtime.getSpawnLanes('enemy').map((lane) => lane.id)).toEqual([
			'east-breach',
			'north-breach'
		]);
		expect(runtime.getBlockedCells().has(gridKey({ x: 3, y: 3 }))).toBe(true);
		expect(runtime.getBlockedCells().has(gridKey({ x: 0, y: 1 }))).toBe(false);
	});

	it('throws for missing required anchors at runtime query sites', () => {
		expect(() => runtime.requireAnchor('build-pad')).toThrow(
			'Map camp-01 is missing anchor: build-pad.'
		);
	});
});
