# Cron Job Configuration for Vision Cortex GCS Bi-directional Sync

# Run on schedule (Linux/macOS) or Task Scheduler (Windows)

## Linux/macOS Crontab Setup

```bash
# Add to crontab: crontab -e

# Every 6 hours: Bidirectional sync + prune old versions
0 */6 * * * cd /home/user/Infinity_X_One_Systems/Vision_Cortex && pwsh -File scripts/sync-gcs-bucket.ps1 -Direction sync -Prune >> logs/gcs-sync.log 2>&1

# Every 24 hours: Generate usage report
0 2 * * * cd /home/user/Infinity_X_One_Systems/Vision_Cortex && pwsh -File scripts/sync-gcs-bucket.ps1 -Command usage >> logs/gcs-usage.log 2>&1

# Every 4 hours: Push signals to GCS (compress large files)
0 */4 * * * cd /home/user/Infinity_X_One_Systems/Vision_Cortex && pwsh -File scripts/sync-gcs-bucket.ps1 -Direction push -Compress >> logs/gcs-push.log 2>&1
```

## Windows Task Scheduler Setup

```powershell
# Run PowerShell as Administrator

# 1. Create task for bi-directional sync every 6 hours
$action = New-ScheduledTaskAction `
  -Execute 'pwsh.exe' `
  -Argument "-NoProfile -File 'C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-gcs-bucket.ps1' -Direction sync -Prune"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6) -RepetitionDuration (New-TimeSpan -Days 365)

Register-ScheduledTask -TaskName 'Vision-Cortex-GCS-Sync' -Action $action -Trigger $trigger -RunLevel Highest

# 2. Create task for usage report daily at 2 AM
$action = New-ScheduledTaskAction `
  -Execute 'pwsh.exe' `
  -Argument "-NoProfile -File 'C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-gcs-bucket.ps1' -Command usage"

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00am

Register-ScheduledTask -TaskName 'Vision-Cortex-GCS-Usage' -Action $action -Trigger $trigger -RunLevel Highest

# 3. Create task for push with compression every 4 hours
$action = New-ScheduledTaskAction `
  -Execute 'pwsh.exe' `
  -Argument "-NoProfile -File 'C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-gcs-bucket.ps1' -Direction push -Compress"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 365)

Register-ScheduledTask -TaskName 'Vision-Cortex-GCS-Push' -Action $action -Trigger $trigger -RunLevel Highest

# View all scheduled tasks
Get-ScheduledTask | Select-Object TaskName, State, NextRunTime | Where-Object TaskName -match 'Vision-Cortex'

# View detailed task info
Get-ScheduledTaskInfo -TaskName 'Vision-Cortex-GCS-Sync'

# Remove a task
Unregister-ScheduledTask -TaskName 'Vision-Cortex-GCS-Sync' -Confirm:$false
```

## GitHub Actions Workflow (for CI/CD)

```yaml
name: Vision Cortex GCS Sync

on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: infinity-x-one-systems
          service_account_key: ${{ secrets.GCP_SA_KEY }}

      - name: Sync to GCS
        run: |
          gsutil -m cp -r signals/ gs://vision-cortex-infinity-x-one/signals/
          gsutil -m cp -r docs/ gs://vision-cortex-infinity-x-one/docs/

      - name: Prune old versions
        run: |
          gsutil versioning set on gs://vision-cortex-infinity-x-one
          # Cleanup script would run here

      - name: Generate usage report
        run: |
          gsutil du -s gs://vision-cortex-infinity-x-one/ > usage-report.txt
          # Save as artifact

      - uses: actions/upload-artifact@v3
        with:
          name: gcs-usage-report
          path: usage-report.txt
```

## Container-Based Cron (for Kubernetes/Docker)

```yaml
# kubernetes-cron.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vision-cortex-gcs-sync
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vision-cortex-sync
          containers:
            - name: sync
              image: gcr.io/infinity-x-one-systems/vision-cortex:latest
              command:
                - /bin/sh
                - -c
                - npx ts-node scripts/gcs-sync-cron.ts --direction sync --prune
              env:
                - name: GOOGLE_APPLICATION_CREDENTIALS
                  valueFrom:
                    secretKeyRef:
                      name: gcp-credentials
                      key: service-account.json
                - name: GCS_BUCKET
                  value: vision-cortex-infinity-x-one
              resources:
                requests:
                  memory: "512Mi"
                  cpu: "250m"
                limits:
                  memory: "1Gi"
                  cpu: "500m"
          restartPolicy: OnFailure
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vision-cortex-sync
```

## Monitoring & Alerting

### Prometheus Metrics Export

```typescript
// Add to sync script
const syncMetrics = {
  pushed_files: 42,
  skipped_files: 8,
  total_bytes: 1024 * 1024 * 500, // 500 MB
  sync_duration_ms: 3200,
  last_sync: new Date().toISOString(),
  prune_freed_bytes: 1024 * 1024 * 100, // 100 MB freed
};

// Export to Prometheus
console.log("# HELP vision_cortex_gcs_pushed_files Total files pushed");
console.log("# TYPE vision_cortex_gcs_pushed_files gauge");
console.log(`vision_cortex_gcs_pushed_files ${syncMetrics.pushed_files}`);
```

### CloudWatch/Stackdriver Integration

```powershell
# Log sync results to Google Cloud Logging
function Log-ToCloudLogging {
  param([hashtable]$LogEntry)

  $json = $LogEntry | ConvertTo-Json
  & gcloud logging write vision-cortex-sync "$json" `
    --severity=INFO `
    --resource=global
}
```

## Monitoring Dashboard Queries

### Usage Growth Over Time

```sql
SELECT DATE(timestamp) as date, SUM(total_bytes) as bytes
FROM `vision-cortex-gcs-metrics`
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

### Sync Success Rate

```sql
SELECT COUNT(*) as total_syncs,
       SUM(CASE WHEN status='SUCCESS' THEN 1 ELSE 0 END) as successful,
       ROUND(100 * SUM(CASE WHEN status='SUCCESS' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM `vision-cortex-sync-logs`
WHERE timestamp >= TIMESTAMP_SUB(NOW(), INTERVAL 7 DAY);
```

## Manual Test Commands

```bash
# Dry run (no actual sync)
./scripts/sync-gcs-bucket.ps1 -Direction sync -DryRun

# Verbose output
./scripts/sync-gcs-bucket.ps1 -Direction push -Verbose

# Compress and push
./scripts/sync-gcs-bucket.ps1 -Direction push -Compress

# Full prune
./scripts/sync-gcs-bucket.ps1 -Direction prune -MaxVersions 3 -PruneAgeDays 14

# Usage report
./scripts/sync-gcs-bucket.ps1 -Command usage
```

## Troubleshooting

### Issues

| Problem             | Solution                                                              |
| ------------------- | --------------------------------------------------------------------- |
| `gcloud not found`  | Install Google Cloud SDK: `https://cloud.google.com/sdk/docs/install` |
| `Bucket not found`  | Verify bucket name: `gcloud storage ls`                               |
| `Permission denied` | Check service account IAM: `gcloud iam service-accounts list`         |
| `Sync too slow`     | Use `--include` to limit file patterns: `--include='*.json'`          |
| `High costs`        | Increase `MaxVersions`, decrease `PruneAgeDays`, enable `Compress`    |

### Debug Logs

```powershell
# Enable verbose logging
$VerbosePreference = 'Continue'
./scripts/sync-gcs-bucket.ps1 -Direction sync -Verbose

# Tail logs
Get-Content logs/gcs-sync.log -Tail 50 -Wait
```
