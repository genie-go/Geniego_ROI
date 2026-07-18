# DSAR — Approval Decision Target Resolution (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§19 TARGET_RESOLUTION** — Canonical Target:
Request / Case / Item / Requirement / Work Item / Assignment / Sequential Instance / Stage / Level / Step / Decision Slot / Resource / Action Scope / Amount / Currency / Legal Entity / Organization.

★ **Client Target ID 의 관계 일관성 검증**(클라이언트가 준 대상 id 를 그대로 신뢰하지 말고 Canonical Target 으로 재해석·상호 정합 검증).

## 2. 기존 구현 대조

승인 대상(target)을 **Canonical Target 으로 재해석·정합 검증하는 계층이 존재하지 않는다.** 4핸들러는 요청이 준 대상 식별자(mapping row id·pending id·action id·queue id)를 그대로 WHERE 절 키로 써서 UPDATE 한다 — Case/Item/Requirement/Work Item/Assignment/Slot 로의 관계 일관성 검증이 없다.

| 계약 요소 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| Client Target ID 를 그대로 UPDATE 키로 사용 | 존재(검증 없이) | `Mapping::approve :288`(단일 UPDATE) · `AdminGrowth::approvalDecide :1330` · `Alerting::decideAction :594` · `Catalog::approveQueue :2397`(bulk UPDATE WHERE status) |
| tenant 정합 | 부분 존재 | Tenant Guard(index.php·49핸들러 WHERE tenant_id) · `Mapping::tenantId` |
| 이미처리/CAS 방어 | 부분 존재 | `AdminGrowth` 이미처리 409 `:1327` · `Catalog` CAS-lite WHERE status |
| Decision Slot resolution | **부재** | §13 SLOT ABSENT |
| Case/Item/Requirement/Work Item resolution | **부재** | §3.1 Approval ABSENT |
| Assignment/Sequential Instance/Step resolution | **부재** | §3.4 Assignment · §3.5 Sequential ABSENT |
| Resource/Action Scope/Amount/Currency/Legal Entity/Org 정합 | **부재** | no hits |
| Client Target ID **관계 일관성** 검증 | **부재** | no hits |

tenant WHERE 절만 정합을 부분 보장할 뿐, 대상 id 가 올바른 Slot/Assignment/Step 에 속하는지의 관계 검증은 전무하다.

## 3. 판정

- **Verdict: ABSENT** — Target Resolution 계층 전무. tenant WHERE 정합·CAS-lite 만 부분 존재(이는 Target Resolution 이 아니라 격리/동시성 방어). Canonical Target 재해석·관계 일관성 검증은 0.
- **선행 의존**: §13 SLOT·§3.1 Approval·§3.4 Assignment·§3.5 Sequential(모두 ABSENT) — 재해석 대상인 Canonical Target 축 자체가 부재.
- **cover: 0** (Target Resolution 기준). tenant 격리는 인접 재사용 자산.

## 4. 확장/구현 방향 (설계)

- Target Resolution 을 **Validation Pipeline(§25)의 초기 단계로 신설** — client 가 준 대상 id 를 Canonical Target(Case/Item/Slot/Assignment/Step)으로 매핑하고, 그것들의 상호 관계 일관성(대상 id 가 해당 tenant·slot·step 에 실제 속하는가)을 검증. 불일치 시 fail-closed.
- **tenant WHERE 정합(Tenant Guard·`Mapping::tenantId`)은 이미 정본이므로 재사용**하되, 그 위에 Slot/Assignment/Step 관계 검증을 얹는다(중복 격리 로직 신설 금지).
- **선행 의존**: Decision Slot(§13)·Assignment(§3.4)·Sequential Instance(§3.5) 신설이 절대 선행 — Canonical Target 이 존재해야 재해석이 성립.
- 실위험: `Catalog::approveQueue`(`:2397`) bulk UPDATE 는 대상 집합을 status WHERE 로만 좁힌다 — Target 관계 검증 없이 대량 승인되므로, Slot 도입 시 각 행의 Slot 소속을 개별 검증하도록 봉합.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_SCOPE_RESOLUTION]] · [[DSAR_APPROVAL_DECISION_ELIGIBILITY]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
