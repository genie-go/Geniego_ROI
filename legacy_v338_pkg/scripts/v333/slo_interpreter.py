#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V332 SLO alert auto interpretation.

Goal: attach a short, operator-friendly thread reply:
- 원인 후보 (most likely -> less likely)
- 즉시 조치 (checklist)
"""
from __future__ import annotations
from typing import Any, Dict, List

def interpret(event: str, payload: Dict[str,Any]) -> str:
    breaches = payload.get("breaches") or []
    lines: List[str] = []
    lines.append("*자동 해석 (원인 후보 / 즉시 조치)*")
    # common attachments
    dash = payload.get("dashboard_url") or payload.get("links", {}).get("dashboard")
    runbook = payload.get("runbook_url") or payload.get("links", {}).get("runbook")
    if dash or runbook:
        lines.append("\n*바로가기*")
        if dash:
            lines.append(f"- 대시보드: {dash}")
        if runbook:
            lines.append(f"- 런북: {runbook}")

    errs = payload.get("recent_error_summary") or payload.get("recent_errors_top") or []
    if errs:
        lines.append("\n*최근 ERROR Top*")
        for e in errs[:5]:
            # support both summary and raw
            if "cnt" in e:
                lines.append(f"- [{e.get('component')}/{e.get('code')}] {e.get('cnt')}건 (last {e.get('last_ts')})")
            else:
                lines.append(f"- [{e.get('component')}/{e.get('code')}] {e.get('ts')}: {str(e.get('message') or '')[:120]}")


    if event == "slo_breach":
        # classify
        has_pixel = any(b.get("slo")=="pixel_ingest_freshness" for b in breaches)
        has_conn = any(b.get("slo")=="connector_ok_freshness" for b in breaches)

        if has_pixel:
            b = [x for x in breaches if x.get("slo")=="pixel_ingest_freshness"][0]
            lines.append("\n*원인 후보*")
            lines.append(f"- Pixel ingest freshness 초과: age={b.get('age_s')}s (max={b.get('max_age_s')}s), last={b.get('last_ts')}")
            lines.append("- (1) 사이트/앱에 Pixel 스크립트 누락·차단 (CMP/TagManager/AdBlock)")
            lines.append("- (2) /pixel/e, /pixel/s2s 네트워크 오류 또는 4xx/5xx 증가")
            lines.append("- (3) 서버 시간/타임존 불일치로 '최근 이벤트'가 밀림")
            lines.append("\n*즉시 조치*")
            lines.append("- 대시보드 > Monitoring: 최근 ERROR/WARN 로그 확인 (component=pixel/ui)")
            lines.append("- 브라우저 DevTools > Network: /p/<project>/pixel/e 200 여부 확인")
            lines.append("- (가능하면) 최근 배포/태그 변경 이력 확인 후 되돌리기")

        if has_conn:
            lines.append("\n*원인 후보*")
            for b in [x for x in breaches if x.get("slo")=="connector_ok_freshness"]:
                lines.append(f"- Connector OK freshness 초과: {b.get('connector')} age={b.get('age_s')}s (max={b.get('max_age_s')}s) last_ok={b.get('last_ok_ts')}")
            lines.append("- (1) 토큰 만료/인증 실패 (401/403)")
            lines.append("- (2) 레이트리밋/일시 장애 (429/5xx)")
            lines.append("- (3) 워터마크(lastChangedDate 등) 갱신 실패로 증분 수집 정지")
            lines.append("\n*즉시 조치*")
            lines.append("- 대시보드 > Monitoring: connector_state last_err_code/last_err_msg 확인")
            lines.append("- /api/queue/run 으로 재시도(또는 backfill enqueue) 실행")
            lines.append("- 토큰 재발급/자격증명(SMARTSTORE_*) 재확인")

    elif event == "smartstore_missing_suspected":
        y = payload.get("yesterday",{})
        baseline = payload.get("baseline")
        lines.append("\n*원인 후보*")
        lines.append(f"- 전일({y.get('date')}) lastChangedDate 기준 주문건수 급감 (baseline={baseline})")
        lines.append("- (1) 증분 범위(rangeType=LAST_CHANGED_DATETIME) 워터마크 갱신 누락")
        lines.append("- (2) SmartStore API 오류/레이트리밋으로 일부 구간 누락")
        lines.append("- (3) 주문상태 변경 이벤트(취소/반품 등) 지연으로 lastChangedDate 편향")
        lines.append("\n*즉시 조치*")
        lines.append("- 대시보드 > Monitoring: connector errors(429/5xx) 여부 확인")
        lines.append("- backfill(전일) 큐 enqueue 후 /api/queue/run 실행")
        lines.append("- 동일 날짜를 '주문 생성일' 기준(rangeType=PAYED_DATETIME 등)로 교차 검증(가능하면)")
        # V333: auto backfill report (if present)
        bf = payload.get("auto_backfill") or {}
        run = payload.get("auto_backfill_run") or {}
        st = payload.get("auto_backfill_status")
        if bf:
            lines.append("\n*자동 백필(전일) 실행 결과*")
            lines.append(f"- backfill_job_id={bf.get('backfill_job_id')} status={st}")
            lines.append(f"- 처리: done={run.get('done')} failed={run.get('failed')} requeued={run.get('requeued')}")
            # show first few failures
            fails = [r for r in (run.get('results') or []) if not r.get('ok')]
            if fails:
                lines.append("- 실패 샘플:")
                for r in fails[:3]:
                    lines.append(f"  - {r.get('kind')}: {str(r.get('error') or '')[:120]}")


    else:
        lines.append("\n- (해석 템플릿 없음) payload를 확인해 주세요.")

    return "\n".join(lines)
