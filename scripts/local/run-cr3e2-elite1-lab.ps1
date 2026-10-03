param(
    [int]$Trials = 3,
    [string]$BrowserExecutable = ""
)

$ErrorActionPreference = "Stop"

try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [Console]::OutputEncoding
}
catch {
    # Cosmetic only.
}

$repo = (Get-Location).Path
$branch = (& git -C $repo branch --show-current).Trim()
if ($branch -ne "lab/cr3e2-local-driver") {
    throw "Run this lab only from branch lab/cr3e2-local-driver. Current branch: $branch"
}

if (-not (Test-Path -LiteralPath (Join-Path $repo "games\rare-shift") -PathType Container)) {
    throw "Run from the rare-shift repository root. Current path: $repo"
}

# Never experiment against locally modified production gameplay.
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
if ($worktreeDiffExit -ne 0 -or $cachedDiffExit -ne 0) {
    throw "Production gameplay tree has local/staged modifications. Refusing to run the lab."
}

function Find-SystemBrowser {
    param([string]$Preferred = "")

    $candidates = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($Preferred)) {
        $candidates.Add($Preferred)
    }

    $programFilesX86 = ${env:ProgramFiles(x86)}
    $programFiles = $env:ProgramFiles
    $localAppData = $env:LOCALAPPDATA

    foreach ($candidate in @(
        $(if ($programFilesX86) { Join-Path $programFilesX86 "Microsoft\Edge\Application\msedge.exe" }),
        $(if ($programFiles) { Join-Path $programFiles "Microsoft\Edge\Application\msedge.exe" }),
        $(if ($localAppData) { Join-Path $localAppData "Microsoft\Edge\Application\msedge.exe" }),
        $(if ($programFiles) { Join-Path $programFiles "Google\Chrome\Application\chrome.exe" }),
        $(if ($programFilesX86) { Join-Path $programFilesX86 "Google\Chrome\Application\chrome.exe" }),
        $(if ($localAppData) { Join-Path $localAppData "Google\Chrome\Application\chrome.exe" })
    )) {
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            $candidates.Add($candidate)
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw "No installed Edge/Chrome executable was found. Re-run with -BrowserExecutable 'C:\path\to\browser.exe'."
}

function Patch-FriendSdkTestLauncher {
    param([Parameter(Mandatory = $true)][string]$ExecutablePath)

    $helper = Join-Path $repo "node_modules\@rarefriends\friendsdk\scripts\testing.mjs"
    if (-not (Test-Path -LiteralPath $helper -PathType Leaf)) {
        throw "FriendSDK testing helper is missing. Run .\scripts\local\run-cr3e2-stage1-lab.ps1 -Prepare -Trials 1 first."
    }

    $original = 'browser = await chromium.launch({ headless: true });'
    $patched = 'browser = await chromium.launch({ headless: true, ...(process.env.CR3E2_BROWSER_EXECUTABLE ? { executablePath: process.env.CR3E2_BROWSER_EXECUTABLE } : {}) });'
    $content = [System.IO.File]::ReadAllText($helper)

    if ($content.Contains($patched)) {
        Write-Host "FRIENDSDK_TEST_LAUNCHER_PATCH=EXISTING"
    }
    elseif ($content.Contains($original)) {
        $content = $content.Replace($original, $patched)
        [System.IO.File]::WriteAllText($helper, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "FRIENDSDK_TEST_LAUNCHER_PATCH=PASS"
    }
    else {
        throw "FriendSDK testing launcher no longer matches the reviewed v0.1.3 launch contract."
    }

    $env:CR3E2_BROWSER_EXECUTABLE = $ExecutablePath
}

$systemBrowser = Find-SystemBrowser -Preferred $BrowserExecutable
Patch-FriendSdkTestLauncher -ExecutablePath $systemBrowser
$env:CR3E2_ELITE1_TRIALS = [string]$Trials

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $env:TEMP "rare-shift-cr3e2-elite1-lab-$stamp.log"

Write-Host "=============================================="
Write-Host "RARE_SHIFT_CR3E2_ELITE1_LAB=START"
Write-Host "REPO=$repo"
Write-Host "BRANCH=$branch"
Write-Host "HEAD=$((& git -C $repo rev-parse HEAD).Trim())"
Write-Host "TRIALS=$Trials"
Write-Host "BROWSER=$systemBrowser"
Write-Host "LOG=$log"
Write-Host "TARGET=ELITE_I_DEFEAT_CORE_REWARD_STAGE_II_RESUME"
Write-Host "PRODUCTION_MUTATION=FORBIDDEN"
Write-Host "GITHUB_ACTIONS=NO"
Write-Host "=============================================="

$previousPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = "Continue"
    & node "scripts/local/cr3e2-elite1-transition-lab.mjs" 2>&1 | Tee-Object -FilePath $log
    $exitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}

Write-Host "=============================================="
Write-Host "RARE_SHIFT_CR3E2_ELITE1_LAB=END"
Write-Host "EXIT_CODE=$exitCode"
Write-Host "LOG=$log"
Write-Host "=============================================="

if ($exitCode -ne 0) {
    exit $exitCode
}
