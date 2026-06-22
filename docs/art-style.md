# Art Direction

## Visual Goal

Actual Whiteout Game uses an original, toy-like isometric style built for quick
reading on a phone-sized screen. The world should feel cold and exposed outside
the camp, while the camp itself feels warm, handmade, and increasingly busy.

The reference screenshots establish the genre and camera language only. Do not
trace, extract, repaint, or reproduce Whiteout Survival art, branding, UI, map
layouts, characters, or effects. Every shipped asset must be original or have a
documented compatible license.

## Design Pillars

1. **Chunky silhouettes:** characters and props read first by shape, then detail.
2. **Warm camp, cold wilds:** warm materials and light identify safety and progress.
3. **Readable resources:** wood, meat, and money remain distinct at 32-48 pixels.
4. **Physical stacks:** gathered resources visibly pile upward in tidy increments.
5. **Soft danger:** enemies are threatening through scale and motion, not gore.

## Palette

Use these colors as anchors rather than mandatory flat fills.

| Token | Hex | Use |
| --- | --- | --- |
| `snow-light` | `#F4FBFF` | Snow highlights and clean UI contrast |
| `snow-shadow` | `#BBDCE8` | Snow banks and cool cast shadows |
| `ice-blue` | `#76C7DA` | Frozen accents and distant environment |
| `pine-blue` | `#3D8295` | Snowy pine shadow masses |
| `night-teal` | `#24505F` | Deep outlines and cold occlusion |
| `timber-light` | `#D99A52` | Cut wood and camp structures |
| `timber-dark` | `#75452F` | Wood sides, bark, and structural shadows |
| `ember` | `#F26A32` | Fire, impact cores, and urgent warmth |
| `fire-gold` | `#FFD15C` | Flames, rewards, and interaction highlights |
| `coat-blue` | `#2879B9` | Player and friendly character identity |
| `meat-red` | `#C9444D` | Meat resources and enemy hit accents |
| `money-green` | `#47B86A` | Currency and completed economy actions |
| `bear-gray` | `#7B8790` | Enemy body base without realistic fur detail |
| `ink` | `#26343B` | Outlines, eyes, and high-contrast UI details |

Avoid large areas dominated by a single blue. Snow should include near-white,
blue shadow, warm reflected light, timber, and dark evergreen contrast.

## Camera And Isometric Geometry

- Use a fixed 2:1 isometric projection.
- The logical tile diamond is `128 x 64` pixels at 1x world scale, matching the
  foundation `ISO_GRID` contract.
- A half tile is `64 x 32`; use half-tile increments for prop placement.
- The camera is orthographic. Do not add perspective convergence to environment
  edges.
- Vertical world lines remain vertical on screen.
- Horizontal ground axes travel at approximately 26.565 degrees.
- Gameplay may scale the canvas, but source art is exported at its documented
  native pixel dimensions.

## Footprints, Anchors, And Depth

Every world sprite has a **base point**, the screen position where the object
touches the ground. Phaser origins should place the base point at the object's
logical world coordinate.

- Characters: base point is centered between the feet.
- Trees: base point is centered at the trunk's ground contact.
- Buildings: project the complete ground footprint, then use its screen-lowest
  ground-contact point. For a diamond footprint this is the front/lower vertex.
  If the projected footprint ends in a horizontal lower edge, use that edge's
  midpoint. This point is independent of the building's facing direction.
- Fences: base point is centered on the segment's ground contact line.
- Pickups: base point is centered under the lowest item in the stack.
- Effects that live in world space use the impact/contact point as their origin.

Use `container.setDepth(baseY)` for world sorting. Tall art must extend upward
from the base point and must not change depth according to its image center.
For an orientation variant, rotate/project the footprint first and then apply the
same lowest-point rule. Every orientation must place its exported origin on that
resolved point. Runtime `baseY` is the screen-space Y of this point, so two
overlapping structures sort by their front-most ground contact rather than their
image centers or back footprint edges.

Each manifest entry records:

- `canvas`: exported pixel width and height.
- `origin`: normalized Phaser origin in the range 0-1.
- `footprint`: logical footprint in half-tile units.
- `status`: whether the asset is needed, placeholder, review-ready, or final.

## Source Dimensions

These are default first-pass dimensions. A manifest entry may override them.

| Asset class | Source canvas | Default origin |
| --- | --- | --- |
| Character/NPC | `128 x 160` | `0.5, 0.9` |
| Bear/enemy | `192 x 160` | `0.5, 0.88` |
| Small pickup | `64 x 64` | `0.5, 0.82` |
| Resource stack | `96 x 128` | `0.5, 0.9` |
| Tree | `192 x 256` | `0.5, 0.94` |
| Fence segment | `160 x 128` | `0.5, 0.82` |
| Gate | `256 x 192` | `0.5, 0.86` |
| Small building | `256 x 256` | `0.5, 0.88` |
| Effect frame | `128 x 128` | `0.5, 0.5` |
| UI icon | `64 x 64` | `0.5, 0.5` |

