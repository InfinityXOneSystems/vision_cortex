<#
.SYNOPSIS
Sync credentials from local .env.local to GitHub Secrets + Google Cloud Secret Manager

.DESCRIPTION
Reads .env.local (never committed), parses environment variables, and syncs to:
1. GitHub organization-level secrets (INF_* prefix)
2. Google Cloud Secret Manager (vision-cortex-* prefix)

Supports bi-directional sync:
- --pull: Download from GitHub/GCP to local .env.local
- --push: Upload from local .env.local to GitHub/GCP
- --sync: Full bidirectional merge

.EXAMPLE
  .\sync-secrets.ps1 -Direction push -Verbose
  .\sync-secrets.ps1 -Direction pull
  .\sync-secrets.ps1 -Direction sync
#>

param(
  [ValidateSet('push', 'pull', 'sync')]
  [string]$Direction = 'sync',

  [bool]$DryRun = $false,
  [bool]$Verbose = $false
)

$LocalRepo = "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex"
$EnvFile = "$LocalRepo\.env.local"
$GitHubOrg = "InfinityXOneSystems"
$GCPProject = "infinity-x-one-systems"

$ErrorActionPreference = "Stop"

function Log {
  param([string]$Message, [string]$Level = 'INFO')
  $timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  Write-Host "[$timestamp] [$Level] $Message"
}

# 1. READ local .env.local
function Read-LocalEnv {
  if (-not (Test-Path $EnvFile)) {
    Log "No .env.local found at $EnvFile" 'WARN'
    return @{}
  }

  $env = @{}
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -and -not $_.StartsWith('#')) {
      $parts = $_ -split '=', 2
      if ($parts.Count -eq 2) {
        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"', "'")
        $env[$key] = $value
      }
    }
  }

  Log "Loaded $(($env.Count)) secrets from .env.local"
  return $env
}

# 2. PUSH to GitHub Secrets (org-level)
function Push-ToGitHubSecrets {
  param([hashtable]$Env)

  Log "Pushing secrets to GitHub org ($GitHubOrg)..."

  $failed = @()
  foreach ($key in $Env.Keys) {
    if ($key -match '^INF_' -or $key -match '^INGEST_') {
      $secretValue = $Env[$key]

      if ($DryRun) {
        Log "  [DRY-RUN] Would set GitHub secret: $key" 'INFO'
        continue
      }

      try {
        # Use GitHub CLI (gh) to set organization secret
        # Requires: gh auth login and org admin access
        & gh secret set $key --body $secretValue --org $GitHubOrg 2>&1 | Out-Null
        Log "  âœ“ $key â†’ GitHub Secrets"
      }
      catch {
        Log "  âœ— Failed to set $key: $_" 'ERROR'
        $failed += $key
      }
    }
  }

  if ($failed.Count -gt 0) {
    Log "Failed to push $($failed.Count) secrets to GitHub" 'WARN'
    return $false
  }

  Log "âœ“ Pushed secrets to GitHub"
  return $true
}

# 3. PUSH to Google Cloud Secret Manager
function Push-ToGCPSecrets {
  param([hashtable]$Env)

  Log "Pushing secrets to Google Cloud Secret Manager (project: $GCPProject)..."

  $failed = @()
  foreach ($key in $Env.Keys) {
    if ($key -match '^INF_' -or $key -match '^INGEST_' -or $key -match '^REDIS_') {
      $secretValue = $Env[$key]
      $secretName = "vision-cortex-$($key.ToLower())"

      if ($DryRun) {
        Log "  [DRY-RUN] Would set GCP secret: $secretName" 'INFO'
        continue
      }

      try {
        # Check if secret exists; create or update accordingly
        $exists = & gcloud secrets describe $secretName --project=$GCPProject 2>&1

        if ($exists) {
          # Add new version
          echo $secretValue | & gcloud secrets versions add $secretName --data-file=- --project=$GCPProject | Out-Null
        }
        else {
          # Create new secret
          echo $secretValue | & gcloud secrets create $secretName --data-file=- --project=$GCPProject | Out-Null
        }

        Log "  âœ“ $secretName â†’ GCP Secret Manager"
      }
      catch {
        Log "  âœ— Failed to set $secretName: $_" 'ERROR'
        $failed += $secretName
      }
    }
  }

  if ($failed.Count -gt 0) {
    Log "Failed to push $($failed.Count) secrets to GCP" 'WARN'
    return $false
  }

  Log "âœ“ Pushed secrets to GCP"
  return $true
}

