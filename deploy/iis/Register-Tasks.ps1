[CmdletBinding()]
param([string]$ApplicationRoot='C:\ProgramData\StackBI\Applications\Taskosaur')
$ErrorActionPreference='Stop'
if($ApplicationRoot -ne 'C:\ProgramData\StackBI\Applications\Taskosaur'){throw 'Unexpected application root'}
$settings=New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable -MultipleInstances IgnoreNew
foreach($entry in @(@{Name='Maintenance';Script='Maintain-Taskosaur.ps1';At='03:10'},@{Name='Backup';Script='Backup-Taskosaur.ps1';At='03:20'})){
  $name='StackBI-Taskosaur-'+$entry.Name
  if(Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue){throw ('Scheduled task already exists: '+$name)}
  $script=Join-Path $ApplicationRoot ('service\'+$entry.Script)
  if(-not(Test-Path -LiteralPath $script)){throw 'Installed maintenance script missing'}
  $action=New-ScheduledTaskAction -Execute 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$script+'"')
  Register-ScheduledTask -TaskName $name -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At $entry.At) -User 'SYSTEM' -RunLevel Highest -Settings $settings | Select-Object TaskName,State
}
