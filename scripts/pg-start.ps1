# Starts the local portable PostgreSQL 17 instance for Website Tracker (port 5433).
# The DB lives in server\.pgdata and is NOT a Windows service, so run this after
# a reboot before starting the app.
$pg = "C:\Users\sheha\pgsql"
$data = Join-Path $PSScriptRoot "..\server\.pgdata"
$log = Join-Path $PSScriptRoot "..\server\pg.log"
& "$pg\bin\pg_ctl.exe" -D $data -o "-p 5433" -l $log start
Start-Sleep -Seconds 1
& "$pg\bin\pg_isready.exe" -p 5433
