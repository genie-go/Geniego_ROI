# DSAR — Owner Assignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§31 OWNER_ASSIGNMENT — 소유자(Owner) 기반 배정 계약:

1. **Owner 유형**:
   - Resource Owner
   - Program Owner
   - Project Owner
   - Budget Owner
   - Cost Center Owner
   - Profit Center Owner
   - Brand Owner
   - Partner Owner
   - Customer Owner
   - Contract Owner
   - Claim Owner
   - Settlement Owner
   - Payment Owner
2. **Controller 유형**:
   - Legal Entity Controller
   - Regional Controller
   - Country Controller
3. **Canonical Owner Binding** — 소유자는 Canonical 바인딩으로 해석한다(문자열 금지).

## 2. 기존 구현 대조

- **Canonical Owner Binding: ABSENT.** 자원/프로그램/예산/코스트센터/브랜드/파트너/계약 등에 대한 승인 소유자 바인딩 엔티티가 없다.
- 현행 유일한 "owner" 유사 필드는 `UserAuth.php:156-157,1225-1227` **parent_user_id 로, 이는 계정 owner(생성/소유 관계)** 이며 위 13종 Owner·3종 Controller 어느 것과도 매핑되지 않는다(단일 계정 소유 ≠ 자원별 owner 바인딩).
- Legal Entity/Regional/Country Controller(②): legal entity·geography 축이 Identity/Org 축 **ABSENT**(`legal_entity` grep 0)로 부재.
- **문자열 금지(③) 대조**: Owner 바인딩 자체가 없으므로 Canonical 여부를 판정할 대상 부재.
- 인접 참고: `AgencyPortal.php:80,365-384,414-427` agency_client_link 는 크로스테넌트 **접근권 승인**(client 테넌트 owner 가 승인)으로, 자원 소유자 배정과는 별개 도메인(KEEP_SEPARATE) — Owner Assignment 재료로 오인 금지.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: **Canonical Owner Binding 부재**가 직접 원인이다. Owner/Controller 해석은 **축3 Identity/Org(ABSENT)** 의 org_unit·legal_entity·geography 와, 자원↔소유자 바인딩 엔티티 신설을 선행 조건으로 한다. 현행 parent_user_id(계정 owner)를 자원 owner 로 재해석하는 것은 의미 오염이므로 사용 불가.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규 — 선행 4축 후행.** Canonical Owner Binding(자원 유형별 owner·controller)은 축3 Identity/Org(legal entity·geography 포함) 신설 이후 도입한다.
- **재사용 자산**: 소유자 미해석 시 Fallback/Manual Review 종착점은 실존 승인 큐 `catalog_writeback_job`(`Catalog.php:75-84`)+claim/lease `omni_outbox`(`Omnichannel.php:95-99,405,425-448`) 로 실현.
- **Mandatory Control**: 소유자는 반드시 Canonical Owner Binding 으로 해석(문자열/이메일/이름 매칭 금지). Owner 미해석 시 Silent Pass 금지 — Fallback(§51) 또는 Manual Review/Block.
- **무후퇴 유의**: 실 엔진은 별도 승인 세션. 코드변경 0. `parent_user_id` 의 owner 의미를 자원 owner 로 확대 재해석하지 않는다. Owner 바인딩이 없는 동안 "소유자 배정 완료"를 표시하지 않는다(가짜녹색 금지).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
