node inject_journey_ko.cjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] 상담 챗봇 기능맵 자동 재생성 — 신규 기능(라우트) 추가 시 챗봇이 자동 인지하도록 매 배포 갱신.
node tools/gen_chatbot_knowledge.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] i18n 자동 번역 — 4모드 전부 실행(오버레이/사전 자동 14국화). $env:CLAUDE_API_KEY 설정 시 실번역.
#   ①default: ko.js 신규 키  ②sidebar: sidebarI18n.js  ③backend: backend_i18n.json(서버생성 문자열)
#   ④inline: JSX 의 t('key','한글fb') 중 ko.js 부재 키(백필 사각지대). 신규 UI 는 ko/폴백만으로 자동 15국화.
node tools/i18n_autofill.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$env:AUTOFILL_TARGET='sidebar'; node tools/i18n_autofill.mjs; $env:AUTOFILL_TARGET=''
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$env:AUTOFILL_TARGET='backend'; node tools/i18n_autofill.mjs; $env:AUTOFILL_TARGET=''
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$env:AUTOFILL_TARGET='inline'; node tools/i18n_autofill.mjs; $env:AUTOFILL_TARGET=''
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location frontend
npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
python package_deploy.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python deploy_paramiko.py
exit $LASTEXITCODE
