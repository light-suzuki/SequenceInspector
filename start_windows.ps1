$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtime = Join-Path $root ".runtime"
New-Item -ItemType Directory -Force $runtime | Out-Null

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction Stop }

$port = $null
foreach ($candidate in 8765..8785) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
  try {
    $listener.Start()
    $port = $candidate
    break
  } catch {
    continue
  } finally {
    $listener.Stop()
  }
}
if (-not $port) { throw "No free localhost port was found in 8765-8785." }

$stdout = Join-Path $runtime "server.log"
$stderr = Join-Path $runtime "server.error.log"
$process = Start-Process $python.Source -ArgumentList "-m","http.server",$port,"--bind","127.0.0.1" -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$url = "http://127.0.0.1:$port/"
$ready = $false
foreach ($attempt in 1..20) {
  if ($process.HasExited) { break }
  try {
    $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch {
    Start-Sleep -Milliseconds 200
  }
}
if (-not $ready) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  throw "Sequence Inspector failed to start. See $stderr"
}
@{ pid = $process.Id; port = $port; url = $url } | ConvertTo-Json | Set-Content (Join-Path $runtime "run.json")
Start-Process $url
Write-Host "Sequence Inspector: $url"
Write-Host "Use stop_windows.ps1 to stop."
