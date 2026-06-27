# Integration Log

Use this file to record branch reviews, merges, rejected PRs, and cross-agent contract changes.

## 2026-06-21 - Agent 1 Foundation Contract

- Branch: `codex/game-foundation`
- PR: #2
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `4045d31e4fdc4345e50a88caac1f450cc30a5827`
- Established `128 x 64` fixed 2:1 isometric geometry and base-Y depth as the
  authoritative runtime contract. Agent 10 PR #1 was required to realign before
  merge and completed that work.
- Added typed global state and event contracts for resources, building unlocks,
  and waves.
- Reset publishes resource and wave field events before its final state
  snapshot so specialized consumers cannot remain stale.
- Added Vitest as a shared development dependency for focused contract tests.
- Integration verification passed: clean Docker build, 6 contract tests, and
  exact canvas sizing at `1280 x 720` and `320 x 480`.
- Integration order remains Agent 1 before map, player, economy, combat, and UI
  branches.

## 2026-06-22 - Agent 10 Placeholder Asset Pack

- Branch: `codex/art-assets`
- PR: #1
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `4887a135c1ca1533f37e2db863b032763bb71dec`
- Added 11 reviewed project-original AI-assisted placeholder PNGs, stable
  manifest IDs and provenance, a reproducible processor, and asset validation.
- Confirmed the authoritative `128 x 64` geometry and front/lower base-point
  rules without changing shared runtime contracts.
- Integration verification passed: validator, 12 asset tests, clean Docker
  build, visual review, and PNG dimension/alpha/size audits.
- Standalone world-money pickup/stack art remains `needed`; this was accepted as
  non-blocking for the bounded representative pack.

## 2026-06-22 - Agent 2 Isometric Map Review

- Branch: `codex/iso-map`
- PR: #4
- Approved head: `b22a91f6673e4156fe8fac03472bf69a5cfb5d6c`
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `9b70c29bb756a3390f0a7684f1eb27ab220ebc06`
- Added authoritative isometric projection helpers, map/collision data,
  environment rendering, spawn lanes, markers, and responsive camera framing.
- Resolved review blockers by consuming Foundation's `ISO_GRID` directly and
  depth-sorting both fence/gate orientations from their screen-lowest contacts.
- Canonical `pnpm test` now runs 21 Vitest tests, 12 native Art tests, and the
  21-entry asset validator without cross-framework collection.
- Final verification passed: clean frozen-lock Docker build/typecheck,
  production build, desktop/mobile framing, exact canvas sizing, and no browser
  warnings or errors.

## 2026-06-23 - Agent 3 Player Controls

- Branch: `codex/player-controls`
- PR: #7
- Approved head: `d7fbb68384ff91a3c8bf057d06c9ea09c971575d`
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `059fb273cec22deec571a3e1c6f5c0f518fc0562`
- Added bounded collision-aware A* movement, pointer/touch retargeting, player
  base-Y depth, camera follow, and deterministic proximity interactions.
- Added finite typed carry limits using Foundation `ResourceType`, synchronized
  carry visuals, and runtime drop-zone replacement hooks for Agent 4.
- Final verification passed: 48 unit tests, 12 Art tests, 21-asset validation,
  clean frozen-lock Docker build/typecheck, and desktop/mobile input smoke with
  no browser warnings or errors.

## 2026-06-23 - Free Movement Controls

- Branch: `codex/free-movement-controls`
- PR: #9
- Approved head: `cb9fe3143c7bc61a52a5419f049893d2df110ff7`
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `2019a431614885c318b5c30ce32538f27610cc45`
- Replaced runtime A* routes, tap destinations, and cell snapping with
  continuous joystick and keyboard movement while preserving Agent 4 carry and
  drop-zone hooks.
- Added normalized analog/keyboard input, player-radius collision, substepped
  large-delta movement, axis sliding, and scene-safe input cleanup.
- Final verification passed: 53 unit tests, 12 Art tests, 21-asset validation,
  clean frozen-lock Docker build/typecheck, and desktop/mobile movement,
  collision, resize, release-stop, and console smoke checks.

## 2026-06-23 - Agent 4 Economy Contract

- Branch: `codex/resources-economy`
- PR: #11
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `dc748f5f74a51b35c7cf6c17c28b4b4d39a9c8ff`
- Added typed `station:changed` and `economy:transfer` events.
- Added atomic typed multi-resource affordability/spend APIs and bounded
  `ResourceStore.transferTo` for Agent 5 incremental funding.
- Collection and drop-zone transfers are automatic at timed proximity ticks;
  movement input remains live throughout.
- Verification passed: 82 unit tests, 12 asset tests, 21-asset validation,
  frozen-lock Docker typecheck/build, desktop gameplay loop, and 320x480
  collect/carry/deposit/exchange/restart QA with no browser console errors.
- Visual evidence: `docs/evidence/agent-4/`.

## 2026-06-25 - Agent 5 Building Progression Contract

- Branch: `codex/building-progression`
- PR: #12
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `01aa50af2e922b9450869b389b74d5ce40d7c940`
- Added data-driven build definitions, build-pad state contracts, inert
  completion records, and a progression query for completed turret/trap
  placements.
