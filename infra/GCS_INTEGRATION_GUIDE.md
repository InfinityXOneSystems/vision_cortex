# Vision Cortex GCS Bucket Integration Guide

## Overview

The Vision Cortex system now includes **bi-directional Google Cloud Storage (GCS) integration** for:
- **Signal archival**: Store and version all ingested signals
- **Document versioning**: Keep doc history with automatic pruning
- **Cost optimization**: Compress large files, auto-delete old versions
- **Usage tracking**: Monitor bucket costs and file growth
- **Tri-directional sync**: Local ↔ GitHub ↔ Google Drive ↔ GCS

## Quick Start

### 1. Initialize GCS Bucket

```bash
# Deploy Terraform (creates bucket + service accounts)
cd infra
terraform init
terraform apply -var="project_id=infinity-x-one-systems"

# Verify bucket
gcloud storage ls gs://vision-cortex-infinity-x-one/
```

### 2. Configure Local Access

```bash
# Option A: Service account key (for local dev)
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=vision-cortex-app@infinity-x-one-systems.iam.gserviceaccount.com

export GOOGLE_APPLICATION_CREDENTIALS=./gcs-key.json

# Option B: Application Default Credentials (for gcloud auth)
gcloud auth application-default login
```

### 3. Run First Sync

```powershell
# Dry run (no changes)
./scripts/sync-gcs-bucket.ps1 -Direction sync -DryRun -Verbose

# Real sync with compression and pruning
./scripts/sync-gcs-bucket.ps1 -Direction sync -Compress -Prune

# Check usage
./scripts/sync-gcs-bucket.ps1 -Command usage
```

## File Organization in GCS

```
gs://vision-cortex-infinity-x-one/
├── signals/
│   ├── commercial_real_estate/        # All CRE signals
│   │   ├── foreclosure-2024-12-09.json
│   │   ├── probate-2024-12-09.json.gz
│   │   └── ...
│   ├── healthcare_mna/                 # Healthcare M&A signals
│   ├── private_equity/                 # PE signals
│   └── ... (8 more industries)
├── docs/
│   ├── VISION_CORTEX_INTELLIGENCE_TAXONOMY.md
│   ├── PREDICTIVE_MARKET_DYNAMICS.md
│   └── playbooks/
├── logs/
│   ├── sync-operations-2024-12.log
│   ├── signal-ingestion-2024-12.log
│   └── ...
└── .manifests/
    ├── sync-manifest.json               # Local file hashes
    └── retention-policy.json            # Pruning rules
```

## API Reference

### PowerShell Scripts

#### sync-gcs-bucket.ps1

**Push files to GCS with deduplication:**
```powershell
./scripts/sync-gcs-bucket.ps1 -Direction push -Compress

# Options:
# -Include: File patterns to include (default: *.json, *.ts, *.md, signals/*, docs/*)
# -Exclude: Patterns to exclude (default: node_modules/*, .git/*, *.log)
# -Compress: Gzip files > 1MB
# -MaxVersions: Keep N versions (default: 5)
# -DryRun: Preview changes without syncing
# -Verbose: Show detailed logs
```

**Pull files from GCS:**
```powershell
./scripts/sync-gcs-bucket.ps1 -Direction pull

# Skips files where local is newer
# Auto-decompresses .gz files
```

**Bi-directional sync:**
```powershell
./scripts/sync-gcs-bucket.ps1 -Direction sync -Prune -Compress

# Phase 1: Push local changes
# Phase 2: Pull GCS changes
# Phase 3: Prune old versions
```

**Prune old versions:**
```powershell
./scripts/sync-gcs-bucket.ps1 -Direction prune -MaxVersions 3 -PruneAgeDays 14

# Deletes versions older than PruneAgeDays keeping at most MaxVersions
# Useful for cost control
```

**Show usage metrics:**
```powershell
./scripts/sync-gcs-bucket.ps1 -Command usage

# Output:
#   Total size: 1234.56 MB (1.23 GB)
#   Object count: 5000
#   Est. monthly storage cost: $0.02
#   Est. monthly operations cost: $0.02
#   Est. total monthly: $0.04
#   Top objects by size: (list of largest files)
```

### TypeScript SDK

#### VisionCortexGCSManager

