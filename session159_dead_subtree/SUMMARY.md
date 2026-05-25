# Session 159 — P4 ko dead-subtree dry-run SUMMARY

Generated: 2026-05-25T03:30:51.283Z
Locale: **ko**, Manifest: `tools/resolver_consumer_manifest.json`

## ⚠️ 위험 신호 (spec §6 트리거)

- delete 후보가 **0** — manifest 가 과보호 (또는 detector 가 모두 do_not_delete). manifest precision 재검토 가능.

## 집계

| 항목 | 값 |
|---|---:|
| ko top-level roots 검사 | 141 |
| verdict=safe_to_delete | 0 |
| verdict=do_not_delete | 141 |
| verdict=review_resolver | 0 |
| dry-run plan delete | **0** |
| dry-run plan skip | 141 |
| ┃ skip — direct consumer | 0 |
| ┃ skip — prefix consumer | 0 |
| ┃ skip — dynamic suspect | 0 |
| ┃ skip — AST drift | 0 |
| ┃ skip — verdict not dead | 141 |
| ┃ skip — has consumers | 0 |
| ┃ skip — conservative (manifest unavailable) | 0 |
| ┃ skip — other | 0 |
| total estimated leaf Δ | 0 |

## Status 분포

| status | count |
|---|---:|
| live | 141 |

## Top delete candidates (subtree_leaf_count desc, max 10)

_(no delete candidates)_

## 검수자 노트

- 본 표는 **dry-run** 결과. 실 apply 는 사용자 review 후 별도 트랙.
- delete 후보는 detector + manifest 4-step 통과 (AST drift 없음, verdict=safe_to_delete, 0 consumers, manifest direct/prefix/dynamic 미차단).
- manifest 차단 = false-positive 보호 작동 (resolver 가 실제 사용 중인 path 를 dead 로 잘못 판정한 경우).
- 진행 권장 시 우선순위: subtree_leaf_count 작은 것 → 큰 것 (저위험 → 고위험).

