[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Email,[string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
if($Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$'){throw 'Invalid administrator email'}
$credentialFile=Join-Path $ApplicationRoot 'secrets\initial-admin.credential.xml'
if(Test-Path -LiteralPath $credentialFile){throw 'Initial administrator credential already exists'}
$bytes=New-Object byte[] 24
$rng=[Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
$password=[Convert]::ToBase64String($bytes)
$secure=ConvertTo-SecureString $password -AsPlainText -Force
$credential=New-Object System.Management.Automation.PSCredential($Email,$secure)
# DPAPI: only the Windows user running this initializer can retrieve the password.
$credential | Export-Clixml -LiteralPath $credentialFile
$body=@{email=$Email;password=$password;firstName='Alejandro';lastName='Alvarado'}|ConvertTo-Json
$session=Invoke-RestMethod 'http://127.0.0.1:10021/api/auth/setup' -Method Post -ContentType 'application/json' -Body $body
$headers=@{Authorization='Bearer '+$session.access_token}
$body=$null;$password=$null;$credential=$null
$settings=@{settings=@(@{key='registration_enabled';value='false';category='general';description='Acceso por invitacion'})}|ConvertTo-Json -Depth 4
[void](Invoke-RestMethod 'http://127.0.0.1:10021/api/admin/config' -Method Post -ContentType 'application/json' -Headers $headers -Body $settings)
$session=$null;$headers=$null
Write-Output ('Administrator initialized. DPAPI credential: '+$credentialFile)
