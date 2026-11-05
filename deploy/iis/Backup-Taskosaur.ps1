[CmdletBinding()]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur',[long]$BudgetBytes=8GB)
$ErrorActionPreference='Stop'
if($ApplicationRoot -ne 'C:\ProgramData\StackBI\Applications\Taskosaur' -or $BudgetBytes -lt 1GB){throw 'Unexpected backup configuration'}
$root=[IO.Path]::GetFullPath((Join-Path $ApplicationRoot 'backups'))
if((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Backup directory cannot be a link'}
icacls $root /grant 'NT SERVICE\MSSQL$STACKBI:(OI)(CI)(M)' | Out-Null
if($LASTEXITCODE){throw 'Backup ACL failed'}
$connection=New-Object System.Data.SqlClient.SqlConnection 'Server=lpc:.\STACKBI;Database=TaskosaurIqualitys;Integrated Security=True;Encrypt=False'
$connection.Open()
try {
  $command=$connection.CreateCommand();$command.CommandTimeout=300
  $command.CommandText='SELECT SUM(CAST(size AS BIGINT))*8192 FROM sys.database_files WHERE type=0'
  $estimate=[long]$command.ExecuteScalar()
  $files=@(Get-ChildItem -LiteralPath $root -Filter '*.bak' -File|Sort-Object Name -Descending)
  foreach($file in $files){
    if($file.Name -notmatch '^TaskosaurIqualitys-\d{8}T\d{9}Z\.bak$' -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not(Test-Path -LiteralPath ($file.FullName+'.verified.json'))){throw 'Unrecognized/unverified backup; inspect before cleanup'}
  }
  $bytes=[long](($files|Measure-Object Length -Sum).Sum)
  foreach($file in @($files|Sort-Object Name)){
    if($files.Count -le 2 -or ($files.Count -lt 7 -and $bytes+$estimate -le $BudgetBytes)){break}
    $full=[IO.Path]::GetFullPath($file.FullName)
    if((Split-Path -Parent $full) -ne $root){throw 'Backup deletion escapes managed directory'}
    Remove-Item -LiteralPath $full -Force
    Remove-Item -LiteralPath ($full+'.verified.json') -Force
    $bytes-=$file.Length;$files=@($files|Where-Object FullName -ne $full)
  }
  if($bytes+$estimate -gt $BudgetBytes -or (Get-PSDrive C).Free-$estimate -lt 10GB){throw 'Backup would exceed storage budget'}
  $backup=Join-Path $root ('TaskosaurIqualitys-'+(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')+'.bak')
  $command.CommandText='BACKUP DATABASE [TaskosaurIqualitys] TO DISK=@path WITH CHECKSUM, INIT; RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM;'
  [void]$command.Parameters.Add('@path',[System.Data.SqlDbType]::NVarChar,4000);$command.Parameters['@path'].Value=$backup
  [void]$command.ExecuteNonQuery()
  @{format='taskosaur-backup-v1';verifiedAt=(Get-Date).ToUniversalTime().ToString('o');sha256=(Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash} | ConvertTo-Json | Set-Content -LiteralPath ($backup+'.verified.json') -Encoding UTF8
  Write-Output 'Taskosaur backup created and verified locally.'
}finally{$connection.Close()}
