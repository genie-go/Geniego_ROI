# DecisionLog — 주요 결정 이력

> 되돌리기 어렵거나 방향을 정하는 결정 기록. 참조: `COMPETITIVE_REVALIDATION_*.md`·`NEXT_SESSION.md`.

| 결정 | 차수 | 근거 | 결과 |
|------|------|------|------|
| 구독 PG **Paddle 유지**(Stripe 전환 보류) | 263·264 | Stripe 한국 사업자 미지원(지원국 제외) | 운영/데모 Paddle 원복·Stripe코드 로컬보관 |
| 데이터 수집 정규화(fxToKrw KRW) 단일화 | 228차 S5~ | 통화 비대칭 방지 | channel_orders.total_price=KRW(currency 컬럼 불요) |
| PG정산 netProfit 미합산(de-silo KPI) | 235 | 이중계산 방지 | FP-1 확정·재플래그 금지 |
| **A3 CustomerAI 배선 기각** | 265 | 운영경로 빈스텁(201/208차 가짜차단)·CRM 예측 중복 | 배선 안함(빈화면/가짜 방지) |
| **audit_routes 중복 통합** | 265 | check_routes_registered.mjs가 상위 재구현($pfx/api 정확) | 구 php 도구 제거·node 정본 |
| 검출기 근본제거(패치→CI가드) | 265 | 반복재발 클래스 | G9 라우트·G10 훅·G11 php-l |
| 신규 백엔드는 도메인구분 후만 | 265 | 중복금지 | DigitalShelf(키워드SoS≠SKU가격)·Promotion(머천트≠구독쿠폰) |
| **EPIC06-A: Segmentation Baseline=기존 확장(신 엔진 금지)** | 289 | crm_segments+members 실 SoT·isMarketingSendAllowed 중앙게이트 존재 | Option E(Hybrid) 확장·재구현 금지(ADR_SEGMENTATION_ARCHITECTURE_BASELINE) |
| **"segment" 3도메인 명명 분리(통합 아님)** | 289 | Customer/Decisioning-cohort/Growth-ICP 의미 상이 | Canonical 명칭 분리·admin_growth_segment/Decisioning KEEP_SEPARATE |
| **발송 게이트 표준화 P0(코드는 별도 세션)** | 289 | /sms/send·/whatsapp/send·sendOne 무게이트·/sms/broadcast 우회·phone DNC 부재(PM 재증명) | baseline은 리스크기록만·수정은 verify+배포승인 후 |
| **EPIC06-A P2: Canonical DSL=현행 상위호환(교체 아님)** | 289 | crm_segments rules JSON `[{field,op,value}]` 정본·refreshSegmentMembers SQL컴파일 정본 | Canonical=SQL Adapter 승격·6 operator/AND 보존+확대·ADR_CANONICAL_SEGMENT_DSL |
| **참조 Registry 기반화(자체 SQL 재계산 제거)** | 289 | ltv/frequency 자체 SQL·churn/clv 인라인근사가 EPIC03 Semantic·BG/NBD 실모델과 중복(SEG-M4) | SEMANTIC_METRIC/MODEL_SCORE 참조 단일화·근사는 별도 model_id 라벨 |
| **Canonical 실 구현=별도 승인세션(Golden+verify+배포승인)** | 289 | 미검증 엔진 구현은 무후퇴·verify 위반 | P2=설계명세만(코드변경0)·Migration은 Shadow Compare·UNEXPLAINED시 전환차단 |
| **EPIC06-A P3-1: Segment Membership≠Audience Member(Snapshot 신설)** | 289 | 현행 발송루프 즉석필터·Snapshot 부재(SEG-H4/H5)로 과거대상 재현·Reconciliation 불가 | Audience Definition/Version/불변Snapshot/Candidate/Member/Exclusion 신설·ADR_CANONICAL_AUDIENCE_BUILDER |
| **AdAdapters=Destination 보존(Builder 아님)·단일 Canonical Builder** | 289 | AdAdapters 실 아웃바운드는 Destination층·CRM/광고/Email별 독립 Builder 중복금지 | AdAdapters=Part3-3 VALIDATED_LEGACY·발송루프=Canonical Build로 앞단 대체 |
| **Static List Governance 신설(현행 진짜 부재)** | 289 | Part1 부재증명 | Malware Scan·Consent Evidence·Tenant Scope·Retention·Audit 필수·신설 정당 |
| **EPIC06-A P3-2: isMarketingSendAllowed=Canonical Eligibility Engine 승격** | 289 | 실 중앙게이트 정본·채널별 자체 Eligibility 다중 없음 | Identity/Identifier/Freshness/Destination 확장·채널별 독립 Engine 금지·ADR_CANONICAL_AUDIENCE_ELIGIBILITY_ENGINE |
| **Contactability≠Reachability·Unknown≠Eligible(Fail-closed)** | 289 | 현행 미분리·fail-open(SEG-M1·phone SEG-C4) | 3중 분리+Fail-closed·Unknown 차단·무게이트 경로(SEG-C1~C4) Execution Recheck 강제(P0) |
| **Eligibility Threshold=Golden+운영증거(임의숫자 금지)** | 289 | 실값 자동산출 원칙 | Identity Confidence 등 Threshold 하드코딩 금지·Golden Dataset+운영증거로 확정 |
| **EPIC06-A P3-3-1: crm_channel_prefs=Canonical Consent Store 승격·Boolean→Record** | 289 | 실 consent store·opted_in=Evidence없는 Legacy Boolean | Purpose/Brand/Policy Version/Evidence 추가·자동 GRANTED 금지·ADR_CANONICAL_CONSENT_ENGINE |
| **Consent≠Suppression·Merge 시 Consent 보존** | 289 | 개념 분리·EPIC05 병합 동의확대 방지 | email_suppression/phone DNC=Suppression(Part3-3-2)·병합 시 덮어쓰기 금지 |
| **Unknown≠Granted·목적 확대 금지(Consent)** | 289 | 현행 opt-out 기본허용(SEG-M1)·채널→전목적 확대 암묵 | Unknown 차단+Purpose 분리·보수적 Resolution(Latest Withdrawal 우선) |

## 갱신 규칙
방향/보류/기각/원복 등 결정 발생 시 append(근거·결과 포함). 삭제 금지(이력 보존).
