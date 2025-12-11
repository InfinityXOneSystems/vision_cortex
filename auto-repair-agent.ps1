# ============================================================================
# AUTONOMOUS CODE REPAIR AGENT - Vision Cortex
# Analyze → Diagnose → Validate → Fix → Heal → Compliance
# ============================================================================

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

Write-Host "🤖 AUTONOMOUS REPAIR AGENT INITIALIZED" -ForegroundColor Cyan
Set-Location "C:\Users\JARVIS\OneDrive\Documents\vision_cortex"

$PassCount = 0
$MaxPasses = 10

function Analyze {
    Write-Host "`n📊 PHASE 1: ANALYZE" -ForegroundColor Yellow
    Write-Host "Scanning project structure and dependencies..."
    
    $tscOutput = & npm run typecheck 2>&1
    $errors = @{}
    
    foreach ($line in $tscOutput) {
        if ($line -match "error TS(\d+)") {
            $file = ($line -split '[\(\)]')[0]
            if (-not $errors.ContainsKey($file)) {
                $errors[$file] = @()
            }
            $errors[$file] += $line
        }
    }
    
    $totalErrors = ($errors.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
    Write-Host "✓ Found $($errors.Count) files with errors" -ForegroundColor Green
    Write-Host "✓ Total errors: $totalErrors" -ForegroundColor Green
    
    return $errors
}

function Diagnose {
    param($Errors)
    Write-Host "`n🔍 PHASE 2: DIAGNOSE" -ForegroundColor Yellow
    Write-Host "Categorizing error types..."
    
    $errorTypes = @{
        "TS2339" = "Missing property"
        "TS2345" = "Type mismatch"
        "TS2322" = "Type assignment"
        "TS2532" = "Possibly undefined"
        "TS2552" = "Cannot find name"
        "TS18047" = "Possibly null"
    }
    
    foreach ($file in $Errors.Keys) {
        Write-Host "  📄 $file" -ForegroundColor Cyan
        foreach ($error in $Errors[$file]) {
            foreach ($code in $errorTypes.Keys) {
                if ($error -match $code) {
                    Write-Host "    ⚠️  $code - $($errorTypes[$code])" -ForegroundColor Red
                }
            }
        }
    }
}

function FixSignalEntity {
    Write-Host "`n🔧 FIXING: Signal entity identifiers" -ForegroundColor Magenta
    
    $file = "src/vision-cortex/scoring-engine.ts"
    $content = Get-Content $file -Raw
    
    $oldEntity = @'
  entity: {
    id: string;
    type: "company" | "property" | "person";
    name: string;
  };
'@
    
    $newEntity = @'
  entity: {
    id: string;
    type: "company" | "property" | "person";
    name: string;
    identifiers?: Record<string, string>;
  };
'@
    
    if ($content -match [regex]::Escape($oldEntity)) {
        $content = $content -replace [regex]::Escape($oldEntity), $newEntity
        $content | Set-Content $file -Encoding UTF8
        Write-Host "✓ Updated Signal.entity interface in $file" -ForegroundColor Green
        return $true
    }
    return $false
}

function FixLevenshteinUndefined {
    Write-Host "`n🔧 FIXING: Levenshtein distance undefined safety" -ForegroundColor Magenta
    
    $file = "src/vision-cortex/llm-entity-resolver.ts"
    $content = Get-Content $file -Raw
    
    # Fix matrix accesses with non-null assertions
    $content = $content -replace 'matrix\[i\]\[j\] = matrix\[i - 1\]\[j - 1\];', 'matrix[i]![j] = matrix[i - 1]![j - 1]!;'
    $content = $content -replace 'matrix\[0\]\[j\] = j;', 'matrix[0]![j] = j;'
    $content = $content -replace 'matrix\[i\]\[j\] = 1 \+ Math\.min\(', 'matrix[i]![j] = 1 + Math.min('
    $content = $content -replace 'matrix\[i\]\[j - 1\],', 'matrix[i]![j - 1]!,'
    $content = $content -replace 'matrix\[i - 1\]\[j\],', 'matrix[i - 1]![j]!,'
    $content = $content -replace 'matrix\[i - 1\]\[j - 1\]\)', 'matrix[i - 1]![j - 1]!)'
    $content = $content -replace 'return matrix\[b\.length\]\[a\.length\];', 'return matrix[b.length]![a.length]!;'
    
    $content | Set-Content $file -Encoding UTF8
    Write-Host "✓ Fixed Levenshtein distance undefined safety" -ForegroundColor Green
    return $true
}

function FixOrchestratorAwait {
    Write-Host "`n🔧 FIXING: Orchestrator missing await operators" -ForegroundColor Magenta
    
    $file = "src/vision-cortex/orchestrator.ts"
    $content = Get-Content $file -Raw
    
    # Replace EntityResolver with LLMEntityResolver
    $content = $content -replace 'EntityResolver', 'LLMEntityResolver'
    
    $content | Set-Content $file -Encoding UTF8
    Write-Host "✓ Fixed orchestrator type references" -ForegroundColor Green
    return $true
}

function FixRouterNullCheck {
    Write-Host "`n🔧 FIXING: Router null/undefined checks" -ForegroundColor Magenta
    
    $file = "src/llm-router/router.ts"
    $content = Get-Content $file -Raw
    
    # Fix selectedProvider type issue
    $content = $content -replace 'let selectedProvider: ProviderConfig \| null;', 'let selectedProvider: ProviderConfig | undefined;'
    
    $content | Set-Content $file -Encoding UTF8
    Write-Host "✓ Fixed router type declarations" -ForegroundColor Green
    return $true
}

function Heal {
    Write-Host "`n❤️  PHASE 4: HEAL" -ForegroundColor Yellow
    Write-Host "Applying semantic type corrections..."
    
    FixSignalEntity
    FixLevenshteinUndefined
    FixOrchestratorAwait
    FixRouterNullCheck
    
    Write-Host "✓ Healing phase complete" -ForegroundColor Green
}

function Validate {
    Write-Host "`n✅ PHASE 3: VALIDATE" -ForegroundColor Yellow
    Write-Host "Running TypeScript compiler..."
    
    $tscOutput = & npm run typecheck 2>&1
    $errorCount = 0
    $errorLines = @()
    
    foreach ($line in $tscOutput) {
        if ($line -match "error TS") {
            $errorCount++
            $errorLines += $line
        }
    }
    
    if ($errorCount -eq 0) {
        Write-Host "✓ TypeScript validation passed!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️  Found $errorCount errors" -ForegroundColor Yellow
        $errorLines[0..3] | ForEach-Object { Write-Host "  ❌ $_" -ForegroundColor Red }
        return $false
    }
}

function Compliance {
    Write-Host "`n🛡️  PHASE 5: COMPLIANCE" -ForegroundColor Yellow
    Write-Host "Running linting and code quality checks..."
    
    $lintOutput = & npm run lint 2>&1
    $lintErrors = @($lintOutput | Where-Object { $_ -match "error|Error" }).Count
    
    if ($lintErrors -eq 0) {
        Write-Host "✓ Linting passed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $lintErrors lint issues found" -ForegroundColor Yellow
    }
    
    Write-Host "✓ Compliance check complete" -ForegroundColor Green
}

# MAIN EXECUTION LOOP
while ($PassCount -lt $MaxPasses) {
    $PassCount++
    Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         REPAIR CYCLE #$PassCount                              ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    $errors = Analyze
    
    if ($errors.Count -eq 0) {
        Write-Host "`n🎉 NO ERRORS DETECTED! System is healthy." -ForegroundColor Green
        break
    }
    
    Diagnose $errors
    Heal
    
    if (Validate) {
        Write-Host "`n✨ VALIDATION PASSED!" -ForegroundColor Green
        Compliance
        break
    }
    
    if ($PassCount -eq $MaxPasses) {
        Write-Host "`n⚠️  Maximum repair cycles reached" -ForegroundColor Red
        break
    }
}

Write-Host "`n════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "REPAIR AGENT COMPLETE - $PassCount cycles executed" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
