# PolicyGuard AI — Full Platform Launch Script
# Run this AFTER Docker Desktop is running
# Usage: powershell -ExecutionPolicy Bypass -File .\launch.ps1

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PolicyGuard AI — Platform Launch" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Verify Docker is running ────────────────────────
Write-Host "[1/5] Checking Docker daemon..." -ForegroundColor Yellow
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($dockerInfo -match "Server Version")) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please open Docker Desktop first, wait for the whale icon to stop" -ForegroundColor Red
    Write-Host "   animating in the system tray, then re-run this script." -ForegroundColor Red
    exit 1
}
$serverVersion = ($dockerInfo | Select-String "Server Version").ToString().Trim()
Write-Host "✅ Docker is running — $serverVersion" -ForegroundColor Green

# ── Step 2: Pull base images ─────────────────────────────────
Write-Host ""
Write-Host "[2/5] Pulling base Docker images (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "      → ollama/ollama:latest" -ForegroundColor Gray
docker pull ollama/ollama:latest
Write-Host "      → permitio/cedar-agent:latest" -ForegroundColor Gray
docker pull permitio/cedar-agent:latest
Write-Host "      → nginx:1.27-alpine" -ForegroundColor Gray
docker pull nginx:1.27-alpine
Write-Host "      → python:3.11-slim" -ForegroundColor Gray
docker pull python:3.11-slim
Write-Host "      → node:20-alpine" -ForegroundColor Gray
docker pull node:20-alpine
Write-Host "✅ Base images pulled" -ForegroundColor Green

# ── Step 3: Build local images ───────────────────────────────
Write-Host ""
Write-Host "[3/5] Building backend and agent-runtime images..." -ForegroundColor Yellow
Set-Location $ProjectDir
docker build -t policyguard-backend:latest ./backend
Write-Host "      ✅ Backend image built" -ForegroundColor Green
docker build -t policyguard-agent-runtime:latest ./agent-runtime
Write-Host "      ✅ Agent runtime image built" -ForegroundColor Green

# ── Step 4: Start all services ───────────────────────────────
Write-Host ""
Write-Host "[4/5] Starting all services with docker compose..." -ForegroundColor Yellow
docker compose up -d
Write-Host "✅ Services started" -ForegroundColor Green

# ── Step 5: Pull LLM model ───────────────────────────────────
Write-Host ""
Write-Host "[5/5] Pulling LLM model (qwen2.5:7b — ~5 GB, please wait)..." -ForegroundColor Yellow
Write-Host "      This is a one-time download. Progress shown below:" -ForegroundColor Gray
Write-Host ""

# Wait for Ollama container to be healthy
$retries = 0
while ($retries -lt 30) {
    $health = docker inspect --format "{{.State.Health.Status}}" policyguard-ollama 2>&1
    if ($health -eq "healthy") { break }
    Write-Host "      Waiting for Ollama to start... ($($retries * 5)s)" -ForegroundColor Gray
    Start-Sleep 5
    $retries++
}

# Pull model via Ollama API
$model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "qwen2.5:7b" }
Write-Host "      Pulling model: $model" -ForegroundColor Gray
docker exec policyguard-ollama ollama pull $model

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  ✅ PolicyGuard AI is READY!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Open your browser: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services running:" -ForegroundColor White
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
Write-Host ""