```typescript
import { VisionCortexGCSManager } from './src/utils/gcs-manager';

const manager = new VisionCortexGCSManager({
  projectId: 'infinity-x-one-systems',
  bucketName: 'vision-cortex-infinity-x-one',
});

// Push files to GCS
const pushResult = await manager.pushToGCS('./signals', [
  'node_modules',
  '.git',
  '.env',
]);
console.log(`Pushed: ${pushResult.pushed}, Skipped: ${pushResult.skipped}`);

// Pull from GCS
const pullResult = await manager.pullFromGCS('./signals');
console.log(`Pulled: ${pullResult.pulled}`);

// Bi-directional sync
const syncResult = await manager.bidirectionalSync('./signals', 'newest-wins');
console.log(`Synced: ${syncResult.pushed + syncResult.pulled}, Conflicts: ${syncResult.conflicts}`);

// Prune old versions
const pruneResult = await manager.pruneOldVersions();
console.log(`Deleted: ${pruneResult.deleted}, Freed: ${pruneResult.freed} bytes`);

// Get usage metrics
const usage = await manager.getUsageMetrics();
console.log(`Total: ${usage.totalBytes} bytes, Cost: $${usage.estimatedMonthlyCost}/month`);

// Listen to events
manager.on('push:success', ({ file, compressed }) => {
  console.log(`✓ Pushed ${file}${compressed ? ' (compressed)' : ''}`);
});

manager.on('push:error', ({ file, error }) => {
  console.error(`✗ Failed to push ${file}: ${error}`);
});
```

## Retention & Pruning Policy

### Default Policy
- **Keep last 5 versions** of each file
- **Delete versions older than 30 days**
- **Transition to Coldline** storage after 90 days (archive tier)
- **Auto-delete incomplete uploads** after 7 days

### Cost Optimization

#### Storage Costs (2024)
- Standard: $0.020/GB/month
- Coldline: $0.004/GB/month (after 90 days)
- Archive: $0.0025/GB/month (after 365 days)

#### Recommended Pruning for Cost Control
```powershell
# Aggressive pruning (cost: ~$0.01/month for 1GB)
./scripts/sync-gcs-bucket.ps1 -Direction prune -MaxVersions 2 -PruneAgeDays 7

# Balanced (cost: ~$0.02/month for 1GB)
./scripts/sync-gcs-bucket.ps1 -Direction prune -MaxVersions 5 -PruneAgeDays 30

# Archive everything (cost: ~$0.003/month for 1GB)
# Manually move to Archive storage tier (Terraform update)
```

## Scheduled Sync

### Windows Task Scheduler

```powershell
# Setup automatic sync every 6 hours
$action = New-ScheduledTaskAction -Execute 'pwsh.exe' `
  -Argument "-File 'scripts/sync-gcs-bucket.ps1' -Direction sync -Prune -Compress"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 6) `
  -RepetitionDuration (New-TimeSpan -Days 365)

Register-ScheduledTask -TaskName 'Vision-Cortex-GCS-Sync' `
  -Action $action -Trigger $trigger -RunLevel Highest
```

### Linux/macOS Cron

```bash
# Every 6 hours
0 */6 * * * cd /path/to/Vision_Cortex && pwsh scripts/sync-gcs-bucket.ps1 -Direction sync -Prune

# Daily usage report
0 2 * * * cd /path/to/Vision_Cortex && pwsh scripts/sync-gcs-bucket.ps1 -Command usage >> logs/usage.log
```

### GitHub Actions

See `infra/GCS_CRON_SETUP.md` for GitHub Actions workflow example.

## Tri-Directional Sync

The Vision Cortex system now syncs across **four directions**:

```
Local Filesystem
  ↓↑
Git Repository ← → GCS Bucket
  ↓↑
Google Drive
```

### Sync Commands

```powershell
# Full sync (pull all sources, push all targets, prune)
npm run sync:tri:full

# Pull only (faster, for cron jobs)
npm run sync:tri:pull

# Push only (publish changes)
npm run sync:tri:push

# Cron mode (lightweight, pull only)
npm run sync:tri:cron

