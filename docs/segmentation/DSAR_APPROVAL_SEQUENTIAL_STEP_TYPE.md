# DSAR — Sequential Step Type (enum) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§15 STEP_TYPE enum(16종):
APPROVAL / REVIEW / VALIDATION / ACKNOWLEDGEMENT / FINANCIAL_APPROVAL / LEGAL_APPROVAL / COMPLIANCE_APPROVAL / SECURITY_APPROVAL / REBATE_APPROVAL / CLAIM_APPROVAL / SETTLEMENT_APPROVAL / PAYMENT_APPROVAL / CONTRACT_APPROVAL / MANUAL_REVIEW / SYSTEM_VALIDATION / CUSTOM.

## 2. 기존 구현 대조

- **Step 이라는 타입 축이 실존하지 않는다**(§GROUND_TRUTH 다단 Step ABSENT). 승인은 도메인별로 분산된 단발/정족수 처리일 뿐 유형 분류가 없다:
  - 일반 승인 단발 = `admin_growth_approval`(`AdminGrowth.php:146`·`:1330`) — 유형 컬럼 없음.
  - 고가치 승인 = `Catalog.php:395` requiresHighValueApproval·`:2300` approvalCreate — **도메인특화 boolean/생성**이지 STEP_TYPE 열거가 아님(§3.1).
  - 매핑 변경 정족수 = `mapping_change_request`(`Mapping.php:287`) — 유형 없음.
- FINANCIAL/LEGAL/COMPLIANCE/SECURITY/REBATE/CLAIM/SETTLEMENT/PAYMENT/CONTRACT_APPROVAL 같은 **업무영역별 승인 유형 분류**를 담는 실존 스키마 없음.
- SYSTEM_VALIDATION 에 근접한 자동 검증 = CAS 조건부 UPDATE(`Catalog.php:1726-1730`)이나 이는 워커 선점 술어이지 승인 Step 유형이 아니다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Approval Chain(승인 유형이 귀속될 Chain/Step 정의 부재) · 부모 §15 Step Instance
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum.** `requiresHighValueApproval`(`Catalog.php:395`) 같은 도메인 boolean 을 STEP_TYPE 으로 승격하지 마라 — 하나의 도메인 신호를 16종 분류로 캐스팅하면 의미 확대다.
- **CUSTOM 우선 남용 금지**: FINANCIAL/LEGAL/COMPLIANCE/SECURITY 유형은 각각 §21 Guard(SOD_PASS·CONFLICT_OF_INTEREST_PASS·SECURITY_ACTIVE)·§39 Suspension reason 과 연동되므로 표준 유형으로 명시하고 CUSTOM 은 최후수단.
- **무후퇴**: Step Instance(§15)·Step Type 는 선행 5군 이후 동시 신설 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_STEP_INSTANCE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
