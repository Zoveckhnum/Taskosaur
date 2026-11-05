[CmdletBinding()]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
try {
  $package=Unprotect-CmsMessage -Path (Join-Path $ApplicationRoot 'secrets\environment.p7m') | ConvertFrom-Json
  if($package.format -ne 'taskosaur-environment-v1'){throw 'Invalid configuration'}
  foreach($variable in $package.variables.PSObject.Properties){
    if($variable.Name -notmatch '^[A-Z][A-Z0-9_]+$' -or $variable.Value -isnot [string]){throw 'Invalid variable'}
    [Environment]::SetEnvironmentVariable($variable.Name,$variable.Value,'Process')
  }
  $package=$null
  $deployment=Get-Content -LiteralPath (Join-Path $ApplicationRoot 'deployment.json') -Raw | ConvertFrom-Json
  if($deployment.active -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$'){throw 'Invalid release'}
  $release=Join-Path $ApplicationRoot ('releases\'+$deployment.active)
  Set-Location -LiteralPath $release
  & 'C:\Program Files\nodejs\node.exe' --max-old-space-size=1024 (Join-Path $release 'main.js')
  exit $LASTEXITCODE
} catch { Write-Error 'Taskosaur could not start. Inspect protected configuration and deployment metadata.'; exit 1 }
