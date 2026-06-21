# Agent Launch Checklist

- [x] Docker Desktop status is `running`.
- [x] `docker compose config` succeeds.
- [x] Dependencies install from the lockfile.
- [x] `pnpm build` succeeds inside Docker.
- [x] Development server responds at `http://localhost:5173`.
- [x] Baseline files are committed to `main`.
- [x] GitHub `origin` is configured.
- [x] Baseline commit is pushed to GitHub.
- [x] Agent branch names are available.
- [x] Agent 13 integration workflow is ready.
- [x] Agent usage and graceful-shutdown protocol is documented.
