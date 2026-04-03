$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Resolve-Path (Join-Path $scriptDir "..")
$activateScript = Join-Path $backendRoot ".venv\Scripts\Activate.ps1"

if (-not (Test-Path -LiteralPath $activateScript)) {
    Write-Error "Virtual environment not found at $activateScript"
    Write-Host "Create it first with: python -m venv .venv (run inside EN_VISION_BE)"
    return
}

Set-Location -Path $backendRoot
. $activateScript
Write-Host "Backend virtual environment activated: $backendRoot\.venv"
