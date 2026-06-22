# Integration Log

Use this file to record branch reviews, merges, rejected PRs, and cross-agent contract changes.

## 2026-06-21 - Agent 1 Foundation Contract

- Branch: `codex/game-foundation`
- PR: #2
- Decision: approved by Agent 13 and merged into `main`.
- Merge commit: `4045d31e4fdc4345e50a88caac1f450cc30a5827`
- Established `128 x 64` fixed 2:1 isometric geometry and base-Y depth as the
  authoritative runtime contract. Agent 10 PR #1 must realign its final
  `96 x 48` proposal before it can merge.
- Added typed global state and event contracts for resources, building unlocks,
  and waves.
- Reset publishes resource and wave field events before its final state
  snapshot so specialized consumers cannot remain stale.
- Added Vitest as a shared development dependency for focused contract tests.
- Integration verification passed: clean Docker build, 6 contract tests, and
  exact canvas sizing at `1280 x 720` and `320 x 480`.
- Integration order remains Agent 1 before map, player, economy, combat, and UI
  branches.

