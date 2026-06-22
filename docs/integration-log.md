# Integration Log

Use this file to record branch reviews, merges, rejected PRs, and cross-agent contract changes.

## 2026-06-21 - Agent 1 Foundation Contract

- Branch: `codex/game-foundation`
- Draft PR: #2
- Established `128 x 64` fixed 2:1 isometric geometry and base-Y depth as the
  authoritative runtime contract. Agent 10 PR #1 must realign its final
  `96 x 48` proposal after Foundation is approved.
- Added typed global state and event contracts for resources, building unlocks,
  and waves.
- Reset publishes resource and wave field events before its final state
  snapshot so specialized consumers cannot remain stale.
- Added Vitest as a shared development dependency for focused contract tests.
- Integration order remains Agent 1 before map, player, economy, combat, and UI
  branches.

