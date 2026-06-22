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
- Reviewed head: `cb390676bac26198c54e4ee79ac8db3d55d41149`
- Decision: changes requested; not merged.
- Verification passed: clean Docker build, 16 tests, desktop/mobile framing,
  exact canvas sizing, and no browser warnings or errors.
- Blocking findings: `IsoMath` duplicates Foundation grid values instead of
  consuming the authoritative runtime constant, and x-oriented fences/gates
  depth-sort above their screen-lowest ground contacts.
- Required next step: resolve both contract issues, add focused tests, and
  re-request Agent 13 review.

