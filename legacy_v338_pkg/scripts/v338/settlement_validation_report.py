#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V335 정산 검증 리포트

- orders_norm_v334 (주문)와 settlements_norm_v334 (정산) 간
  gross_sales / fees / refunds / net_payout 정합성을 간단히 검증합니다.
- 채널별/정산기간별로 비교하고,
  gap ratio가 임계치를 넘으면 WARN/ERROR로 표시합니다.
- 결과는:
  1) workspace/out/settlement_validation_<ts>.md
  2) settlement_validation_v335 테이블
"""
from __future__ import annotations
import argparse, pathlib, sqlite3, json, uuid
from datetime import datetime
from scripts.v335.ingest_common import open_db, _now_iso
from scripts.v334._common import load_json

def _md_escape(s: str) -> str:
    return (s or "").replace("|","\\|")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--project", default="testclient")
    ap.add_argument("--thresholds", default="templates/v335/settlement_validation_thresholds.json")
    args = ap.parse_args()

    ws = pathlib.Path(args.workspace)
    conn = open_db(ws)
    th = load_json(args.thresholds).get("default_thresholds") or {}
    warn_gap = float(th.get("revenue_gap_ratio_warn", 0.02))
    err_gap  = float(th.get("revenue_gap_ratio_error", 0.05))
    warn_fee = float(th.get("fee_ratio_warn", 0.25))
    err_fee  = float(th.get("fee_ratio_error", 0.35))

    report_id = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    out_dir = ws/"out"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir/f"settlement_validation_{report_id}.md"

    # Pull settlements
    settlements = conn.execute("""
      SELECT channel, settlement_id, period_start, period_end, payout_ts, gross_sales, fees, refunds, net_payout, currency, detail_json
      FROM settlements_norm_v334
      WHERE project_id=?
      ORDER BY channel, period_start
    """, (args.project,)).fetchall()

    lines = []
    lines.append(f"# Settlement Validation Report (V335)\n")
    lines.append(f"- project: `{args.project}`\n- report_id: `{report_id}`\n- generated: `{_now_iso()}`\n")
    lines.append(f"## Summary\n")
    if not settlements:
        lines.append("정산 데이터가 없습니다. settlements_norm_v334에 정산을 적재한 뒤 다시 실행하세요.\n")
        out_path.write_text("\n".join(lines), encoding="utf-8")
        print(out_path.as_posix())
        return

    header = "|channel|period|orders_gross|settle_gross|gap_ratio|fees_ratio|severity|\n|---|---:|---:|---:|---:|---:|---|\n"
    lines.append(header)

    for (channel, settlement_id, ps, pe, payout_ts, gross_sales, fees, refunds, net_payout, currency, detail_json) in settlements:
        # order gross in period
        og = conn.execute("""
          SELECT COALESCE(SUM(gross_amount),0) FROM orders_norm_v334
          WHERE project_id=? AND channel=? AND order_ts >= ? AND order_ts < ?
        """, (args.project, channel, ps, pe)).fetchone()[0]
        sg = float(gross_sales or 0)
        gap = (abs(og - sg) / sg) if sg > 0 else (1.0 if og > 0 else 0.0)
        fee_ratio = (float(fees or 0) / sg) if sg > 0 else 0.0

        severity = "OK"
        if gap >= err_gap or fee_ratio >= err_fee:
            severity = "ERROR"
        elif gap >= warn_gap or fee_ratio >= warn_fee:
            severity = "WARN"

        # store into db
        detail = {
            "settlement_id": settlement_id,
            "orders_gross": og,
            "settle": {"gross_sales": sg, "fees": float(fees or 0), "refunds": float(refunds or 0), "net_payout": float(net_payout or 0)},
            "gap_ratio": gap,
            "fee_ratio": fee_ratio
        }
        conn.execute("""
          INSERT OR REPLACE INTO settlement_validation_v335(
            project_id, report_id, channel, period_start, period_end, metric, value, threshold, severity, detail_json, created_ts
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (args.project, report_id, channel, ps, pe, "revenue_gap_ratio", gap, err_gap, severity, json.dumps(detail, ensure_ascii=False), _now_iso()))
        conn.execute("""
          INSERT OR REPLACE INTO settlement_validation_v335(
            project_id, report_id, channel, period_start, period_end, metric, value, threshold, severity, detail_json, created_ts
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (args.project, report_id, channel, ps, pe, "fee_ratio", fee_ratio, err_fee, severity, json.dumps(detail, ensure_ascii=False), _now_iso()))

        period = f"{ps}~{pe}"
        lines.append(f"|{_md_escape(channel)}|{_md_escape(period)}|{og:.0f}|{sg:.0f}|{gap:.3f}|{fee_ratio:.3f}|{severity}|\n")

    conn.commit()
    lines.append("\n## Notes\n")
    lines.append(f"- gap_ratio WARN >= {warn_gap}, ERROR >= {err_gap}\n")
    lines.append(f"- fee_ratio WARN >= {warn_fee}, ERROR >= {err_fee}\n")
    lines.append("- 채널별 수수료 규칙(카테고리/프로모션/배송비 포함)이 정교할수록 오탐이 줄어듭니다.\n")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(out_path.as_posix())

if __name__ == "__main__":
    main()
