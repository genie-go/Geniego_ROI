@echo off
chcp 65001 > nul
title GeniegoROI - Claude Sonnet 4.6 Agent

if "%ANTHROPIC_API_KEY%"=="" (
    echo.
    echo [오류] ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.
    echo API키_설정.bat 를 먼저 실행해 주세요.
    echo.
    pause
    exit /b
)

cd /d %~dp0
python -X utf8 agent.py
pause
