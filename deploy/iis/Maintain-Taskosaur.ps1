[CmdletBinding(SupportsShouldProcess=$true)]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur',[long]$ReleaseBudgetBytes=2GB,[int]$KeepReleases=3)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($ApplicationRoot).TrimEnd('\')
if($root -ne 'C:\ProgramData\StackBI\Applications\Taskosaur'){throw 'Unexpected managed application root'}
function Assert-LocalDirectory([string]$Path){
  $full=[IO.Path]::GetFullPath($Path)
  if(-not $full.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Path escapes application root'}
  $cursor=$full
  while($cursor -and $cursor.Length -ge $root.Length){
    if((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Managed paths cannot be links'}
    $cursor=Split-Path -Parent $cursor
  }
  return $full
}
$releases=Assert-LocalDirectory (Join-Path $root 'releases')
$deployment=Get-Content -LiteralPath (Join-Path $root 'deployment.json') -Raw|ConvertFrom-Json
if($deployment.active -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$' -or ($deployment.previous -and $deployment.previous -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$')){throw 'Invalid protected release metadata'}
$entries=@(foreach($dir in Get-ChildItem -LiteralPath $releases -Directory){
  $safe=Assert-LocalDirectory $dir.FullName
  if($dir.Name -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$'){throw 'Unrecognized release directory'}
  $marker=Get-Content -LiteralPath (Join-Path $safe 'release.json') -Raw|ConvertFrom-Json
  if($marker.format -ne 'taskosaur-iqualitys-release-v1'){throw 'Release marker mismatch'}
  $files=@(Get-ChildItem -LiteralPath $safe -Recurse -Force)
  if($files | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }){throw 'Linked release entries cannot be removed'}
  [pscustomobject]@{Name=$dir.Name;Path=$safe;Bytes=[long](($files|Where-Object {-not $_.PSIsContainer}|Measure-Object Length -Sum).Sum)}
})
$ordered=@($entries|Sort-Object Name -Descending)
$protected=@($deployment.active,$deployment.previous) | Where-Object {$_}
$total=[long](($entries|Measure-Object Bytes -Sum).Sum)
$remaining=$entries.Count
foreach($entry in @($ordered | Sort-Object Name)){
  if($entry.Name -in $protected){continue}
  if($remaining -le $KeepReleases -and $total -le $ReleaseBudgetBytes){break}
  if($PSCmdlet.ShouldProcess($entry.Path,'Remove old Taskosaur release')){
    $safe=Assert-LocalDirectory $entry.Path
    Remove-Item -LiteralPath $safe -Recurse -Force
  }
  $remaining--;$total-=$entry.Bytes
}
if($total -gt $ReleaseBudgetBytes){throw 'Protected releases exceed budget; do not install another version'}
[pscustomobject]@{RemainingReleases=$remaining;ReleaseBytes=$total;FreeBytes=(Get-PSDrive C).Free;MinimumFreeBytes=10GB}
if((Get-PSDrive C).Free -lt 10GB){throw 'Taskosaur disk headroom below 10 GiB'}
