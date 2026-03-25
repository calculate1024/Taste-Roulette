@echo off
REM Paperclip Daily Agent Runner — runs all active agents sequentially
REM Scheduled via Windows Task Scheduler at 07:00 daily

setlocal
set PROJECT=C:\Users\calcu\projects\Taste-Roulette
set SCRIPTS=%PROJECT%\scripts

echo ========================================
echo Paperclip Daily Run — %date% %time%
echo ========================================

REM Run agents in priority order (CEO first to coordinate, then specialists)
call "%SCRIPTS%\run-agent.bat" ceo
call "%SCRIPTS%\run-agent.bat" devops
call "%SCRIPTS%\run-agent.bat" curator
call "%SCRIPTS%\run-agent.bat" quality
call "%SCRIPTS%\run-agent.bat" analytics
call "%SCRIPTS%\run-agent.bat" bug-triage
call "%SCRIPTS%\run-agent.bat" social

echo ========================================
echo All agents completed — %time%
echo ========================================

REM Git commit agent logs (auto, no push)
cd /d "%PROJECT%"
git add paperclip/logs/*.md 2>nul
git commit -m "chore: paperclip daily agent logs %date:~0,4%-%date:~5,2%-%date:~8,2%" 2>nul

endlocal
