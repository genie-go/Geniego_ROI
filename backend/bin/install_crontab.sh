#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  GeniegoROI — 운영/데모 cron 정본(install_crontab.sh)
#
#  목적: 마케팅 자동화·데이터 수집·정산·물류 등 백엔드 자동 실행을 코드화(버전관리)한다.
#  배경: 그동안 cron 은 서버 root crontab 에만 등록되어 레포에 미커밋이었다(재현/감사 불가).
#        본 스크립트가 그 정본이며, 동일 crontab 을 멱등하게 (재)설치한다.
#
#  ★현재 운영 서버(1.201.177.46)에는 이미 동일 내용이 등록·정상 실행 중이다(검증:
#    conn_sync/oauth_refresh/optimize 매시 실행 확인). 본 스크립트는 신규 서버 프로비저닝·
#    재해복구·감사 재현용. 기존 cron 을 덮어쓰므로 운영 서버에서 재실행 시 주의.
#
#  사용:
#    bash backend/bin/install_crontab.sh           # 미리보기(설치 안 함)
#    bash backend/bin/install_crontab.sh --apply   # 실제 crontab 설치(기존 백업 후 교체)
#
#  안전장치(앱 레벨, 코드에 이미 구현):
#    - optimize_cron 은 캠페인을 자동 활성화하지 않음(PAUSED 유지, human-in-loop).
#    - 실 매체 push 는 자격증명+결제수단(BillingMethod) 게이트 통과 시에만.
#    - env AD_EXECUTION_DISABLED=1 로 전역 광고집행 차단 가능(긴급 킬스위치).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROD=/home/wwwroot/roi.geniego.com/backend
DEMO=/home/wwwroot/roidemo.geniego.com/backend

