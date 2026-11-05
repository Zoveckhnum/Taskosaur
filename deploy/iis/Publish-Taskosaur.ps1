[CmdletBinding()]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
$hostName='project-manajer-iqualitys.stackbi.com.mx'
$site='iqualitys-Taskosaur'
Import-Module WebAdministration
$health=Invoke-RestMethod 'http://127.0.0.1:10021/api/health' -TimeoutSec 10
if($health.services.database.status -ne 'up'){throw 'Database health check failed'}
if(Get-Website -Name $site -ErrorAction SilentlyContinue){throw 'IIS site already exists; inspect current bindings before changing it'}
if(Get-WebBinding | Where-Object bindingInformation -eq ('*:80:'+$hostName)){throw 'Host binding is already in use'}
Backup-WebConfiguration -Name ('Before-Taskosaur-'+(Get-Date -Format 'yyyyMMddHHmmss'))
New-WebAppPool -Name $site|Out-Null
Set-ItemProperty -Path ('IIS:\AppPools\'+$site) -Name managedRuntimeVersion -Value ''
$public=Join-Path $ApplicationRoot 'iis'
icacls $ApplicationRoot /grant ('IIS AppPool\'+$site+':(RX)')|Out-Null
icacls $public /grant ('IIS AppPool\'+$site+':(OI)(CI)(RX)')|Out-Null
if($LASTEXITCODE){throw 'IIS content ACL failed'}
New-Website -Name $site -PhysicalPath $public -ApplicationPool $site -Port 80 -HostHeader $hostName|Out-Null
Set-ItemProperty -Path ('IIS:\Sites\'+$site) -Name logFile.enabled -Value $false
$response=Invoke-WebRequest 'http://127.0.0.1/api/health' -Headers @{Host=$hostName} -UseBasicParsing -TimeoutSec 15
if($response.StatusCode -ne 200){Stop-Website $site;throw 'IIS proxy validation failed'}
Write-Output 'IIS host binding ready. Add the hostname to the existing Cloudflare Tunnel and create its DNS route, then verify public HTTPS.'
