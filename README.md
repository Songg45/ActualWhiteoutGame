# Actual Whiteout Game

A browser-playable isometric survival and resource-management game inspired by the interactive gameplay shown in Whiteout-style mobile ads.

## Requirements

- Docker Desktop with the Linux engine running
- Git
- GitHub CLI for the agent branch and PR workflow

## Development

Start the game:

```powershell
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173).

Run a production build:

```powershell
docker compose --profile tools build verify
```

Stop the development environment:

```powershell
docker compose down
```

The development image copies source during its build. Re-run
`docker compose up --build` after changing files.

## Agent Workflow

The canonical responsibilities and integration order are in
[`docs/agent-plan.md`](docs/agent-plan.md). Git and PR rules are in
[`docs/agent-operations.md`](docs/agent-operations.md).
