$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path (Join-Path $root "artifacts") | Out-Null

$commands = @(
    @{ Name = "CORE_TESTS"; Command = { npm run test:core } },
    @{ Name = "TYPECHECK"; Command = { npm run typecheck } },
    @{ Name = "FRIENDSDK_CHECK"; Command = { npm run check } },
    @{ Name = "BUILD"; Command = { npm run build } },
    @{ Name = "FRIENDSDK_SMOKE"; Command = { npm run test:sdk } },
    @{ Name = "RARE_SHIFT_BROWSER"; Command = { npm run test:browser } }
)

foreach ($item in $commands) {
    Write-Host "=== $($item.Name) ==="
    & $item.Command
    if ($LASTEXITCODE -ne 0) { throw "$($item.Name)=FAIL" }
    Write-Host "$($item.Name)=PASS"
}

Write-Host "RARE_SHIFT_T0_QUALIFICATION=PASS"
