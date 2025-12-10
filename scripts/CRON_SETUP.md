# Vision Cortex Scheduled Sync Tasks

# Place in Windows Task Scheduler or use with `Get-ScheduledTask` / `Register-ScheduledTask`

# Task 1: Tri-directional sync every 6 hours (pull from all, push updates)

#

# Using Windows Task Scheduler:

# 1. Open Task Scheduler

# 2. Create Basic Task

# 3. Name: "Vision Cortex Tri-Sync (6h)"

# 4. Trigger: Repeat every 6 hours

# 5. Action: "Start a program"

# Program: powershell.exe

# Arguments: -NoProfile -ExecutionPolicy Bypass -File "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-tri-directional.ps1" -SyncMode cron

# 6. Conditions: Run with highest privileges

#

# Or use Register-ScheduledTask (PowerShell):

#

# $taskName = "Vision-Cortex-Sync-6h"

# $action = New-ScheduledTaskAction -Execute "powershell.exe" `

# -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-tri-directional.ps1" -SyncMode cron'

#

# $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6)

# $principal = New-ScheduledTaskPrincipal -UserID "JARVIS" -RunLevel Highest

#

# Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal

#

# Task 2: Credential sync every 24 hours (bi-directional merge)

#

# Register-ScheduledTask -TaskName "Vision-Cortex-Secret-Sync-24h" `

# -Action $action `

# -Trigger (New-ScheduledTaskTrigger -Daily -At 02:00AM) `

# -Principal (New-ScheduledTaskPrincipal -UserID "JARVIS" -RunLevel Highest)

#

# Where $action =

# New-ScheduledTaskAction -Execute "powershell.exe" `

# -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex\scripts\sync-secrets.ps1" -Direction sync'

#

# QUICK SETUP SCRIPT (run this to register both tasks):

#

# $repoPath = "C:\Users\JARVIS\OneDrive\Documents\Infinity_X_One_Systems\Vision_Cortex"

#

# # Task 1: Tri-directional sync every 6 hours

# $action1 = New-ScheduledTaskAction -Execute "powershell.exe" `

# -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$repoPath\scripts\sync-tri-directional.ps1`" -SyncMode cron"

# $trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 6)

# $principal = New-ScheduledTaskPrincipal -UserID "JARVIS" -RunLevel Highest

#

# Register-ScheduledTask -TaskName "Vision-Cortex-Sync-6h" -Action $action1 -Trigger $trigger1 -Principal $principal -Force

#

# # Task 2: Credential sync once daily at 2 AM

# $action2 = New-ScheduledTaskAction -Execute "powershell.exe" `

# -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$repoPath\scripts\sync-secrets.ps1`" -Direction sync"

# $trigger2 = New-ScheduledTaskTrigger -Daily -At 02:00AM

#

# Register-ScheduledTask -TaskName "Vision-Cortex-Secret-Sync-24h" -Action $action2 -Trigger $trigger2 -Principal $principal -Force

#

# Write-Host "✓ Tasks registered. Check Task Scheduler for 'Vision-Cortex-\*'"
