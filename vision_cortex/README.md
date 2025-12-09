# Vision Cortex (Standalone Repo Layout)

This folder is the seed for the **InfinityXOneSystems/vision_cortex** repository. It packages the Vision Cortex intelligence system (crawlers, universal ingestor, orchestrator, playbooks) into a repo-ready layout and includes instructions to mirror the same structure into Google Workspace (Docs + Sheets) for living documentation.

## Repository Layout (ready to export to `vision_cortex` repo)
```
vision_cortex/
├─ README.md                    # This file (how to stand up & mirror)
├─ docker/
│  ├─ Dockerfile                # 24/7 runner for the universal ingestor
│  └─ docker-compose.yml        # Local/dev orchestration (Redis + service)
├─ docs/
│  └─ GOOGLE_WORKSPACE_MIRROR.md# Steps to mirror repo docs into Drive/Docs/Sheets
└─ HANDOFF.md                   # Handoff to InfinityXOneSystems/auto_builder
```

## Google Workspace Mirror (Docs + Sheets)
- Mirror **docs** into a Drive folder named `vision_cortex`.
- Maintain an index Sheet `Vision Cortex – Docs Index` with columns: `path`, `title`, `audience`, `last_updated`, `drive_file_id`.
- Recommended key Docs to mirror:
  - `README.md` (overview + ops)
  - `docs/GOOGLE_WORKSPACE_MIRROR.md` (mirror playbook)
  - `src/vision-cortex/README.md` (system quickstart)
  - `src/vision-cortex/VISION_CORTEX_INTELLIGENCE_TAXONOMY.md` (strategic taxonomy)
  - `src/vision-cortex/PREDICTIVE_MARKET_DYNAMICS.md` (boom phases)
  - `src/vision-cortex/README.md` (execution overview)
- Minimal workflow (manual or script):
  1) Export updated markdown → Drive Docs (one doc per file).
  2) Update index Sheet with Drive links and timestamps.
  3) Keep `docs_manifest.json` (if desired) alongside the Sheet for automation.

## Running 24/7 via Docker
- Build & run locally (from repo root):
  ```bash
  docker compose -f vision_cortex/docker/docker-compose.yml up -d --build
  ```
- Service runs `npx ts-node src/vision-cortex/universal-ingestor.ts` with Redis pub/sub enabled (see compose file for envs).
- Logs: `docker compose -f vision_cortex/docker/docker-compose.yml logs -f vision-cortex`
- Health: container uses `restart: unless-stopped` to keep it alive; add monitoring via your platform of choice.

## What’s Included (code lives in `src/vision-cortex/` in this mono-repo)
- Universal Ingestor (`universal-ingestor.ts`): orchestrates all industries/sub-industries and routes signals via Redis + local events.
- Crawlers: court dockets, FDA approvals/PDUFA, LinkedIn talent migration (extensible map for all 10 industries).
- Scoring engine, alert system, entity resolution, playbook router, outreach generator, orchestrator (previously built).

## Quantum Mind Team Philosophy (embedded)
- Parallel reasoning, debate, self-evaluation, strategic forecasting, continuous improvement.
- Each ingestion cycle: **scan → score → strategize → document**. Outputs are ready for `InfinityXOneSystems/auto_builder` to turn into deployable services.

## Deployment Targets
- **Local/dev**: Docker Compose (Redis + service).
- **Prod**: Any container platform (ECS/Kubernetes/Container Apps). Set `REDIS_URL` or point to managed Redis. Mount `.env.local` if needed for API keys.

## Next Steps to create the standalone repo
1) Copy `vision_cortex/` to a new repo root `InfinityXOneSystems/vision_cortex`.
2) Move the existing `src/vision-cortex/` code from this mono-repo into that repo’s `src/` (keep paths identical).
3) Mirror docs to Google Workspace using `docs/GOOGLE_WORKSPACE_MIRROR.md`.
4) Wire CI to build the Dockerfile and push images.
5) Downstream handoff to `InfinityXOneSystems/auto_builder` (see `Handoff` notes) to generate deployables.
