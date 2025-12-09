# AI Automation Governance & System-Wide Environment Availability

## Overview

This document defines the governance model and environment variable architecture for AI-driven automation across the Infinity X One Systems platform, with Vision Cortex as the primary intelligence hub.

---

## 1. Environment Variable Hierarchy

### Scope Levels

```
┌─────────────────────────────────────────────────────┐
│  GitHub Organization Secrets (Scope: all repos)    │  INF_*
│  (highest priority, used by CI/CD and auto-builder)│
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│  Google Cloud Secret Manager (Scope: GCP services) │  vision-cortex-*
│  (accessible to Cloud Functions, Run, etc.)         │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│  Local .env.local (Scope: development machine)     │
│  (git-ignored, never committed)                     │
└─────────────────────────────────────────────────────┘
```

### Canonical Environment Variable Names

All environment variables follow the `INF_<SYSTEM>_<RESOURCE>` naming convention:

#### AI Providers
```
INF_ANTHROPIC_API_KEY         → Claude API (Anthropic)
INF_GROQ_API_KEY              → Groq API (Mixtral, Llama)
INF_GEMINI_API_KEY            → Google Gemini API
INF_OPENAI_API_KEY            → OpenAI API (optional)
```

#### Vision Cortex
```
INF_VISION_CORTEX_REDIS_URL   → Redis connection (default: redis://localhost:6379)
INF_VISION_CORTEX_INGEST_INTERVAL_MINUTES → Signal ingestion cadence
INF_VISION_CORTEX_MAX_SIGNALS_PER_BATCH → Batch size for scoring
```

#### GitHub Integration
```
INF_GITHUB_TOKEN              → Organization-level GitHub API token (admin access)
INF_GITHUB_ORG                → Organization name (InfinityXOneSystems)
```

#### Google Cloud
```
INF_GCP_PROJECT_ID            → Google Cloud project (infinity-x-one-systems)
INF_GCP_SA_KEY                → Service account JSON (base64-encoded)
INF_GCP_SA_EMAIL              → Service account email
```

#### Security & Encryption
```
INF_ADMIN_KEY                 → Master admin key for internal APIs
INF_JWT_SECRET                → JWT signing secret for auth tokens
INF_ENCRYPTION_KEY            → AES-256-CBC encryption key for sensitive data
```

#### Monitoring & Observability
```
INF_DATADOG_API_KEY           → Datadog metrics/logs (optional)
INF_SENTRY_DSN                → Sentry error tracking (optional)
```

---

## 2. Governance Model

### Authorization Tiers

| Tier | Role | Access | Repos | Systems |
|------|------|--------|-------|---------|
| **Admin** | Platform Owner | Read/Write all secrets | All 41 repos | GCP, GitHub, Drive, Local |
| **Maintainer** | Team Lead | Read/Write Vision Cortex secrets | Foundation, Vision Cortex | GitHub, GCP, Local |
| **Developer** | Engineer | Read secrets, push code | 1-2 assigned repos | Local .env.local only |
| **CI/CD** | Automation | Read secrets, trigger builds | Foundation, auto-builder | GitHub Secrets only |

### Secret Rotation Policy

- **AI Provider Keys**: Rotate quarterly (Q1, Q2, Q3, Q4)
- **GitHub Token**: Rotate annually or on team change
- **GCP Service Account**: Rotate annually, audit monthly
- **Encryption Keys**: Rotate on security incident or annually

### Audit Trail

All secret access is logged:

```typescript
// In Vision Cortex orchestrator
await eventBus.publish(EventChannels.AUDIT_LOG, "secret:accessed", {
  secret_key: "INF_ANTHROPIC_API_KEY",
  actor: "vision-cortex-ingestor",
  timestamp: new Date(),
  ip: process.env.REQUEST_IP,
  success: true
});
```

---

## 3. Sync Strategy (Tri-Directional)

### Direction: Local ↔ GitHub ↔ GCP

