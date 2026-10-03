param(
    [int]$Trials = 10,
    [int]$TargetProgress = 80000,
    [switch]$Strict,
    [switch]$Prepare
)

$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
$branch = (& git -C $repo branch --show-current).Trim()
if ($branch -ne "lab/cr3e2-local-driver") {
    throw "Run this lab only from branch lab/cr3e2-local-driver. Current branch: $branch"
}

if (-not (Test-Path -LiteralPath (Join-Path $repo "games\rare-shift") -PathType Container)) {
    throw "Run from the rare-shift repository root. Current path: $repo"
}

& git -C $repo diff --quiet -- games/rare-shift
if ($LASTEXITCODE -ne 0) {
    throw "Production gameplay tree has local modifications. Refusing to run the lab."
}
& git -C $repo diff --cached --quiet -- games/rare-shift
if ($LASTEXITCODE -ne 0) {
    throw "Production gameplay tree has staged modifications. Refusing to run the lab."
}

if ($Prepare -or -not (Test-Path -LiteralPath (Join-Path $repo "node_modules") -PathType Container)) {
    Write-Host "LOCAL_LAB_PREPARE=START"
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run typecheck:core
    if ($LASTEXITCODE -ne 0) { throw "typecheck:core failed" }
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "typecheck failed" }
    npm run check
    if ($LASTEXITCODE -ne 0) { throw "FriendSDK check failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "FriendSDK build failed" }
    Write-Host "LOCAL_LAB_PREPARE=PASS"
}

$env:CR3E2_LAB_TRIALS = [string]$Trials
$env:CR3E2_LAB_TARGET = [string]$TargetProgress
$env:CR3E2_LAB_STRICT = if ($Strict) { "1" } else { "0" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $env:TEMP "rare-shift-cr3e2-stage1-lab-$stamp.log"

Write-Host "=============================================="
Write-Host "RARE_SHIFT_CR3E2_LOCAL_STAGE1_LAB=START"
Write-Host "REPO=$repo"
Write-Host "BRANCH=$branch"
Write-Host "HEAD=$((& git -C $repo rev-parse HEAD).Trim())"
Write-Host "TRIALS=$Trials"
Write-Host "TARGET_PROGRESS=$TargetProgress"
Write-Host "STRICT=$([bool]$Strict)"
Write-Host "LOG=$log"
Write-Host "PRODUCTION_MUTATION=FORBIDDEN"
Write-Host "=============================================="

node scripts/local/cr3e2-stage1-reactive-lab.mjs 2>&1 | Tee-Object -FilePath $log
$exitCode = $LASTEXITCODE

Write-Host "=============================================="
Write-Host "RARE_SHIFT_CR3E2_LOCAL_STAGE1_LAB=END"
Write-Host "EXIT_CODE=$exitCode"
Write-Host "LOG=$log"
Write-Host "=============================================="

if ($exitCode -ne 0) {
    exit $exitCode
}
