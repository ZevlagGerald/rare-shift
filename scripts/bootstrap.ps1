$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root "vendor"
$sdk = Join-Path $vendor "rarefriends-friendsdk-0.1.2.tgz"
$expectedSdkSha = "a6352e187916089b6829c5387fe87f386c5774004f181990e4e3c8ae641cfe83"
$sdkUrl = "https://github.com/spokesz/friendsdk/releases/download/v0.1.2/rarefriends-friendsdk-0.1.2.tgz"

New-Item -ItemType Directory -Force -Path $vendor | Out-Null
Set-Location $root

$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw "Node.js 22+ is required." }

if (-not (Test-Path $sdk)) {
    Write-Host "Downloading FriendSDK v0.1.2..."
    Invoke-WebRequest -UseBasicParsing -Uri $sdkUrl -OutFile $sdk
}

$actualSdkSha = (Get-FileHash -LiteralPath $sdk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSdkSha -ne $expectedSdkSha) {
    throw "FriendSDK archive hash mismatch. Expected $expectedSdkSha, got $actualSdkSha"
}
Write-Host "FRIENDSDK_SHA256=PASS"

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

npm run test:core
if ($LASTEXITCODE -ne 0) { throw "core tests failed." }

npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript typecheck failed." }

npm run check
if ($LASTEXITCODE -ne 0) { throw "friendsdk check failed." }

Write-Host "RARE_SHIFT_T0_BOOTSTRAP=PASS"
Write-Host "Run: npm run dev"
