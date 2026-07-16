# DuplicatePreventionLog — 중복 방지/검출/통합 이력

> Duplicate Prevention Gate(15 카테고리) 적용 결과·중복 검출·통합 기록. 참조: `DUPLICATE_PERMISSION_AUDIT.md`·`ADMIN_GROWTH_DUPLICATE_AUDIT.md`·`BUG-009_CODE_DUPLICATION_FIX.md`.

| 사례 | 차수 | 판정 | 조치 |
|------|------|------|------|
| **check_routes_registered.mjs ↔ bin/audit_routes.php** | 265 | **중복**(동일목적·게이트 자가위반) | 구 php 도구 제거·node 정본 통합(c11393a6478) |
| DigitalShelf 키워드SoS ↔ po_competitors.sosRank | 265 | 비중복(키워드 vs SKU 도메인) | 전용 신설 정당 |
| Promotion ↔ CouponAdmin | 265 | 비중복(머천트 스토어할인 vs 플랫폼 구독쿠폰) | 전용 신설 정당 |
| AdAdapters 채널키 별칭맵 (cred() vs missingCreds) | 265 | 중복 위험 | CRED_CHAN_ALIAS 상수 SSOT 통합 |
| A3 CustomerAI churn/CLV ↔ CRM 예측 | 265 | 중복 | CustomerAI 배선 기각(CRM이 정본) |
| rules-of-hooks/php-l 가드 | 265 | 비중복(기존도구 없음·eslint 재사용은 중복아님) | 신설 정당 |
| TeamWorkspace members ↔ TeamMembers | 265 | 중복 | 위젯 배선 보류(TeamMembers 정본) |
| **3개 "segment" 네임스페이스**(crm_segments/Decisioning::segments/admin_growth_segment) | 289 | 비중복(고객멤버십 vs 집계코호트 vs 자체 B2B ICP — 도메인 상이) | 통합 금지·**Canonical 명명 분리**(EPIC06-A) |
| **LTV 티어**: CustomerAI::ltvSegments ↔ crm_segments ltv룰 | 289 | 중복(임계 상이 1M/500k vs ≥500k → gold≠VIP 상충) | Semantic Metric SSOT 티어 단일화(SEG-M3, Part 2) |
| **Predicted 지표**: 세그먼트 SQL근사 ↔ BG/NBD 실모델 | 289 | 중복경로(drift 가능) | 실모델 점수 영속→세그먼트 참조(SEG-M4) |
| **소비자 JOIN crm_segment_members ×4**(Kakao/SMS/Email/Omni) | 289 | 중복(복붙) | 공유 멤버해석 헬퍼로 통합(SEG-L3, Part 2) |

## 갱신 규칙
신규 코드/도구 신설 전 15카테고리 검사 결과 append(특히 중복 발견→통합/기각). tools/·bin/ 포함 검사.
