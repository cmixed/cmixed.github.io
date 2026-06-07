$tmp = Join-Path $env:TEMP "cmixed-build"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

robocopy (Get-Location) $tmp /E /XD ".git" "node_modules" "dist" /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS 2>$null | Out-Null

Push-Location $tmp
npm install --silent 2>$null
npm run build
Pop-Location

if (Test-Path (Join-Path $tmp "dist")) {
    if (Test-Path (Join-Path (Get-Location) "dist")) {
        Remove-Item -Recurse -Force (Join-Path (Get-Location) "dist")
    }
    Move-Item (Join-Path $tmp "dist") (Join-Path (Get-Location) "dist") -Force
}

Remove-Item -Recurse -Force $tmp
