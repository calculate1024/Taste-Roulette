@echo off
REM Paperclip Agent Runner — triggered by Windows Task Scheduler
REM Usage: run-agent.bat <agent-name>
REM Example: run-agent.bat ceo

setlocal
set AGENT=%1
set PROJECT=C:\Users\calcu\projects\Taste-Roulette
set LOGDIR=%PROJECT%\paperclip\logs
set TIMESTAMP=%date:~0,4%-%date:~5,2%-%date:~8,2%

if "%AGENT%"=="" (
    echo Usage: run-agent.bat ^<agent-name^>
    echo Available: ceo, curator, quality, analytics, devops, bug-triage, social
    exit /b 1
)

REM Check if agent is enabled (skip disabled agents)
findstr /i "enabled: false" "%PROJECT%\paperclip\agents\%AGENT%.yaml" >nul 2>&1
if %errorlevel%==0 (
    echo [%TIMESTAMP%] %AGENT% is disabled, skipping.
    exit /b 0
)

echo [%TIMESTAMP%] Starting %AGENT% agent...

REM Run Claude CLI with agent-specific prompt
claude -p "%PROJECT%" --allowedTools "Bash,Read,Write,Edit,Glob,Grep" -m "You are the %AGENT% agent for Taste Roulette. Read your config at paperclip/agents/%AGENT%.yaml and execute your daily heartbeat workflow. Follow env_setup instructions exactly. Write your log to paperclip/logs/%AGENT%-%TIMESTAMP%.md and update paperclip/logs/%AGENT%-latest.md. Be concise and efficient." --max-tokens 50000 2>>"%LOGDIR%\runner-errors.log"

echo [%TIMESTAMP%] %AGENT% agent completed.
endlocal
