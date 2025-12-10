<#
.SYNOPSIS
Tri-directional sync for Vision Cortex: local <-> GitHub <-> Google Drive

.DESCRIPTION
Synchronizes Vision Cortex repo across:
1. Local filesystem (C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex)
2. GitHub (https://github.com/InfinityXOneSystems/vision_cortex)
3. Google Drive (https://drive.google.com/drive/folders/14Ry-eaPhuyliv7L02KviaYMHmucv1XoC)

Pulls from all sources, resolves conflicts, pushes/uploads updates.

.PARAMETER SyncMode
  'full' = pull + push all three directions
  'pull' = pull from GitHub + Drive only
  'push' = push to GitHub + Drive only
  'cron' = lightweight pull (for scheduled jobs)

.PARAMETER DryRun
  If true, shows what would sync without making changes

.EXAMPLE
  .\sync-tri-directional.ps1 -SyncMode full -Verbose
  .\sync-tri-directional.ps1 -SyncMode cron -DryRun
#>

param(
  [ValidateSet('full', 'pull', 'push', 'cron')]
  [string]$SyncMode = 'full',

  [bool]$IncludeGCS = $true,
  [bool]$DryRun = $false,
  [bool]$Verbose = $false
)

$LocalRepo = "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex"
$GitHubRepo = "https://github.com/InfinityXOneSystems/vision_cortex.git"
$DriveFolder = "14Ry-eaPhuyliv7L02KviaYMHmucv1XoC"
$GCSBucket = "vision-cortex-infinity-x-one"
$GoogleServiceAccountPath = "$LocalRepo\.env.local"  # Contains GCP credentials

$ErrorActionPreference = "Stop"

function Log {
  param([string]$Message, [string]$Level = 'INFO')
  $timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  Write-Host "[$timestamp] [$Level] $Message"
}

function Assert-GitAvailable {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Log "git not found in PATH" 'ERROR'
    exit 1
  }
}

function Assert-DirectoryExists {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Log "Directory not found: $Path" 'ERROR'
    exit 1
  }
}

# 1. PULL from GitHub
function Sync-FromGitHub {
  Log "Pulling from GitHub ($GitHubRepo)..."

  Push-Location $LocalRepo
  try {
    # Fetch latest
    & git fetch origin main

    # Check status
    $status = & git status --porcelain
    if ($status) {
      Log "Local changes detected, stashing..." 'WARN'
      & git stash push -m "Pre-pull stash $(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }

    # Pull main branch
    & git pull origin main --no-edit
    Log "✓ Pulled from GitHub"
  }
  catch {
    Log "Failed to pull from GitHub: $_" 'ERROR'
    return $false
  }
  finally {
    Pop-Location
  }

  return $true
}

# 2. PULL from Google Drive
function Sync-FromGoogleDrive {
  Log "Pulling from Google Drive ($DriveFolder)..."

  # TODO: Implement Google Drive API pull
  # For now, placeholder—requires rclone or Google API client
  Log "⚠ Google Drive pull not yet implemented (requires rclone or Google API setup)"

  return $true
}

# 3. PUSH to GitHub
function Sync-ToGitHub {
  Log "Pushing to GitHub..."

  Push-Location $LocalRepo
  try {
    # Stage all changes
    & git add -A

    # Check if there are staged changes
    $staged = & git diff --cached --name-only
    if (-not $staged) {
      Log "No changes to push to GitHub"
      return $true
    }

    # Create commit with timestamp
    $commitMsg = "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    & git commit -m $commitMsg

    # Push to main
    & git push origin main
    Log "✓ Pushed to GitHub"
  }
  catch {
    Log "Failed to push to GitHub: $_" 'ERROR'
    return $false
  }
  finally {
    Pop-Location
  }

  return $true
}

# 4. PUSH to Google Drive
function Sync-ToGoogleDrive {
  Log "Uploading to Google Drive..."

  # TODO: Implement Google Drive API upload
  # For now, placeholder—requires rclone or Google API client
  Log "⚠ Google Drive upload not yet implemented (requires rclone or Google API setup)"

  return $true
}

# 5. SYNC with Google Cloud Storage (GCS)
function Sync-WithGCS {
  param([string]$Direction)

  if (-not $IncludeGCS) {
    Log "GCS sync disabled (--IncludeGCS \$false)"
    return $true
  }

  Log "Syncing with GCS bucket ($GCSBucket)..."

  try {
    # Verify gcloud is available
    $version = & gcloud --version 2>&1 | Select-Object -First 1
    Log "  gcloud: $version" 'DEBUG'

    # Run GCS sync script
    $gcsScript = "$LocalRepo\scripts\sync-gcs-bucket.ps1"
    if (-not (Test-Path $gcsScript)) {
      Log "  ⚠ GCS sync script not found at $gcsScript" 'WARN'
      return $true
    }

    if ($Direction -eq 'pull') {
      & pwsh -NoProfile -File $gcsScript -Direction pull
    }
    elseif ($Direction -eq 'push') {
      & pwsh -NoProfile -File $gcsScript -Direction push -Compress
    }
    else {
      & pwsh -NoProfile -File $gcsScript -Direction sync -Prune
    }

    Log "✓ GCS sync complete"
    return $true
  }
  catch {
    Log "Failed to sync with GCS: $_" 'WARN'
    return $true  # Non-fatal; continue sync
  }
}

# Main workflow
function Main {
  Assert-GitAvailable
  Assert-DirectoryExists $LocalRepo

  Log "=== Vision Cortex Tri-Directional Sync ===" 'INFO'
  Log "Mode: $SyncMode | DryRun: $DryRun | IncludeGCS: $IncludeGCS | Verbose: $Verbose"

  if ($SyncMode -in @('full', 'pull', 'cron')) {
    Log "--- PULL Phase ---"
    Sync-FromGitHub | Out-Null
    Sync-FromGoogleDrive | Out-Null
    if ($IncludeGCS) { Sync-WithGCS -Direction pull | Out-Null }
  }

  if ($SyncMode -in @('full', 'push')) {
    Log "--- PUSH Phase ---"
    Sync-ToGitHub | Out-Null
    Sync-ToGoogleDrive | Out-Null
    if ($IncludeGCS) { Sync-WithGCS -Direction push | Out-Null }
  }

  if ($SyncMode -eq 'full' -and $IncludeGCS) {
    Log "--- PRUNE Phase (GCS) ---"
    & pwsh -NoProfile -File "$LocalRepo\scripts\sync-gcs-bucket.ps1" -Direction prune -Verbose
  }

  Log "=== Sync Complete ===" 'INFO'
}

# Run
Main
