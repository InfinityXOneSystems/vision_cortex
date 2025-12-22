#!/usr/bin/env pwsh

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$FullCycle,
    [switch]$Logs
)

$ErrorActionPreference = "Stop"

Write-Host "🤖 Vision Cortex Agent System Manager" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

if ($Start) {
    Write-Host "🚀 Starting Vision Cortex Agent System..." -ForegroundColor Green
    
    # Start Redis if not running
    Write-Host "📡 Starting Redis..." -ForegroundColor Yellow
    docker-compose -f docker-compose.agents.yml up -d redis
    
    # Wait for Redis
    Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Start agents
    Write-Host "🤖 Starting all 8 agents..." -ForegroundColor Yellow
    npm run agents:start
}
elseif ($Stop) {
    Write-Host "🛑 Stopping Vision Cortex Agent System..." -ForegroundColor Red
    docker-compose -f docker-compose.agents.yml down
    Write-Host "✅ System stopped" -ForegroundColor Green
}
elseif ($Status) {
    Write-Host "📊 Checking system status..." -ForegroundColor Yellow
    
    # Check Redis
    $redisRunning = docker ps --filter "name=vision-cortex-redis" --format "table {{.Names}}" | Select-String "vision-cortex-redis"
    if ($redisRunning) {
        Write-Host "✅ Redis: Running" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis: Not running" -ForegroundColor Red
    }
    
    # Check agents status
    try {
        npm run agents:status
    } catch {
        Write-Host "❌ Agents: Not running or error" -ForegroundColor Red
    }
}
elseif ($FullCycle) {
    Write-Host "🔄 Running full intelligence cycle..." -ForegroundColor Magenta
    npm run agents:full-cycle
}
elseif ($Logs) {
    Write-Host "📋 Showing agent logs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.agents.yml logs -f vision-cortex-agents
}
else {
    Write-Host @"
Usage: ./manage-agents.ps1 [OPTIONS]

OPTIONS:
  -Start      Start the complete agent system (Redis + 8 agents)
  -Stop       Stop all services
  -Status     Check system status
  -FullCycle  Run one complete intelligence cycle
  -Logs       Show agent logs

EXAMPLES:
  ./manage-agents.ps1 -Start        # Start everything
  ./manage-agents.ps1 -Status       # Check status
  ./manage-agents.ps1 -FullCycle    # Run one cycle
  ./manage-agents.ps1 -Stop         # Stop everything

WORKFLOW STAGES:
  1. Crawl     → Acquire data from court, FDA, LinkedIn
  2. Ingest    → Normalize and structure signals
  3. Predict   → Generate market predictions  
  4. Envision  → Create strategic vision
  5. Strategize → Formulate action plans
  6. Validate  → Assess risks and validate
  7. Evolve    → Learn and adapt system
  8. Document  → Capture knowledge
"@ -ForegroundColor White
}