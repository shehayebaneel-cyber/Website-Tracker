# Stops the local portable PostgreSQL instance.
$pg = "C:\Users\sheha\pgsql"
$data = Join-Path $PSScriptRoot "..\server\.pgdata"
& "$pg\bin\pg_ctl.exe" -D $data stop
