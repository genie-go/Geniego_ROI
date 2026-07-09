# GeniegoROI 빌드 오케스트레이터 (Windows)
#
# ★ 이 스크립트는 빌드까지만 수행한다. 원격 업로드는 포함하지 않는다.
#   업로드 = pscp/plink 수동 파일카피(운영 roi.geniego.com · 데모 roidemo.geniego.com).
#   DB 마이그레이션 = 원격 서버에서 `php backend/bin/migrate.php current` 로 실행할 것.
#   Db.php:120 이 GENIE_DB_HOST 기본값을 127.0.0.1 로 잡으므로, 여기에 훅을 걸면
#   원격이 아니라 로컬 개발 DB 가 마이그레이션된다.
#
# [276차] inject_journey_ko.cjs / package_deploy.py / deploy_paramiko.py 3개 호출 제거.
#   세 파일 모두 저장소에 존재한 적이 없어(git log --all 공백) 1행 `node` 가 exit 1 →
#   2행에서 즉시 종료됐고, 그 결과 아래 챗봇/i18n 훅이 전부 도달 불가였다.

# [270차] 상담 챗봇 기능맵 자동 재생성 — 신규 기능(라우트) 추가 시 챗봇이 자동 인지하도록 매 배포 갱신.
node tools/gen_chatbot_knowledge.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# [270차] i18n 자동 번역 — 4모드 전부 실행(오버레이/사전 자동 14국화). $env:CLAUDE_API_KEY 설정 시 실번역.
#   ①default: ko.js 신규 키  ②sidebar: sidebarI18n.js  ③backend: backend_i18n.json(서버생성 문자열)
#   ④inline: JSX 의 t('key','한글fb') 중 ko.js 부재 키(백필 사각지대). 신규 UI 는 ko/폴백만으로 자동 15국화.
#   키 미설정 시 갭만 리포트하고 exit 0 — 빌드는 깨지지 않고 미채움 키는 영어 폴백.
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
$buildExit = $LASTEXITCODE
Set-Location ..
if ($buildExit -ne 0) { exit $buildExit }

Write-Host ""
Write-Host "[deploy.ps1] 빌드 완료 → frontend/dist"
Write-Host "[deploy.ps1] 업로드는 수동: pscp dist → docroot, plink chown www:www + php-fpm reload"
exit 0
