[CmdletBinding()]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
$file=Join-Path $ApplicationRoot 'data\budget\usage.json'
if(-not(Test-Path -LiteralPath $file)){Write-Output 'No Codex calls recorded.';return}
$ledger=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json
if($ledger.version -ne 1){throw 'Invalid usage ledger'}
$day=(Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$entries=@($ledger.entries|Where-Object day -eq $day)
[pscustomobject]@{DayUTC=$day;Calls=$entries.Count;ChargedTokens=($entries|Measure-Object tokens -Sum).Sum;Pending=@($entries|Where-Object status -eq 'pending').Count;Unknown=@($entries|Where-Object status -eq 'unknown').Count;Records=@($ledger.entries).Count;MaximumRecords=4000}
