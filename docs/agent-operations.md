# Agent Operations

## Working Model

Each implementation agent owns one branch and one draft pull request. Agents push after every meaningful, tested milestone. Agent 13 reviews integration readiness and merges accepted work in the order defined by `docs/agent-plan.md`.

## Branches

| Agent | Branch |
| --- | --- |
| 1 - Foundation | `codex/game-foundation` |
| 2 - Map | `codex/iso-map` |
| 3 - Player | `codex/player-controls` |
| 4 - Economy | `codex/resources-economy` |
| 5 - Progression | `codex/building-progression` |
| 6 - NPCs | `codex/npc-workers` |
| 7 - Combat | `codex/enemies-combat` |
| 8 - Defenses | `codex/defenses` |
| 9 - UI | `codex/ui-hud` |
| 10 - Art | `codex/art-assets` |
| 11 - Polish | `codex/polish-effects` |
| 12 - QA | `codex/qa-balance` |
| 13 - Integration | `codex/integration-review` |

## Required Agent Routine

1. Read `docs/agent-plan.md`, `docs/contracts.md`, and this file.
2. Work only in the assigned ownership area.
3. Do not revert or overwrite work from another agent.
4. Run `docker compose --profile tools build verify` before pushing.
5. Commit after each meaningful milestone using a focused message.
6. Push the assigned branch after every commit.
7. Open a draft PR after the first push and update its checklist.
8. Record shared-contract changes in the PR and `docs/integration-log.md`.
9. Do not merge your own implementation PR.

## Commit Guidance

Good examples:

```text
feat(map): add isometric coordinate helpers
feat(player): add pointer movement and bounds
test(economy): cover resource transfer limits
fix(combat): prevent dead enemies from dropping twice
docs(agent): record map integration contract
```

## Pull Request Requirements

Every PR must state:

- owned scope
- completed milestones
- remaining work
- tests performed
- screenshots or recordings for visible changes
- shared contracts changed
- integration risks

## Review Policy

Agent 13 reviews diffs and runs the project locally. It may request changes or add a narrowly scoped integration fix. GitHub may not allow formal approval when all work is authored and reviewed by the same GitHub account; in that case, Agent 13 records its review decision in the PR and `docs/integration-log.md` before merging.

## Shared Files

Changes to these files require explicit integration notes:

- `package.json`
- `pnpm-lock.yaml`
- `compose.yaml`
- `src/main.ts`
- `src/game/config.ts`
- `src/game/state/GameState.ts`
- `src/game/events/GameEvents.ts`
- `docs/contracts.md`