- `GameState.snapshot.unlockedBuildings` remains an availability/unlock list;
  defense agents should query completed placements through
  `ProgressionSystem.getCompletedDefensePlacements()`.
- Worker automation should use the `worker-hut` unlock hook until Agent 6 owns
  behavior.

## 2026-06-25 - Tree Collision Pass

- Branch: `codex/tree-collision-pass`
- PR: #13
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `bf94dbd6da18b265e78bee87b83fa24c6a142511`
- Made ordinary trees decorative/pass-through so forest density does not block
  free-walk movement.
- Preserved rocks, fences, buildings, authored blockers, and bounds as
  collision authorities.
- Updated the shared collision contract in `docs/contracts.md`.

## 2026-06-26 - Map Runtime Architecture

- Branch: `codex/map-runtime-architecture`
- PR: #14
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `6f2a763176fa2b0db7ee99b6d67a4949c745d6dc`
- Added `MapRecipe`, `GameplayAnchor`, validation, `MapRecipeBuilder`, and
  `MapRuntime` so maps are generated from typed gameplay anchors.
- Converted the current map into `camp-01` while preserving existing gameplay
  layout and compatibility marker IDs.
- Playable recipes now require at least one `furnace`, `enemy-spawn`,
  `npc-spawn`, `food`, and `wood` anchor.
- Systems should migrate toward runtime anchor queries instead of relying on
  hardcoded legacy marker IDs.

## 2026-06-27 - Agent 7 Enemy Combat Skeleton

- Branch: `codex/enemies-combat`
- PR: #15
- Decision: accepted by Agent 13 and merged into `main`.
- Merge commit: `6f7453a8b044da2ddfb636de9b695bf27ee3bde7`
- Added enemy combat types, bear enemy model/entity rendering, wave spawning
  from map-runtime enemy lanes, enemy lane movement, health bars, and death
  reward handling.
- Added player attack on desktop with `Space` and mobile with a lower-right
  `ATK` touch button. Both call the same scene attack path.
- Established the current reward contract: bears reward `meat` through
  `GameState.changeResource('meat', amount)`; bear kills are not a direct
  cash-first economy source.
- Added defense integration hooks for Agent 8:
  `GameScene.getCombatTargets()` and `GameScene.applyDamageToEnemy()`.
- Agent 13 initially blocked merge until bear rewards were meat-first and the
  mobile attack affordance existed. Both blockers were corrected before merge.
- Verification passed in Docker: focused combat/reward/mobile attack tests,
  full `pnpm test`, asset validation, and `docker compose --profile tools build
  verify`.
- GitHub self-approval was not available for the authoring account, so Agent
  13 recorded an acceptable review decision and the coordinator performed the
  mechanical ready/merge action after confirming the reviewed head.

## 2026-06-27 - Agent 8 Defensive Turrets And Traps

- Branch: `codex/defenses`
- PR: #16
- Decision: accepted by Agent 13 and merged into `main`.
- Merge commit: `f106904db1f39b944d4e3ddcb1b7b60db96b1a04`
- Added `DefenseSystem` for completed turret and trap placements returned by
  `ProgressionSystem.getCompletedDefensePlacements()`.
- Turrets target bears through `GameScene.getCombatTargets()` and apply damage
  through `GameScene.applyDamageToEnemy()`.
- Traps apply scoped area damage with cooldown gating.
- Added lightweight bolt, impact, and trap pulse feedback using Phaser
  primitives.
- Preserved player `Space` and mobile `ATK` attacks, bear meat rewards, and the
  Agent 7 public combat hooks.
- Agent 13 accepted the PR on first review. GitHub self-approval was not
  available for the authoring account, so the coordinator performed the
  mechanical merge after confirming the reviewed head.
- Verification passed in Docker: focused `DefenseSystem` tests, full
  `pnpm test`, asset validation, and `docker compose --profile tools build
  verify`. Browser smoke passed at `1280x720` and `320x480`; mobile `ATK`
  remained visible.

## Next Planned Slice

- Agent 6 should implement a small NPC customer queue and food-sales loop so
  money comes from served customers instead of direct bear rewards.
- Keep the first NPC pass narrow: customer spawn/queue/service/payment, with
  worker automation optional or deferred.
- Preserve bear meat rewards and Agent 8 defense behavior.
- Defer bear wall damage, wood-as-furnace-fuel, wood-for-wall-repair, and full
  furnace cooking architecture to later economy/defense passes.

## 2026-06-27 - Agent 6 NPC Sales Checkpoint

- Branch: `codex/npc-workers`
- Added a narrow customer queue and sales loop. Customers consume `GameState`
  `meat` as the temporary service food resource and pay `money` through
  `GameState`; this is intentionally compatible with a future furnace/cooked
  food architecture replacing the input resource.
- Customer NPCs are non-blocking scene containers and are not exposed through
  `GameScene.getCombatTargets()`, preserving defense targeting.
- Worker automation, wall damage/repair, wood fuel, and full cooking remain
  deferred.

