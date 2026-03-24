#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V314 간단 리포트 생성기

- 목적: CSV(광고/전환)를 읽어 핵심 KPI(광고비, 매출, 전환, ROAS, CPA)를 계산하고
  요약 CSV를 생성합니다.
- 주의: 본 스크립트는 '샘플/레퍼런스'입니다. 실제 운영에서는 채널 API, DB, BI와 연결하세요.

사용 예:
  python scripts/v314/generate_ads_report.py \
      --ads templates/v314/ads_campaigns_template.csv \
      --conv templates/v314/conversions_template.csv \
      --out demo/sample_data/v314_ads_report_summary.csv
"""

import argparse
import pandas as pd

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ads', required=True, help='ads campaigns daily CSV path')
    ap.add_argument('--conv', required=True, help='conversions daily CSV path')
    ap.add_argument('--out', required=True, help='output summary CSV path')
    args = ap.parse_args()

    ads = pd.read_csv(args.ads)
    conv = pd.read_csv(args.conv)

    # Normalize
    for col in ['spend_krw','impressions','clicks']:
        if col in ads.columns:
            ads[col] = pd.to_numeric(ads[col], errors='coerce').fillna(0)
    for col in ['conversions','revenue_krw','leads']:
        if col in conv.columns:
            conv[col] = pd.to_numeric(conv[col], errors='coerce').fillna(0)

    # Join by campaign_id + date (최소 기준)
    merged = ads.merge(conv, on=['date','campaign_id'], how='left', suffixes=('','_conv'))
    merged['conversions'] = merged['conversions'].fillna(0)
    merged['revenue_krw'] = merged['revenue_krw'].fillna(0)

    # KPIs
    merged['roas'] = merged.apply(lambda r: (r['revenue_krw']/r['spend_krw']) if r['spend_krw'] else 0, axis=1)
    merged['cpa'] = merged.apply(lambda r: (r['spend_krw']/r['conversions']) if r['conversions'] else 0, axis=1)

    summary = merged.groupby('channel', as_index=False).agg(
        spend_krw=('spend_krw','sum'),
        revenue_krw=('revenue_krw','sum'),
        conversions=('conversions','sum'),
        impressions=('impressions','sum'),
        clicks=('clicks','sum'),
    )
    summary['roas'] = summary.apply(lambda r: (r['revenue_krw']/r['spend_krw']) if r['spend_krw'] else 0, axis=1)
    summary['cpa'] = summary.apply(lambda r: (r['spend_krw']/r['conversions']) if r['conversions'] else 0, axis=1)

    summary.to_csv(args.out, index=False, encoding='utf-8-sig')
    print('Saved:', args.out)

if __name__ == '__main__':
    main()