# 4. PULL from GitHub Secrets
function Pull-FromGitHubSecrets {
  Log "Pulling secrets from GitHub org ($GitHubOrg)..."

  $secrets = @{}

  try {
    # List all org secrets (requires jq or manual parsing)
    # Note: GitHub API doesn't list secret values (security); only pull what you know about
    Log "âš  GitHub secret list not directly accessible (API limitation); use manual approach or GitHub CLI"
    return $secrets
  }
  catch {
    Log "Failed to pull from GitHub: $_" 'WARN'
    return $secrets
  }
}

# 5. PULL from Google Cloud Secret Manager
function Pull-FromGCPSecrets {
  Log "Pulling secrets from GCP Secret Manager..."

  $secrets = @{}

  try {
    # List all secrets with 'vision-cortex-' prefix
    $secretList = & gcloud secrets list --project=$GCPProject --filter="labels.app:vision-cortex" --format=json | ConvertFrom-Json

    foreach ($secret in $secretList) {
      $secretName = $secret.name
      $key = $secretName -replace '^vision-cortex-', '' | ForEach-Object { $_.ToUpper() }

      # Get latest version value
      $value = & gcloud secrets versions access latest --secret=$secretName --project=$GCPProject
      $secrets[$key] = $value.Trim()
      Log "  âœ“ $secretName â†’ local"
    }

    return $secrets
  }
  catch {
    Log "Failed to pull from GCP: $_" 'WARN'
    return $secrets
  }
}

# 6. MERGE and WRITE .env.local
function Write-LocalEnv {
  param([hashtable]$Env)

  $content = $Env.GetEnumerator() | Sort-Object Name | ForEach-Object {
    "$($_.Key)=$($_.Value)"
  }

  if ($DryRun) {
    Log "[DRY-RUN] Would write $($Env.Count) vars to .env.local"
    return
  }

  $content | Set-Content -Path $EnvFile -Encoding UTF8
  Log "âœ“ Wrote .env.local with $($Env.Count) variables"
}

# Main workflow
function Main {
  Log "=== Vision Cortex Credential Sync ===" 'INFO'
  Log "Direction: $Direction | DryRun: $DryRun"

  $localEnv = Read-LocalEnv

  switch ($Direction) {
    'push' {
      Log "--- PUSH Phase ---"
      Push-ToGitHubSecrets $localEnv | Out-Null
      Push-ToGCPSecrets $localEnv | Out-Null
    }

    'pull' {
      Log "--- PULL Phase ---"
      $githubSecrets = Pull-FromGitHubSecrets
      $gcpSecrets = Pull-FromGCPSecrets

      # Merge (GCP takes precedence)
      $merged = $localEnv.Clone()
      $gcpSecrets.GetEnumerator() | ForEach-Object {
        $merged[$_.Key] = $_.Value
      }

      Write-LocalEnv $merged
    }

    'sync' {
      Log "--- SYNC Phase (pull + push) ---"

      # Pull first
      $githubSecrets = Pull-FromGitHubSecrets
      $gcpSecrets = Pull-FromGCPSecrets

      $merged = $localEnv.Clone()
      $gcpSecrets.GetEnumerator() | ForEach-Object {
        $merged[$_.Key] = $_.Value
      }

      # Write merged back to local
      Write-LocalEnv $merged

      # Push new merged state
      Push-ToGitHubSecrets $merged | Out-Null
      Push-ToGCPSecrets $merged | Out-Null
    }
  }

  Log "=== Credential Sync Complete ===" 'INFO'
}

# Run
Main

