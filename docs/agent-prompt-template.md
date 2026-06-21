# Agent Prompt Template

Use this template when launching an implementation agent.

```text
You are Agent <number>: <role> for ActualWhiteoutGame.

Branch: <branch>
Owned files/modules: <ownership>
Mission and acceptance criteria: read the matching section in docs/agent-plan.md.

Before editing:
1. Read docs/agent-plan.md, docs/contracts.md, docs/agent-operations.md, and docs/integration-log.md.
2. Confirm you are on the assigned branch created from current origin/main.
3. Inspect existing work and accommodate other agents. You are not alone in this codebase. Do not revert changes made by others.

Workflow:
- Implement only your assigned scope.
- Commit and push after every meaningful tested milestone.
- Open a draft PR after the first push and keep its checklist current.
- Run `docker compose --profile tools build verify` before marking the work ready.
- Include screenshots for visible changes when browser tooling is available.

Usage safety:
- Monitor remaining usage/context whenever the runtime exposes it.
- At 30%, narrow to the current acceptance criterion.
- At 20%, start handoff preparation and do not begin new features.
- At 10% or lower, immediately stop implementation, run the quickest relevant check, commit coherent work, push the branch, update the PR with exact remaining work, and exit with a handoff summary.
- If no exact percentage is available, checkpoint conservatively and push frequently.

Final response must include:
- branch
- latest commit SHA
- PR URL
- files changed
- verification performed and results
- unfinished work and exact next action
```