# Individual GCS commands
npm run sync:gcs:push
npm run sync:gcs:pull
npm run sync:gcs:sync
npm run sync:gcs:prune
npm run sync:gcs:usage
```

### Conflict Resolution Strategies

**Local wins**: Always push local changes
```powershell
# In sync script (coming)
--strategy local-wins
```

**GCS wins**: Always keep GCS version
```powershell
--strategy gcs-wins
```

**Newest wins** (default): Keep whichever is newer
```powershell
--strategy newest-wins
```

## Monitoring & Alerts

### Usage Dashboard

Create a BigQuery dataset for logging:

```sql
CREATE TABLE `vision-cortex-gcs-metrics` (
  timestamp TIMESTAMP,
  operation STRING,  -- push, pull, prune, sync
  files_processed INT64,
  bytes_transferred INT64,
  duration_seconds FLOAT64,
  status STRING,  -- success, error
  cost FLOAT64
);
```

### Cost Alerts

Set budget alerts in GCP:
1. Go to Billing > Budgets & alerts
2. Set budget for project/bucket
3. Alert at 50%, 90%, 100%
4. Recommended: $5/month per bucket

### Metrics to Track

```sql
-- Daily growth
SELECT DATE(timestamp) as date, SUM(bytes_transferred) as bytes FROM logs GROUP BY date;

-- Sync success rate
SELECT COUNT(*) as total, 
       SUM(IF(status='success', 1, 0)) as successful 
FROM logs WHERE timestamp >= CURRENT_TIMESTAMP() - INTERVAL 7 DAY;

-- Top sync times
SELECT operation, AVG(duration_seconds) as avg_time FROM logs GROUP BY operation;
```

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `gcloud: command not found` | Cloud SDK not installed | `https://cloud.google.com/sdk/docs/install` |
| `Bucket not found` | Wrong bucket name or no access | `gcloud storage ls` to verify |
| `Permission denied` | Service account lacks IAM role | Check IAM bindings in Terraform |
| `Sync too slow` | Syncing too many files | Use `--Include` to filter patterns |
| `High costs` | Too many versions kept | Increase `--PruneAgeDays`, decrease `--MaxVersions` |
| `Conflicts on merge` | Same file modified in multiple sources | Use conflict resolution strategy above |

### Debug Commands

```bash
# Verify authentication
gcloud auth list

# Check bucket access
gcloud storage ls gs://vision-cortex-infinity-x-one/

# List objects with size
gcloud storage ls -h -r gs://vision-cortex-infinity-x-one/

# Check service account IAM
gcloud iam service-accounts get-iam-policy vision-cortex-app@...

# Monitor GCS operations (in Cloud Console)
gcloud logging read "resource.type=gcs_bucket" --limit 50

# Enable debug logging
export GCLOUD_VERBOSITY=debug
./scripts/sync-gcs-bucket.ps1 -Direction sync -Verbose
```

## Migration from Foundation Repo

To move signals and docs from foundation to vision_cortex GCS:

```bash
# 1. Export from foundation
cd ../foundation
find . -name "*.json" -path "*/signals/*" | tar czf signals.tar.gz -T -

# 2. Push to GCS
gcloud storage cp signals.tar.gz gs://vision-cortex-infinity-x-one/archive/

# 3. Extract in Vision Cortex
gcloud storage cp gs://vision-cortex-infinity-x-one/archive/signals.tar.gz .
tar xzf signals.tar.gz

# 4. Sync to GCS
npm run sync:gcs:push
```

## Best Practices

1. **Enable versioning**: Always use `--MaxVersions 2+` for recovery
2. **Compress large files**: Set `--Compress` to reduce egress costs
3. **Regular pruning**: Run prune weekly to keep costs low
4. **Monitor usage**: Check `npm run sync:gcs:usage` monthly
5. **Test restores**: Periodically test pulling old versions
6. **Automate**: Use cron jobs / Task Scheduler for hands-off sync
7. **Log operations**: Keep sync logs for audit trail
8. **Separate concerns**: Keep signals, docs, logs in separate folders

## Support

- **Documentation**: `infra/GCS_CRON_SETUP.md`
- **Terraform**: `infra/gcs-bucket.tf`
- **Scripts**: `scripts/sync-gcs-bucket.ps1`, `scripts/sync-tri-directional.ps1`
- **SDK**: `src/utils/gcs-manager.ts`
