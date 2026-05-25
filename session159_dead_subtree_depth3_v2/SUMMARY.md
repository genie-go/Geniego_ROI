# Session 159 — P4 ko dead-subtree dry-run SUMMARY

Generated: 2026-05-25T04:09:31.063Z
Locale: **ko**, Manifest: `tools/resolver_consumer_manifest.json`

## ⚠️ 위험 신호 (spec §6 트리거)

- delete 후보가 **115** (>100) — 사용자 review 부담 ↑, 분할 apply 권장.
- subtree_leaf_count >50 인 delete 후보 40건 — 대규모 삭제, 별도 검수 권장.

## 집계

| 항목 | 값 |
|---|---:|
| ko top-level roots 검사 | 156 |
| verdict=safe_to_delete | 138 |
| verdict=do_not_delete | 18 |
| verdict=review_resolver | 0 |
| dry-run plan delete | **115** |
| dry-run plan skip | 41 |
| ┃ skip — direct consumer | 0 |
| ┃ skip — prefix consumer | 23 |
| ┃ skip — dynamic suspect | 0 |
| ┃ skip — AST drift | 0 |
| ┃ skip — verdict not dead | 18 |
| ┃ skip — has consumers | 0 |
| ┃ skip — conservative (manifest unavailable) | 0 |
| ┃ skip — other | 0 |
| total estimated leaf Δ | -6770 |

## Status 분포

| status | count |
|---|---:|
| dead | 138 |
| live | 10 |
| live_dynamic_only | 8 |

## Top delete candidates (subtree_leaf_count desc, max 10)

| # | root_path | leaf_count | rationale |
|---:|---|---:|---|
| 1 | `pages.marketingIntel.aiPredict` | 447 | dead-subtree (status=dead, 0 consumers) |
| 2 | `nav.pages.marketingIntel` | 442 | dead-subtree (status=dead, 0 consumers) |
| 3 | `nav.pages.aiPredict` | 326 | dead-subtree (status=dead, 0 consumers) |
| 4 | `nav.pages.menu` | 320 | dead-subtree (status=dead, 0 consumers) |
| 5 | `nav.pages.banner` | 249 | dead-subtree (status=dead, 0 consumers) |
| 6 | `nav.pages._marketing_1` | 238 | dead-subtree (status=dead, 0 consumers) |
| 7 | `pages.marketingIntel.influencer` | 204 | dead-subtree (status=dead, 0 consumers) |
| 8 | `aiPredict.banner.influencerUGC` | 197 | dead-subtree (status=dead, 0 consumers) |
| 9 | `nav.pages.influencerUGC` | 197 | dead-subtree (status=dead, 0 consumers) |
| 10 | `nav.pages.pricingDetail` | 193 | dead-subtree (status=dead, 0 consumers) |

## 검수자 노트

- 본 표는 **dry-run** 결과. 실 apply 는 사용자 review 후 별도 트랙.
- delete 후보는 detector + manifest 4-step 통과 (AST drift 없음, verdict=safe_to_delete, 0 consumers, manifest direct/prefix/dynamic 미차단).
- manifest 차단 = false-positive 보호 작동 (resolver 가 실제 사용 중인 path 를 dead 로 잘못 판정한 경우).
- 진행 권장 시 우선순위: subtree_leaf_count 작은 것 → 큰 것 (저위험 → 고위험).

