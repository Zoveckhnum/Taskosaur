[CmdletBinding()]
param([string]$ArtifactRoot,[switch]$Rollback,[string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
if($ApplicationRoot -ne 'C:\ProgramData\StackBI\Applications\Taskosaur'){throw 'Unexpected application root'}
$file=Join-Path $ApplicationRoot 'deployment.json'
$original=Get-Content -LiteralPath $file -Raw
$state=$original|ConvertFrom-Json
if($Rollback){
  if(-not $state.previous){throw 'No previous version'}
  $target=$state.previous
}else{
  & (Join-Path $PSScriptRoot 'Maintain-Taskosaur.ps1') -ApplicationRoot $ApplicationRoot
  $marker=Get-Content -LiteralPath (Join-Path $ArtifactRoot 'release.json') -Raw|ConvertFrom-Json
  if($marker.format -ne 'taskosaur-iqualitys-release-v1'){throw 'Invalid artifact'}
  if($marker.mainSha256 -notmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath (Join-Path $ArtifactRoot 'main.js') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $marker.mainSha256){throw 'Backend artifact checksum mismatch'}
  $bytes=[long]((Get-ChildItem -LiteralPath $ArtifactRoot -File -Recurse|Measure-Object Length -Sum).Sum)
  $existing=[long]((Get-ChildItem -LiteralPath (Join-Path $ApplicationRoot 'releases') -File -Recurse|Measure-Object Length -Sum).Sum)
  if($bytes+$existing -gt 2GB -or (Get-PSDrive C).Free-$bytes -lt 10GB){throw 'Release would exceed disk budget'}
  $target=(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')+'-'+$marker.commit.Substring(0,8)
  $destination=Join-Path $ApplicationRoot ('releases\'+$target)
  if(Test-Path -LiteralPath $destination){throw 'Release already exists'}
  Copy-Item -LiteralPath $ArtifactRoot -Destination $destination -Recurse
}
if($target -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$'){throw 'Invalid release name'}
Stop-Service StackBI-Taskosaur
try {
  $state.previous=$state.active;$state.active=$target
  $state|ConvertTo-Json|Set-Content -LiteralPath $file -Encoding UTF8
  Start-Service StackBI-Taskosaur
  $healthy=$false
  for($attempt=0;$attempt -lt 20;$attempt++){
    Start-Sleep -Seconds 2
    try{$health=Invoke-RestMethod 'http://127.0.0.1:10021/api/health' -TimeoutSec 5;if($health.services.database.status -eq 'up'){$healthy=$true;break}}catch{}
  }
  if(-not $healthy){throw 'New service version failed database health check'}
}catch{
  Stop-Service StackBI-Taskosaur -ErrorAction SilentlyContinue
  [IO.File]::WriteAllText($file,$original)
  Start-Service StackBI-Taskosaur
  throw
}
& (Join-Path $PSScriptRoot 'Maintain-Taskosaur.ps1') -ApplicationRoot $ApplicationRoot
Write-Output ('Active Taskosaur version: '+$target)
