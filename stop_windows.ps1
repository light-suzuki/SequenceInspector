$ErrorActionPreference = "Stop"
$runtime = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) ".runtime"
$stateFile = Join-Path $runtime "run.json"
if (-not (Test-Path $stateFile)) {
  Write-Host "Sequence Inspector is not running."
  exit 0
}
$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$process = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
if ($process) { Stop-Process -Id $process.Id }
Remove-Item $stateFile -Force
Write-Host "Sequence Inspector stopped."
