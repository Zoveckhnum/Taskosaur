[CmdletBinding()]
param([string]$RepositoryRoot=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
$ErrorActionPreference='Stop'
$connection=New-Object System.Data.SqlClient.SqlConnection 'Server=lpc:.\STACKBI;Database=master;Integrated Security=True;Encrypt=False'
$connection.Open()
try {
  $command=$connection.CreateCommand()
  $command.CommandText="IF DB_ID(N'TaskosaurIqualitys') IS NOT NULL THROW 51000, 'Database exists; use reviewed migrations instead of initializing again', 1; CREATE DATABASE [TaskosaurIqualitys] COLLATE Latin1_General_100_CI_AS_SC;"
  [void]$command.ExecuteNonQuery()
  $command.CommandText='ALTER DATABASE [TaskosaurIqualitys] MODIFY FILE (NAME=[TaskosaurIqualitys],MAXSIZE=2048MB,FILEGROWTH=64MB); ALTER DATABASE [TaskosaurIqualitys] MODIFY FILE (NAME=[TaskosaurIqualitys_log],MAXSIZE=512MB,FILEGROWTH=64MB);'
  [void]$command.ExecuteNonQuery()
} finally {$connection.Close()}
$previous=[Environment]::GetEnvironmentVariable('DATABASE_URL','Process')
try {
  $env:DATABASE_URL='sqlserver://sql.stackbi.com.mx:1433;database=TaskosaurIqualitys;integratedSecurity=true;encrypt=true;trustServerCertificate=false;connectionLimit=3;connectTimeout=10;socketTimeout=30'
  & 'C:\Program Files\nodejs\node.exe' (Join-Path $RepositoryRoot 'node_modules\prisma\build\index.js') migrate deploy --schema (Join-Path $RepositoryRoot 'backend\prisma\sqlserver\schema.prisma')
  if($LASTEXITCODE){throw 'SQL Server migration failed'}
}finally{[Environment]::SetEnvironmentVariable('DATABASE_URL',$previous,'Process')}
