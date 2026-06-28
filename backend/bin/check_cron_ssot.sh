#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  GeniegoROI — cron SSOT 정합 가드(check_cron_ssot.sh)
#
#  목적: backend/bin/*_cron.php 러너 파일과 install_crontab.sh(정본 SSOT) 사이의
#        등록 누락을 자동 탐지한다. 러너를 새로 추가하고 installer 갱신을 잊으면
#        fresh provision/DR 시 해당 파이프라인이 inert 가 되는 클래스(249차 결함 #2)를
#        커밋/배포 전에 차단한다.
#
#  사용:
#    bash backend/bin/check_cron_ssot.sh         # 누락 있으면 exit 1, 없으면 exit 0
#
#  정책: install_crontab.sh 에 등록되지 않은 러너가 있으면 실패(목록 출력).
#        의도적으로 cron 미등록인 러너(수동/온디맨드 전용)는 아래 ALLOW_UNREGISTERED 에 추가.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALLER="$DIR/install_crontab.sh"

# 의도적으로 crontab 미등록(온디맨드/수동 전용) 러너 — 화이트리스트(필요 시 추가).
ALLOW_UNREGISTERED=""

if [ ! -f "$INSTALLER" ]; then
  echo "[check_cron_ssot] FAIL: install_crontab.sh 부재($INSTALLER)"; exit 1
fi

missing=()
for f in "$DIR"/*_cron.php; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  case " $ALLOW_UNREGISTERED " in *" $name "*) continue ;; esac
  if ! grep -q "$name" "$INSTALLER"; then
    missing+=("$name")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "[check_cron_ssot] FAIL: install_crontab.sh 에 미등록된 러너 ${#missing[@]}종:"
  for m in "${missing[@]}"; do echo "  - $m"; done
  echo "→ install_crontab.sh 에 스케줄을 추가하거나, 온디맨드 전용이면 ALLOW_UNREGISTERED 에 등록하세요."
  exit 1
fi

count="$(ls -1 "$DIR"/*_cron.php 2>/dev/null | wc -l | tr -d ' ')"
echo "[check_cron_ssot] OK: 러너 ${count}종 전부 install_crontab.sh 에 등록됨."
exit 0
