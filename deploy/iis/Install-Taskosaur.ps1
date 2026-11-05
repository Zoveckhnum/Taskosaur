[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ArtifactRoot,
  [Parameter(Mandatory=$true)][string]$CodexExecutable,
  [Parameter(Mandatory=$true)][string]$CodexAuthFile,
  [switch]$Resume,
  [string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur',
  [string]$WinSW='C:\ProgramData\StackBI\Installers\WinSW-x64.exe'
)
$ErrorActionPreference='Stop'
$service='StackBI-Taskosaur'
$identity='NT SERVICE\'+$service
$existing=Get-Service -Name $service -ErrorAction SilentlyContinue
if($existing -and (-not $Resume -or $existing.Status -ne 'Stopped' -or (Test-Path -LiteralPath (Join-Path $ApplicationRoot 'deployment.json')))){throw 'Service exists; use Update-Taskosaur.ps1'}
if(-not $Resume -and (Test-Path -LiteralPath $ApplicationRoot) -and (Get-ChildItem -LiteralPath $ApplicationRoot -Force)){throw 'Installation directory is not empty'}
$artifact=Get-Content -LiteralPath (Join-Path $ArtifactRoot 'release.json') -Raw | ConvertFrom-Json
if($artifact.format -ne 'taskosaur-iqualitys-release-v1'){throw 'Invalid artifact'}
if((Get-FileHash -LiteralPath $WinSW -Algorithm SHA256).Hash.ToLowerInvariant() -ne '05b82d46ad331cc16bdc00de5c6332c1ef818df8ceefcd49c726553209b3a0da'){throw 'Unexpected WinSW binary'}
if((Get-PSDrive C).Free -lt 10GB){throw 'At least 10 GiB free required'}
$stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')+'-'+$artifact.commit.Substring(0,8)
if($Resume){
  $pending=@(Get-ChildItem -LiteralPath (Join-Path $ApplicationRoot 'releases') -Directory)
  if($pending.Count -ne 1 -or $pending[0].Name -notmatch '^\d{8}T\d{9}Z-[a-f0-9]{8}$'){throw 'Cannot identify incomplete installation'}
  $stamp=$pending[0].Name
}
foreach($folder in @('','releases','service','tools','logs','secrets','data','codex','uploads','iis','backups')){New-Item -ItemType Directory -Path (Join-Path $ApplicationRoot $folder) -Force | Out-Null}
icacls $ApplicationRoot /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)(F)' '*S-1-5-32-544:(OI)(CI)(F)' | Out-Null
if($LASTEXITCODE){throw 'Failed to protect application directory'}
if(-not $Resume){Copy-Item -LiteralPath $ArtifactRoot -Destination (Join-Path $ApplicationRoot ('releases\'+$stamp)) -Recurse}
Copy-Item -LiteralPath $CodexExecutable -Destination (Join-Path $ApplicationRoot 'tools\codex.exe')
Copy-Item -LiteralPath $CodexAuthFile -Destination (Join-Path $ApplicationRoot 'codex\auth.json')
foreach($name in @('Start-Taskosaur.ps1','Update-Taskosaur.ps1','Maintain-Taskosaur.ps1','Backup-Taskosaur.ps1','Get-CodexUsage.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $ApplicationRoot 'service')}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'web.config') -Destination (Join-Path $ApplicationRoot 'iis\web.config')
$wrapper=Join-Path $ApplicationRoot ('service\'+$service+'.exe')
Copy-Item -LiteralPath $WinSW -Destination $wrapper
$escapedRoot=[Security.SecurityElement]::Escape($ApplicationRoot)
$xml=@"
<service>
 <id>$service</id><name>iqualitys Taskosaur Project Manager</name>
 <description>Independent iqualitys project manager with SQL Server and Codex CLI.</description>
 <executable>C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe</executable>
 <arguments>-NoProfile -NonInteractive -ExecutionPolicy Bypass -File &quot;$escapedRoot\service\Start-Taskosaur.ps1&quot; -ApplicationRoot &quot;$escapedRoot&quot;</arguments>
 <workingdirectory>$escapedRoot</workingdirectory><startmode>Automatic</startmode>
 <depend>MSSQL`$STACKBI</depend><stoptimeout>30sec</stoptimeout>
 <onfailure action="restart" delay="15 sec"/>
 <logpath>$escapedRoot\logs</logpath><log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>5</keepFiles></log>
</service>
"@
[IO.File]::WriteAllText((Join-Path $ApplicationRoot ('service\'+$service+'.xml')),$xml)
if(-not $existing){& $wrapper install; if($LASTEXITCODE){throw 'Service installation failed'}}
& sc.exe config $service obj= $identity | Out-Null
if($LASTEXITCODE){throw 'Service identity configuration failed'}
& sc.exe sidtype $service unrestricted | Out-Null
if($LASTEXITCODE){throw 'Service SID configuration failed'}
icacls $ApplicationRoot /grant ($identity+':(OI)(CI)(RX)') | Out-Null
foreach($folder in @('data','codex','uploads','logs')){icacls (Join-Path $ApplicationRoot $folder) /grant ($identity+':(OI)(CI)(M)') | Out-Null; if($LASTEXITCODE){throw 'Service ACL failed'}}
$certificate=New-SelfSignedCertificate -Type DocumentEncryptionCert -Subject 'CN=Taskosaur iqualitys CMS' -CertStoreLocation Cert:\LocalMachine\My -KeyAlgorithm RSA -KeyLength 3072 -KeySpec KeyExchange -Provider 'Microsoft Enhanced RSA and AES Cryptographic Provider' -KeyExportPolicy NonExportable -NotAfter (Get-Date).AddYears(2)
$privatePath=Join-Path 'C:\ProgramData\Microsoft\Crypto\RSA\MachineKeys' $certificate.PrivateKey.CspKeyContainerInfo.UniqueKeyContainerName
icacls $privatePath /grant ($identity+':(R)') | Out-Null
if($LASTEXITCODE){throw 'CMS key ACL failed'}
$variables=@{}
foreach($line in Get-Content -LiteralPath (Join-Path $PSScriptRoot 'environment.example')){
  if($line -match '^([A-Z][A-Z0-9_]+)=(.*)$'){$variables[$matches[1]]=$matches[2].Replace('C:\ProgramData\StackBI\Applications\Taskosaur',$ApplicationRoot)}
}
foreach($key in @('JWT_SECRET','JWT_REFRESH_SECRET','ENCRYPTION_KEY')){
  $bytes=New-Object byte[] 48
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
  $variables[$key]=[Convert]::ToBase64String($bytes)
}
Protect-CmsMessage -To $certificate -Content (@{format='taskosaur-environment-v1';variables=$variables}|ConvertTo-Json -Compress) -OutFile (Join-Path $ApplicationRoot 'secrets\environment.p7m')
$variables=$null
$connection=New-Object System.Data.SqlClient.SqlConnection 'Server=lpc:.\STACKBI;Database=TaskosaurIqualitys;Integrated Security=True;Encrypt=False'
$connection.Open()
try {
  $command=$connection.CreateCommand()
  $command.CommandText="IF NOT EXISTS(SELECT 1 FROM sys.server_principals WHERE name=N'$identity') CREATE LOGIN [$identity] FROM WINDOWS; IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=N'$identity') CREATE USER [$identity] FOR LOGIN [$identity]; GRANT CONNECT TO [$identity]; GRANT SELECT,INSERT,UPDATE,DELETE ON SCHEMA::dbo TO [$identity];"
  [void]$command.ExecuteNonQuery()
} finally {$connection.Close()}
@{format='taskosaur-deployment-v1';active=$stamp;previous=$null;cmsThumbprint=$certificate.Thumbprint;hostName='project-manajer-iqualitys.stackbi.com.mx'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $ApplicationRoot 'deployment.json') -Encoding UTF8
Start-Service -Name $service
Write-Output 'Taskosaur installed. Verify loopback health before configuring IIS/public routing.'
