import { describe, expect, it } from 'vitest';
import type { MapRecipe } from './MapRecipe';
import { camp01Recipe } from './recipes/camp01';
import { validateMapRecipe } from './validateMapRecipe';

function recipe(overrides: Partial<MapRecipe> = {}): MapRecipe {
	return {
		...camp01Recipe,
		scenery: [...camp01Recipe.scenery],
		blockers: [...camp01Recipe.blockers],
		anchors: [...camp01Recipe.anchors],
		spawnLanes: [...camp01Recipe.spawnLanes],
		...overrides
	};
}

describe('MapRecipe validation', () => {
	it('accepts camp-01 as the current playable recipe', () => {
		expect(validateMapRecipe(camp01Recipe)).toEqual({
			ok: true,
			errors: []
		});
	});

	it('requires the core playable anchors', () => {
		const result = validateMapRecipe(recipe({
			anchors: camp01Recipe.anchors.filter((anchor) => anchor.kind !== 'wood')
		}));

		expect(result.ok).toBe(false);
		expect(result.errors).toContain('Required anchor missing: wood.');
	});

	it('rejects duplicate anchor IDs and anchors on blocked cells', () => {
		const result = validateMapRecipe(recipe({
			anchors: [
				...camp01Recipe.anchors,
				{
					id: 'wood',
					kind: 'food',
					grid: { x: 3, y: 3 }
				}
			]
		}));

		expect(result.ok).toBe(false);
		expect(result.errors).toContain('Duplicate anchor id: wood.');
		expect(result.errors).toContain('Anchor wood is on a blocked cell.');
	});

	it('rejects empty spawn lanes and out-of-bounds blockers', () => {
		const result = validateMapRecipe(recipe({
			blockers: [
				...camp01Recipe.blockers,
				{
					id: 'bad-rock',
					kind: 'rock',
					grid: { x: 99, y: 0 },
					blockedFootprint: [{ x: 0, y: 0 }]
				}
			],
			spawnLanes: [
				...camp01Recipe.spawnLanes,
				{
					id: 'empty-lane',
					team: 'enemy',
					points: []
				}
			]
		}));

		expect(result.ok).toBe(false);
		expect(result.errors).toContain('Blocker bad-rock is out of bounds at 99,0.');
		expect(result.errors).toContain('Spawn lane empty-lane has no points.');
	});
});
