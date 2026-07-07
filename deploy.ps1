node inject_journey_ko.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] 상담 챗봇 기능맵 자동 재생성 — 신규 기능(라우트) 추가 시 챗봇이 자동 인지하도록 매 배포 갱신.
node tools/gen_chatbot_knowledge.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] i18n 자동 번역 — ko(SSOT)에만 있는 신규 UI 키를 14개국 현지 자연어로 자동 채움(오버레이).
#   $env:CLAUDE_API_KEY 설정 시 실 번역, 미설정 시 gap 리포트만(빌드 실패 없음). 신규 UI 는 ko 추가만으로 자동 15국화.
node tools/i18n_autofill.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location frontend
npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
python package_deploy.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python deploy_paramiko.py
exit $LASTEXITCODE
