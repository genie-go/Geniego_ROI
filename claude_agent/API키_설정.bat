@echo off
chcp 65001 > nul
title API 키 설정

echo ================================================
echo   Anthropic API 키 설정
echo ================================================
echo.
echo API 키는 https://console.anthropic.com 에서 발급받을 수 있습니다.
echo.
set /p APIKEY="API 키를 입력하세요: "

if "%APIKEY%"=="" (
    echo 입력이 없습니다. 종료합니다.
    pause
    exit /b
)

:: 현재 사용자 환경 변수에 영구 저장
setx ANTHROPIC_API_KEY "%APIKEY%"

echo.
echo 설정 완료! 새 터미널/배치파일 실행 시 적용됩니다.
echo.
pause
