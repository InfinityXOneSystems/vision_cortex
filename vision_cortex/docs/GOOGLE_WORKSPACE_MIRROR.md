# Google Workspace Mirror Playbook (Vision Cortex)

Goal: keep GitHub repo docs in sync with Drive + Docs + Sheets for Vision Cortex.

## Folder Setup
- Drive folder: `vision_cortex` (shared with core team).
- Subfolders: `docs/` for Markdown → Google Docs, `data/` for Sheets/CSVs, `ops/` for runbooks.
- Index Sheet: `Vision Cortex – Docs Index` with columns:
  - `path` (repo-relative), `title`, `audience`, `last_updated`, `drive_file_id`, `drive_url`, `notes`.

## Minimal Manual Workflow
1) For each markdown doc, create a Google Doc with the same title in `docs/`.
2) Paste/format content; keep a changelog section at bottom.
3) Add/update row in the Index Sheet with Doc URL and timestamp.
4) For structured data (e.g., signals, alerts), keep CSVs or Sheets in `data/`.

## Automation Hooks (optional)
- Use a simple Drive sync script (Node/TS) to:
  - Read `docs_manifest.json` (list of repo docs to sync).
  - Convert markdown → HTML → Docs API; update existing file IDs.
  - Update the Index Sheet with new timestamps/links.
- Secrets: load from `.env.local` (Google service account JSON path or base64) and never commit.

## Recommended Docs to Mirror
- `vision_cortex/README.md` (repo overview + ops)
- `src/vision-cortex/README.md` (system quickstart)
- `src/vision-cortex/VISION_CORTEX_INTELLIGENCE_TAXONOMY.md`
- `src/vision-cortex/PREDICTIVE_MARKET_DYNAMICS.md`
- `src/vision-cortex/ORCHESTRATOR.md` (if present)
- `src/vision-cortex/PLAYBOOKS.md` (if present)

## Sync Cadence
- Weekly baseline, or after any material change.
- Before releases, force-sync and update the Index Sheet.

## Audit & Ownership
- Doc owner: Vision Cortex lead.
- Workspace admin: ensure service account has edit access to the Drive folder if automating.
