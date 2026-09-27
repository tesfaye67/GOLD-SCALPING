@echo off
REM ==============================================================================
REM TDR GOLD TREADER - Windows Database Backup & Restore Utility
REM ==============================================================================

set CONTAINER_NAME=tdr-gold-postgres
set DB_NAME=tdr_gold_db
set DB_USER=tdr_admin
set BACKUP_DIR=.\backups

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

if "%1"=="backup" goto BACKUP
if "%1"=="restore" goto RESTORE

echo Usage: %0 {backup^|restore ^<filename^>}
goto END

:BACKUP
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,8%_%dt:~8,6%
set OUTFILE=%BACKUP_DIR%\tdr_gold_backup_%TIMESTAMP%.sql
echo [TDR GOLD TREADER] Creating database backup to %OUTFILE%...
docker exec -t %CONTAINER_NAME% pg_dump -U %DB_USER% %DB_NAME% > %OUTFILE%
echo [TDR GOLD TREADER] Backup complete!
goto END

:RESTORE
if "%2"=="" (
    echo Error: Please specify the backup sql file to restore.
    goto END
)
echo [TDR GOLD TREADER] Restoring database from %2...
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < %2
echo [TDR GOLD TREADER] Restore complete!
goto END

:END