Use integer dimensions. Leave enough transparent padding for animation and
effects, but keep the base point stable across every frame in an animation.

## Character Language

- Friendly characters use rounded coats, oversized gloves, compact boots, and a
  visible face opening.
- The player uses `coat-blue` with a warm yellow or red identifier so they remain
  distinct from friendly NPCs.
- Workers use a backpack, tool, or apron silhouette rather than a palette-only
  distinction.
- Bears use broad shoulders, a low head, large paws, and cool gray fur. Avoid
  anatomical realism, exposed wounds, or realistic blood.
- Minimum facial features are two eyes and one nose/mouth mass. Facial details
  must survive display at 25% source scale.

## Environment Language

- Snow sits as rounded caps with one light face and one blue-shadow face.
- Trees use three or four broad foliage tiers; avoid many small needles.
- Cut timber uses visible end rings and strong cylindrical side shading.
- Camp props favor lashed timber, stone bases, iron fasteners, and canvas.
- Built objects should look increasingly sturdy while retaining the same material
  family.
- Ground-contact shadows are soft, cool, and short. Do not bake long directional
  shadows into sprites that need to rotate or move.

## Resource Language

- Wood: warm tan logs with dark bark ends; stacks alternate direction by layer.
- Meat: simplified red cuts with a pale fat rim; no gore, dripping, or anatomy.
- Money: saturated green bundles with a simple light band; no real-world currency.
- Resource stacks grow in fixed visual increments. The lowest item and base point
  never move as the stack grows.

## Effects

- Snow puffs: pale cyan/white rounded particles with low opacity.
- Pickups: short gold or resource-colored streaks traveling toward the carrier.
- Hits: angular fire-gold core with ember and white highlights.
- Construction: timber-colored chips, snow puffs, and a restrained gold flash.
- Death/defeat: squash, fade, and resource burst; no blood effects.

Effects should communicate one event clearly and resolve within roughly
150-600 ms. Keep particle sprites small and reusable.

## File And Animation Naming

Use lowercase kebab-case:

```text
<category>/<subject>-<variant>-<state>-<direction>-<frame>.<ext>
```

Examples:

```text
sprites/characters/player-blue-idle-se-00.png
sprites/enemies/bear-gray-walk-nw-03.png
sprites/environment/fence-timber-ne.png
sprites/buildings/turret-crossbow-idle-se.png
sprites/resources/wood-stack-03.png
effects/hit-spark-gold-02.png
ui/icons/resource-meat.png
```

Omit fields that do not apply. Direction tokens are `ne`, `nw`, `se`, and `sw`.
Frame numbers are zero-padded to two digits. Do not put version numbers in runtime
filenames; version source files outside `public/` instead.

## Export Rules

- Runtime raster format: transparent PNG for sprites and effects.
- Use WebP only for opaque, non-pixel-critical backgrounds after browser testing.
- Color space: sRGB.
- Alpha: straight/unpremultiplied when the export tool offers the choice.
- No embedded color profile is required.
- No trim/crop for animation frames unless every frame retains an identical
  canvas and base point.
- No baked UI labels, prices, health bars, logos, or language-specific text.
- Keep each individual prototype sprite below 250 KB where practical.
- Sprite sheets may be introduced later, but individual source frames remain the
  canonical replaceable units until the animation contract is stable.

## Automated Validation

Run both checks before an art checkpoint:

```text
node scripts/validate-assets.mjs
node --test tests/assets-manifest.test.mjs
```

The validator checks required fields, allowed statuses, normalized origins,
positive integer dimensions, unique IDs and paths, safe PNG paths, provenance
rules, PNG signatures, and declared dimensions for every asset whose status is
not `needed`.

## Replacement Rules

1. Keep the manifest `id`, relative `path`, canvas, origin, and footprint stable
   when replacing art for an integrated gameplay object.
2. If geometry must change, coordinate with the owning gameplay agent before
   replacing the file.
3. A placeholder may be replaced in place only when its silhouette and base point
   remain compatible.
4. Update the manifest `status`, `notes`, and license metadata in the same commit.
5. Do not delete an integrated asset until repository search confirms no runtime
   references remain.
6. New variants receive new IDs. Do not silently repurpose an existing ID.

## Originality And Licensing

- Allowed: original drawings, original generated assets with commercial-use rights,
  public-domain assets, and compatible licensed assets with attribution recorded.
- Not allowed: extracted game files, screenshots used as sprites, traced commercial
  art, copied branding, or confusingly similar logos.
- Record creator/source/license per asset in `public/assets/manifest.json`.
- Generated assets must be reviewed for accidental logos, text, copied characters,
  and inconsistent geometry before their status advances beyond `placeholder`.

