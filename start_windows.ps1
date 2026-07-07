$ErrorActionPreference='Stop'; $root=$PSScriptRoot; $runtime=Join-Path $root '.runtime'; New-Item -ItemType Directory -Force $runtime|Out-Null
$py=Get-Command py -ErrorAction SilentlyContinue; if(-not $py){$py=Get-Command python -ErrorAction Stop}
$p=Start-Process $py.Source -ArgumentList '-m','http.server','8765','--bind','127.0.0.1' -WorkingDirectory $root -WindowStyle Hidden -PassThru
$p.Id|Set-Content (Join-Path $runtime 'pid'); Start-Sleep -Milliseconds 500; Start-Process 'http://127.0.0.1:8765/'
Write-Host 'Sequence Inspector: http://127.0.0.1:8765/'; Write-Host 'Use stop_windows.ps1 to stop.'
