node inject_journey_ko.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] 상담 챗봇 기능맵 자동 재생성 — 신규 기능(라우트) 추가 시 챗봇이 자동 인지하도록 매 배포 갱신.
node tools/gen_chatbot_knowledge.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location frontend
npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
python package_deploy.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python deploy_paramiko.py
exit $LASTEXITCODE
