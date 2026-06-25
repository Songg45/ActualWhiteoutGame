# Map Recipes

Maps are authored as `MapRecipe` objects and loaded through `MapRuntime`.
Runtime systems should treat anchors as the gameplay contract and old map
markers as a temporary compatibility layer.

## Required Anchors

Every playable recipe must validate with at least one of each anchor:

- `furnace`
- `enemy-spawn`
- `npc-spawn`
- `food`
- `wood`

Useful optional anchors include `storage`, `exchange`, `build-pad`,
`defense-slot`, `worker-hut`, and `gate`.

## Authoring Notes

- Terrain is declared as a default tile kind plus rectangular override regions.
- Scenery is visual-only and non-blocking. Ordinary trees belong here.
- Blockers declare explicit `blockedFootprint` offsets. Rocks and fences belong
  here.
- Anchors define gameplay meaning and may also expose legacy marker IDs while
  the current rendering and interaction layers migrate.
- Spawn lanes must include at least one point and should be tagged for their
  future consumer, currently `enemy` or `npc`.

`camp-01` lives in `src/game/map/recipes/camp01.ts` and preserves the original
starter camp layout. It keeps trees pass-through, rocks/fences blocking, the
current wood/meat station positions, the furnace pad, defense pads, storage,
exchange, and existing enemy lane paths.

## Procedural Generation

Future procedural generation should output a complete `MapRecipe`, then run it
through `validateMapRecipe` before a `MapRuntime` is created. Generation should
not bypass required anchors, bounds checks, duplicate ID checks, blocked anchor
checks, or spawn lane validation.