read -r -d '' CRONTAB <<EOF || true
# ═══ GeniegoROI cron (managed by backend/bin/install_crontab.sh) ═══
# ── 알림(일/주간 요약) ──
0 0 * * * cd ${PROD} && php bin/alerts_cron.php current --window=daily >> /var/log/genie_alerts.log 2>&1
5 0 * * 1 cd ${PROD} && php bin/alerts_cron.php current --window=weekly >> /var/log/genie_alerts.log 2>&1
20 0 * * * cd ${DEMO} && php bin/alerts_cron.php current --window=daily >> /var/log/genie_alerts_demo.log 2>&1
25 0 * * 1 cd ${DEMO} && php bin/alerts_cron.php current --window=weekly >> /var/log/genie_alerts_demo.log 2>&1
# ── 마케팅 자동최적화(매시; PAUSED 유지·human-in-loop) ──
0 * * * * php ${PROD}/bin/optimize_cron.php both >> /var/log/genie_optimize.log 2>&1
5 * * * * php ${DEMO}/bin/optimize_cron.php current >> /var/log/genie_optimize_demo.log 2>&1
# ── 광고 성과 수집(performance_metrics ingest; 자동화 두뇌의 실측 소스) ──
15 * * * * GENIE_ENV=production php ${PROD}/bin/connectors_sync_cron.php --days=7 >> /var/log/genie_conn_sync.log 2>&1
18 * * * * GENIE_ENV=demo php ${DEMO}/bin/connectors_sync_cron.php --days=7 >> /var/log/genie_conn_sync_demo.log 2>&1
# ── 리포트 생성 ──
30 * * * * GENIE_ENV=production php ${PROD}/bin/reports_cron.php >> /var/log/genie_reports.log 2>&1
35 * * * * GENIE_ENV=demo php ${DEMO}/bin/reports_cron.php >> /var/log/genie_reports_demo.log 2>&1
# ── 커머스 동기화(주문/상품/재고) ──
*/5 * * * * GENIE_ENV=production php ${PROD}/bin/commerce_sync_cron.php >> /var/log/genie_commerce_sync.log 2>&1
*/7 * * * * GENIE_ENV=demo php ${DEMO}/bin/commerce_sync_cron.php >> /var/log/genie_commerce_sync_demo.log 2>&1
# ── 여정(Journey) 러너 ──
*/5 * * * * GENIE_ENV=production php ${PROD}/bin/journey_cron.php >> /var/log/genie_journey.log 2>&1
*/9 * * * * GENIE_ENV=demo php ${DEMO}/bin/journey_cron.php >> /var/log/genie_journey_demo.log 2>&1
# ── 이메일 STO 발송 큐(야간 등 차단시간 적재분을 허용시각에 실발송) ──
*/15 * * * * GENIE_ENV=production php ${PROD}/bin/email_queue_cron.php >> /var/log/genie_email_queue.log 2>&1
*/17 * * * * GENIE_ENV=demo php ${DEMO}/bin/email_queue_cron.php >> /var/log/genie_email_queue_demo.log 2>&1
# ── OAuth 토큰 갱신(만료 전 자동 refresh; 광고 집행 401 방지) ──
10 * * * * GENIE_ENV=production php ${PROD}/bin/oauth_refresh_cron.php >> /var/log/genie_oauth_refresh.log 2>&1
12 * * * * GENIE_ENV=demo php ${DEMO}/bin/oauth_refresh_cron.php >> /var/log/genie_oauth_refresh_demo.log 2>&1
# ── 물류 배송추적 ──
*/15 * * * * GENIE_ENV=production php ${PROD}/bin/logistics_track_cron.php >> /var/log/genie_logistics.log 2>&1
*/18 * * * * GENIE_ENV=demo php ${DEMO}/bin/logistics_track_cron.php >> /var/log/genie_logistics_demo.log 2>&1
# ── Writeback(상품/가격 역연동) ──
*/10 * * * * GENIE_ENV=production php ${PROD}/bin/writeback_cron.php >> /var/log/genie_writeback.log 2>&1
*/13 * * * * GENIE_ENV=demo php ${DEMO}/bin/writeback_cron.php >> /var/log/genie_writeback_demo.log 2>&1
# ── Attribution(MTA 귀속 재집계) ──
*/30 * * * * GENIE_ENV=production php ${PROD}/bin/attribution_cron.php >> /var/log/genie_attribution.log 2>&1
*/33 * * * * GENIE_ENV=demo php ${DEMO}/bin/attribution_cron.php >> /var/log/genie_attribution_demo.log 2>&1
# ── 리뷰/UGC 수집(6시간) ──
17 */6 * * * GENIE_ENV=production php ${PROD}/bin/review_collect_cron.php >> /var/log/genie_review_collect.log 2>&1
23 */6 * * * GENIE_ENV=demo php ${DEMO}/bin/review_collect_cron.php >> /var/log/genie_review_collect_demo.log 2>&1
# ── PG 결제 정산 수집(2시간) ──
17 */2 * * * GENIE_ENV=production php ${PROD}/bin/pg_settlement_cron.php >> /var/log/genie_pg_settle.log 2>&1
23 */2 * * * GENIE_ENV=demo php ${DEMO}/bin/pg_settlement_cron.php >> /var/log/genie_pg_settle_demo.log 2>&1
# ── [237차] 다이내믹 리프라이서(경쟁가 대비 자동 가격조정; 가격은 저빈도라 30분/매시) ──
*/30 * * * * GENIE_ENV=production php ${PROD}/bin/repricer_cron.php >> /var/log/genie_repricer.log 2>&1
7 * * * * GENIE_ENV=demo php ${DEMO}/bin/repricer_cron.php >> /var/log/genie_repricer_demo.log 2>&1
EOF

if [ "${1:-}" = "--apply" ]; then
  TS=$(date +%Y%m%d_%H%M%S)
  crontab -l > "/root/crontab.bak_${TS}" 2>/dev/null || true
  echo "[install_crontab] 기존 crontab 백업: /root/crontab.bak_${TS}"
  printf '%s\n' "$CRONTAB" | crontab -
  echo "[install_crontab] 설치 완료. 확인: crontab -l"
else
  echo "── 미리보기(설치하려면 --apply) ──"
  printf '%s\n' "$CRONTAB"
fi
