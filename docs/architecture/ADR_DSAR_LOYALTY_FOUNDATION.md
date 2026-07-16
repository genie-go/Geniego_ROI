# ADR — DSAR Loyalty Foundation Discovery (EPIC 06-A Part 3-3-3-3-3-3-3-3-4-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Loyalty Foundation Discovery Governance 계약 명세 확정. 비파괴 — 코드변경 0). 실 Loyalty Program/Adapter/Reconciliation/CI 가드 구현은 **Loyalty Program 엔진 도입 시** 후속 승인 세션. **grade 를 Loyalty Program Member 로 확정·마켓 point_discount 를 로열티 포인트로 매핑·reward coupon 을 로열티 적립으로 매핑·Tier 승급 이력 조작(부재)·Loyalty Program 부재를 NO_DATA/오탐 처리 금지.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_LOYALTY_DISCOVERY.md`](../segmentation/CANONICAL_DSAR_LOYALTY_DISCOVERY.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_LOYALTY_GOVERNANCE.md) · **loyalty/membership/tier/reward/point 전용 핸들러 부재(grep 0)** · `crm_customers.grade`(normal/new/bronze/silver/gold) · `vip_upgrade` Journey · reward coupon(REWARD_PLAN) · `point_discount`(마켓 포인트·KrChannel/Rollup/PgSettlement 정산) · `membershipLifeSpan`(crm_segment_members) · Part 3-3-3-3-3-3-2 CRM/CDP · Part 3-3-3-3-2 Verification Token · EPIC05 Merge.

## 결정 (핵심)

1. **★실측 정직·엔진 부재 명시**: **GeniegoROI 는 소비자 Loyalty Program 엔진 미보유** — **Points 원장·Tier 승급/강등 엔진·Enrollment·Membership·Merge/Split·Reward 적립/사용 원장 전부 NOT_APPLICABLE**(전용 핸들러 grep 0). **유일한 실 loyalty 표면=`crm_customers.grade`**(고객 등급 속성·normal/new/bronze/silver/gold·머천트 분류·segmentation/targeting·CRM Discovery Part 3-3-3-3-3-3-2 이미 포함). 지어내기 금지·본 Foundation=전방호환 계약. 기존 grade/Journey/coupon/point_discount=정본·확장·Loyalty Program별 독립 Candidate Store 금지.

2. **grade ≠ Loyalty Program Member(§)**: grade 는 **CRM 속성**(승급엔진·Enrollment·원장·이력 없음) → Loyalty Program Member/Account/Tier 승급으로 확정 금지. grade 변경=단순 crm_customers UPDATE(전용 Status/Tier Change History=GAP·N/A). Canonical Tier 표준(BRONZE~ENTERPRISE/CUSTOM)에 grade 값 매핑(bronze/silver/gold=매핑·platinum/vip/corporate/enterprise=미사용→미래).

3. **마켓 point_discount ≠ 로열티 포인트·reward coupon ≠ 로열티 적립**: `point_discount`=마켓플레이스(11번가/쿠팡/네이버) 소유 포인트·정산 차감 라인(KrChannel/Rollup/PgSettlement)·**GeniegoROI 로열티 포인트 원장 아님(KEEP_SEPARATE)**. `vip_upgrade` Journey·reward coupon=마케팅 자동화(Journey/Coupon Part 연계·로열티 아님·KEEP_SEPARATE). `membershipLifeSpan`=Audience Membership TTL(Part1·로열티 Membership 아님). **오혼입=Static Lint/Runtime Guard 차단**.

4. **Relationship Graph·Mapping**: 현행 실선=Customer(crm_customers)→Level(grade)·나머지(Loyalty Account/Program/Wallet/Reward/Point)=N/A/KEEP_SEPARATE/미래. Customer(EPIC05)/Subscription(paddle)/Organization(app_user/tenant)/Store/Brand/Tenant/Role Mapping. Customer Merge 시 grade 승계(EPIC05 정합).

5. **Loyalty Program 부재 ≠ Gap·NO_DATA 금지**: Loyalty Program 엔진 부재는 결함/Gap 이 아니라 **`PROVIDER_LIMITATION`/NOT_APPLICABLE 명시**. NO_DATA/오탐 처리 금지. Loyalty Discovery=crm_customers.grade 조회(CRM Discovery 재사용·별도 엔진 검색 불필요).

6. **정직·무후퇴·Coverage/Gap**: Loyalty↔Customer↔Subscription Mapping·Candidate/Coverage/Gap=현행 부재→전방호환 목표계약. Coverage 다차원·Critical Gap(grade 잘못된 Tenant·CRM Discovery grade 누락·Merge grade 오승계·point 오분류) 시 Access Review 차단. grade/Journey/coupon/point_discount/membershipLifeSpan 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·LEGACY_WRONG_SUBJECT_RISK·고객영향 LEGACY_DISCOVERY_GAP·CANONICAL_LOYALTY_DEFECT·Cross-Tenant→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙
신규 Loyalty Program/Tier/Point/Reward 도입 전: Customer Identity(EPIC05)·grade 속성·Tenant/Brand/Store Scope·Subject Role·Loyalty↔Customer↔Subscription Mapping·마켓 point/reward coupon 도메인 분리·Candidate/Reconciliation/Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **grade↔마켓 point↔로열티 포인트 오혼입 금지·Loyalty Program별 독립 Registry/Candidate Store 중복 생성 금지.**

## 결과
Loyalty Entity(23)·Discovery Profile(내부 grade)·**Program/Member/Account=NOT_APPLICABLE**·Loyalty Profile·**Level=crm_customers.grade(normal/new/bronze/silver/gold)**·Tier 표준(8·grade 매핑)·Status(8)·**Enrollment/Tier Change/Expiration/Suspension/Merge/Split/Status History=NOT_APPLICABLE(승급엔진·원장 부재)**·Relationship Graph(Customer→Level 실선·나머지 N/A/KEEP_SEPARATE)·Mapping(7)·Candidate·Coverage/Gap·Evidence/Reconciliation·Permission/Guard/Lint·Error/Warning·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_LOYALTY_{DISCOVERY,GOVERNANCE}.md. **★Loyalty Program 엔진·Points 원장·Tier 승급=NOT_APPLICABLE·유일 실 loyalty=grade 속성·마켓 point/reward coupon=KEEP_SEPARATE 정직표기**. 다음 Coupon/Promotion/Discount·Wallet·Gift Card Discovery 등 후속 Part 입력 준비 완료.
