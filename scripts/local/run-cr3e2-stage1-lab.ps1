param(
    [int]$Trials = 10,
    [int]$TargetProgress = 80000,
    [switch]$Strict,
    [switch]$Prepare
)

$ErrorActionPreference = "Stop"

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
}
catch {
    # Cosmetic only; do not block the lab if host encoding cannot be changed.
}

$repo = (Get-Location).Path
$branch = (& git -C $repo branch --show-current).Trim()
if ($branch -ne "lab/cr3e2-local-driver") {
    throw "Run this lab only from branch lab/cr3e2-local-driver. Current branch: $branch"
}

if (-not (Test-Path -LiteralPath (Join-Path $repo "games\rare-shift") -PathType Container)) {
    throw "Run from the rare-shift repository root. Current path: $repo"
}

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $false)]
        [string[]]$Arguments = @()
    )

    $previousPreference = $ErrorActionPreference
    try {
        # Git/npm/node/curl legitimately write progress and warnings to stderr.
        # Windows PowerShell can convert those lines into NativeCommandError when
        # ErrorActionPreference=Stop, so judge native commands by exit code only.
        $ErrorActionPreference = "Continue"
        & $FilePath @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "Native command failed with exit code $exitCode`: $FilePath $($Arguments -join ' ')"
    }
}

# Refuse to experiment against locally modified production gameplay files.
$previousPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    & git -C $repo diff --quiet -- games/rare-shift
    $worktreeDiffExit = $LASTEXITCODE
    & git -C $repo diff --cached --quiet -- games/rare-shift
    $cachedDiffExit = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}
if ($worktreeDiffExit -ne 0) {
    throw "Production gameplay tree has local modifications. Refusing to run the lab."
}
if ($cachedDiffExit -ne 0) {
    throw "Production gameplay tree has staged modifications. Refusing to run the lab."
}

$friendSdkVersion = "0.1.3"
$friendSdkRelative = "vendor\rarefriends-friendsdk-$friendSdkVersion.tgz"
$friendSdkArchive = Join-Path $repo $friendSdkRelative
$friendSdkUrl = "https://github.com/spokesz/friendsdk/releases/download/v$friendSdkVersion/rarefriends-friendsdk-$friendSdkVersion.tgz"
$friendSdkSha256 = "8f156c469a15786e3c649b35d092e86ec6242ff30415b7ee7c451763a816e789"

function Ensure-FriendSdkArchive {
    $vendorDir = Split-Path -Parent $friendSdkArchive
    if (-not (Test-Path -LiteralPath $vendorDir -PathType Container)) {
        New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null
    }

    $needsDownload = $true
    if (Test-Path -LiteralPath $friendSdkArchive -PathType Leaf) {
        $actualHash = (Get-FileHash -LiteralPath $friendSdkArchive -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -eq $friendSdkSha256) {
            $needsDownload = $false
            Write-Host "FRIENDSDK_ARCHIVE_EXISTING=PASS"
        }
        else {
            Write-Host "FRIENDSDK_ARCHIVE_HASH_MISMATCH=YES"
            Remove-Item -LiteralPath $friendSdkArchive -Force
        }
    }

    if ($needsDownload) {
        Write-Host "FRIENDSDK_DOWNLOAD=START"
        Invoke-NativeChecked -FilePath "curl.exe" -Arguments @(
            "--fail",
            "--location",
            "--retry", "5",
            "--retry-all-errors",
            "--connect-timeout", "20",
            "--max-time", "180",
            "--output", $friendSdkArchive,
            $friendSdkUrl
        )
    }

    if (-not (Test-Path -LiteralPath $friendSdkArchive -PathType Leaf)) {
        throw "FriendSDK archive missing after download: $friendSdkArchive"
    }

    $verifiedHash = (Get-FileHash -LiteralPath $friendSdkArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "FRIENDSDK_SHA256=$verifiedHash"
    if ($verifiedHash -ne $friendSdkSha256) {
        throw "FriendSDK SHA-256 mismatch. Expected $friendSdkSha256, got $verifiedHash"
    }

    Write-Host "FRIENDSDK_ARCHIVE_VERIFY=PASS"
}

if ($Prepare -or -not (Test-Path -LiteralPath (Join-Path $repo "node_modules") -PathType Container)) {
    Write-Host "LOCAL_LAB_PREPARE=START"

    Ensure-FriendSdkArchive

    Invoke-NativeChecked -FilePath "npm.cmd" -Arguments @("install", "--no-audit", "--no-fund")

    # FriendSDK testGame uses Playwright Chromium. A fresh Windows worktree can
    # have node_modules installed while the matching Playwright browser binary
    # is still absent, so make browser installation part of local preparation.
    Write-Host "PLAYWRIGHT_BROWSER_INSTALL=START"
    Invoke-NativeChecked -FilePath "npx.cmd" -Arguments @("playwright", "install", "chromium")
    Write-Host "PLAYWRIGHT_BROWSER_INSTALL=PASS"

    Invoke-NativeChecked -FilePath "npm.cmd" -Arguments @("run", "typecheck:core")
    Invoke-NativeChecked -FilePath "npm.cmd" -Arguments @("run", "typecheck")
    Invoke-NativeChecked -FilePath "npm.cmd" -Arguments @("run", "check")
    Invoke-NativeChecked -FilePath "npm.cmd" -Arguments @("run", "build")

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

$previousPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    & node "scripts/local/cr3e2-stage1-reactive-lab.mjs" 2>&1 | Tee-Object -FilePath $log
    $exitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}

Write-Host "=============================================="
Write-Host "RARE_SHIFT_CR3E2_LOCAL_STAGE1_LAB=END"
Write-Host "EXIT_CODE=$exitCode"
Write-Host "LOG=$log"
Write-Host "=============================================="

if ($exitCode -ne 0) {
    exit $exitCode
}