**Conflict Resolution**: GCP (Google Cloud Secret Manager) is the **source of truth** for production.

```
Local (.env.local)
       ↓↑
  GitHub Secrets (CI/CD discovers here)
       ↓↑
  GCP Secret Manager (Production uses this)
```

### Sync Frequency

| Task | Interval | Direction | Trigger |
|------|----------|-----------|---------|
| Repo + secrets | 6 hours | Pull all → Push updates | Cron job (Task Scheduler) |
| Secret merge | 24 hours | Sync (bi-directional) | Cron job (2 AM daily) |
| Manual override | On-demand | User-triggered | `./sync-secrets.ps1 -Direction push` |

### Sync Scripts (Windows PowerShell)

Located in `scripts/`:

1. **`sync-tri-directional.ps1`**: Repo sync (local ↔ GitHub ↔ Drive)
   ```powershell
   .\sync-tri-directional.ps1 -SyncMode cron  # Pull all, push updates (lightweight)
   .\sync-tri-directional.ps1 -SyncMode full  # Full bidirectional
   .\sync-tri-directional.ps1 -SyncMode pull  # Pull only
   .\sync-tri-directional.ps1 -SyncMode push  # Push only
   ```

2. **`sync-secrets.ps1`**: Credential sync (local ↔ GitHub ↔ GCP)
   ```powershell
   .\sync-secrets.ps1 -Direction sync   # Bi-directional merge
   .\sync-secrets.ps1 -Direction push   # Push local to GitHub + GCP
   .\sync-secrets.ps1 -Direction pull   # Pull from GitHub + GCP to local
   ```

---

## 4. AI Automation Governance

### Access Control

**GitHub Secrets** (org-level, inherited by all repos):
- Managed by: Platform Admin
- Read by: CI/CD workflows, auto-builder
- Lifecycle: Synced from local via `sync-secrets.ps1 --push`

**Google Cloud Secret Manager** (project-level):
- Managed by: GCP IAM (service accounts)
- Read by: Cloud Run, Cloud Functions, local service account
- Lifecycle: Synced from GitHub via API or manual GCP console

**Local .env.local** (single machine):
- Managed by: Developer
- Read by: Local dev environment, `npm start`, `docker-compose`
- **Never committed** (in `.gitignore`)

### Secret Naming Convention

- **GitHub**: `INF_SYSTEM_RESOURCE` (e.g., `INF_ANTHROPIC_API_KEY`)
- **GCP**: `vision-cortex-system-resource` (kebab-case, e.g., `vision-cortex-anthropic-api-key`)
- **Local .env**: Same as GitHub (for consistency)

### Policy Enforcement

1. **Pre-commit Hook**: Scan for secrets before pushing
   ```bash
   npm run validate:no-secrets  # Runs in pre-commit hook
   ```

2. **CI/CD Secret Validation**: GitHub Actions verify all `INF_*` vars are set
   ```yaml
   - name: Validate secrets
     run: |
       [[ -z "$INF_ANTHROPIC_API_KEY" ]] && echo "Missing INF_ANTHROPIC_API_KEY" && exit 1
       [[ -z "$INF_GITHUB_TOKEN" ]] && echo "Missing INF_GITHUB_TOKEN" && exit 1
   ```

3. **Secret Scanning**: Automated detection of leaked keys
   - GitHub Advanced Security (built-in)
   - Prevent push if secrets detected: `npm run sync:push` blocks if `.gitignore` violations

---

## 5. AI Automation Capabilities

### Enabled by Environment

With system-wide env availability, these automations unlock:

