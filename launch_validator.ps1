#!/usr/bin/env powershell
<#
.SYNOPSIS
    Auto Code Validator & Commit Agent Launcher
    
.DESCRIPTION
    Launches the automated code validation, commit, and push pipeline.
    Supports continuous monitoring mode.
    
.EXAMPLE
    .\launch_validator.ps1 -Mode validate-only
    .\launch_validator.ps1 -Mode continuous -Interval 10
    .\launch_validator.ps1 -Mode auto-push
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("validate-only", "auto-commit", "auto-push", "continuous", "status")]
    [string]$Mode = "auto-push",
    
    [Parameter(Mandatory=$false)]
    [int]$Interval = 5,
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = (Get-Location).Path,
    
    [Parameter(Mandatory=$false)]
    [string]$Config = "validator_config.json",
    
    [Parameter(Mandatory=$false)]
    [switch]$NoPush,
    
    [Parameter(Mandatory=$false)]
    [string]$Report
)

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $Colors[$Type]
    Write-Host $Message -ForegroundColor $color
}

function Get-PythonExecutable {
    $pythonPath = "$PSScriptRoot\.venv\Scripts\python.exe"
    if (Test-Path $pythonPath) {
        return $pythonPath
    }
    
    # Try global python
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return "python"
    }
    
    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        return "python3"
    }
    
    throw "Python not found. Please install Python or activate a virtual environment."
}

function Show-Banner {
    Write-Host ""
    Write-Host "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—" -ForegroundColor $Colors.Header
    Write-Host "â•‘                  AUTO CODE VALIDATOR & COMMIT AGENT                        â•‘" -ForegroundColor $Colors.Header
    Write-Host "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor $Colors.Header
    Write-Host ""
}

function Show-Usage {
    Write-Host "Usage: .\launch_validator.ps1 [options]`n" -ForegroundColor $Colors.Header
    Write-Host "Modes:" -ForegroundColor $Colors.Header
    Write-Host "  validate-only   - Only validate, don't commit or push"
    Write-Host "  auto-commit     - Validate and commit (no push)"
    Write-Host "  auto-push       - Validate, commit, and push (DEFAULT)"
    Write-Host "  continuous      - Continuous monitoring mode"
    Write-Host "  status          - Show monitor status"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $Colors.Header
    Write-Host "  -Mode <mode>       - Execution mode (default: auto-push)"
    Write-Host "  -Interval <sec>    - Monitor check interval (default: 5)"
    Write-Host "  -Repo <path>       - Repository path (default: current)"
    Write-Host "  -Config <file>     - Config file (default: validator_config.json)"
    Write-Host "  -NoPush            - Disable push to remote"
    Write-Host "  -Report <file>     - Save report to JSON file"
    Write-Host ""
}

function Launch-Validator {
    param(
        [string]$Mode,
        [int]$Interval,
        [string]$Repo,
        [string]$Config,
        [bool]$Push = $true,
        [string]$Report
    )
    
    $python = Get-PythonExecutable
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $validatorScript = Join-Path $scriptDir "auto_code_validator_agent.py"
    
    if (-not (Test-Path $validatorScript)) {
        Write-Status "âœ— Validator script not found: $validatorScript" "Error"
        return $false
    }
    
    $arguments = @()
    $arguments += "--repo", $Repo
    $arguments += "--config", $Config
    
    # Set logging
    [Environment]::SetEnvironmentVariable("PYTHONIOENCODING", "utf-8", "Process")
    
    switch ($Mode) {
        "validate-only" {
            Write-Status "ðŸ” Running validation only..." "Info"
            $arguments += "--validate-only"
        }
        "auto-commit" {
            Write-Status "âœ“ Running validation and commit..." "Info"
            $arguments += "--no-push"
        }
        "auto-push" {
            Write-Status "ðŸš€ Running validation, commit, and push..." "Info"
            if (-not $Push) {
                $arguments += "--no-push"
            }
        }
        "continuous" {
            Write-Status "â± Starting continuous monitor (interval: ${Interval}s)..." "Info"
            $monitorScript = Join-Path $scriptDir "validation_monitor.py"
            
            if (-not (Test-Path $monitorScript)) {
                Write-Status "âœ— Monitor script not found: $monitorScript" "Error"
                return $false
            }
            
            $arguments = @(
                $monitorScript,
                "--repo", $Repo,
                "--config", $Config,
                "--interval", $Interval
            )
            
            & $python @arguments
            return $LASTEXITCODE -eq 0
        }
    }
    
    if ($Report) {
        $arguments += "--report", $Report
    }
    
    # Run validator
    Write-Host ""
    & $python $validatorScript @arguments
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    
    if ($exitCode -eq 0) {
        Write-Status "âœ“ Operation completed successfully" "Success"
    } else {
        Write-Status "âœ— Operation failed (exit code: $exitCode)" "Error"
    }
    
    return $exitCode -eq 0
}

# Main execution
Show-Banner

if ($Mode -eq "status") {
    Show-Usage
    Write-Status "Monitor Status Mode Not Yet Implemented" "Warning"
    exit 0
}

if ($Mode -eq "continuous") {
    $monitorScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "validation_monitor.py"
    Write-Status "â„¹ Press Ctrl+C to stop monitoring" "Info"
    Write-Host ""
}

$success = Launch-Validator -Mode $Mode -Interval $Interval -Repo $Repo -Config $Config -Push (-not $NoPush) -Report $Report

if ($success) {
    exit 0
} else {
    exit 1
}