| Automation | Requirements | Trigger | Output |
|-----------|--------------|---------|--------|
| **Vision Cortex Ingestion** | `REDIS_URL`, `INGEST_INTERVAL_MINUTES` | 6h cron | Scored signals → Redis |
| **Auto-Builder Deployment** | `INF_GITHUB_TOKEN`, `INF_GCP_SA_KEY` | Git push → webhook | Built artifacts → GCP |
| **Taxonomy Sync** | `INF_GITHUB_TOKEN`, `INF_GEMINI_API_KEY` | Daily 1 AM | Updated model catalog |
| **Alert Generation** | `INF_ANTHROPIC_API_KEY`, `REDIS_URL` | Signal arrival | Alerts → Slack/Email |
| **Outreach Orchestration** | `INF_GMAIL_*`, `INF_LINKEDIN_*` | Playbook trigger | Emails/InMails sent |
| **Observability** | `INF_DATADOG_API_KEY`, `INF_SENTRY_DSN` | Runtime events | Metrics → Datadog |

### Governance Checklist

- [ ] All `INF_*` secrets defined in `CONFIG.md`
- [ ] Local `.env.local` contains all required vars
- [ ] `sync-secrets.ps1 --push` runs successfully
- [ ] GitHub organization secrets populated (verify via `gh secret list`)
- [ ] GCP Secret Manager has all `vision-cortex-*` secrets (verify via `gcloud secrets list`)
- [ ] Cron jobs registered in Windows Task Scheduler
- [ ] Audit logging enabled in Vision Cortex orchestrator
- [ ] Pre-commit hooks block secret commits

---

## 6. Quick Start

### Setup (First Time)

```powershell
# 1. Copy template
Copy-Item ".env.example" ".env.local"

# 2. Edit .env.local with actual credentials
notepad .env.local
# Add all INF_* variables

# 3. Push to GitHub Secrets
.\scripts\sync-secrets.ps1 -Direction push -Verbose

# 4. Verify GitHub secrets
gh secret list --org InfinityXOneSystems

# 5. Set up cron jobs
& ".\scripts\CRON_SETUP.md"  # Follow instructions to register tasks

# 6. Test sync
.\scripts\sync-tri-directional.ps1 -SyncMode pull -Verbose
```

### Daily Workflow

```powershell
# Before starting work: pull latest secrets
.\scripts\sync-secrets.ps1 -Direction pull

# After making changes: push back
.\scripts\sync-secrets.ps1 -Direction push

# Manual repo sync (optional, runs automatically via cron)
.\scripts\sync-tri-directional.ps1 -SyncMode full
```

---

## 7. Monitoring & Observability

### Health Checks

```powershell
# Verify Redis connectivity
redis-cli -u $env:REDIS_URL ping

# Verify GitHub token
gh auth status

# Verify GCP credentials
gcloud auth list

# Verify secrets are synced
.\scripts\sync-secrets.ps1 -Direction pull -DryRun -Verbose
```

### Alerting

Vision Cortex publishes events for:
- Secret sync failures → Slack #ops
- Cron job failures → Email alert
- Authorization failures → Audit log + Sentry

---

## 8. Disaster Recovery

### If Local .env.local Is Lost

```powershell
# Pull from GitHub
gh secret get INF_ANTHROPIC_API_KEY > temp.txt
# Manually reconstruct .env.local from all secrets
```

### If GitHub Secrets Corrupted

```powershell
# Use GCP as source of truth
.\scripts\sync-secrets.ps1 -Direction pull
# GCP secrets → local
# Then manually review and push to GitHub
.\scripts\sync-secrets.ps1 -Direction push
```

### If GCP Secret Manager Lost

```powershell
# Use GitHub as source
.\scripts\sync-secrets.ps1 -Direction push
# GitHub → GCP (re-create all secrets)
```

---

## 9. References

- `CONFIG.md` - Canonical env var definitions
- `FOUNDATION_SYSTEM_OVERVIEW.md` - System architecture
- `sync-tri-directional.ps1` - Repo sync script
- `sync-secrets.ps1` - Credential sync script
- `CRON_SETUP.md` - Scheduled task setup

---

## Contacts

- **Platform Admin**: [Contact info]
- **Security Lead**: [Contact info]
- **DevOps**: [Contact info]
