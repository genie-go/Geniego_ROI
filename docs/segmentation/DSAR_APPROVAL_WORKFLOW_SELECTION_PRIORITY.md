# DSAR — Workflow Selection 기본 우선순위 (§60)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §60 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 **우선순위** 개념 | grep 0 — 우선순위 축·정책·해소 규칙 전무 | `NOT_APPLICABLE` |
| 선택 대상 모집단 | 워크플로 정의 테이블 **grep 0** → **후보가 0개** | `NOT_APPLICABLE` |
| 현행 승인의 "몇 명·어떤 순서" | 🔴 **코드 상수** — `Mapping.php:209-210` INSERT 인자 리터럴 `2` · `Alerting.php:562` 응답 하드코딩 `2` · `AdminGrowth` 암묵 단일결재(정족수 컬럼 없음 :142-149) | `NOT_APPLICABLE` |
| 충돌 해소 | 개념 전무 | `NOT_APPLICABLE` |

**★축 주의 — 우선순위는 후보가 복수일 때만 성립한다.** 현행은 승인 종류마다 워크플로가 **코드에 1:1로 박혀** 있다: mapping 요청은 항상 `2`명, action_request는 항상 `2`(장식), AdminGrowth는 항상 단일 결재. **고를 것이 없으므로 우선순위가 "잘못된" 것이 아니라 존재한 적이 없다.** §60은 §59(Candidate)·정의 테이블이 신설된 이후에야 구속력을 갖는 **전방호환 계약**이다.

**★축 주의 2 — 12단계를 현행 4종에 배분 금지.** "Tenant Default = AdminGrowth, Platform Standard = Mapping" 식의 사후 배분은 **역산**이다. 현행 4종은 우선순위 축 위에 놓인 적이 없고, 서로 대체 후보도 아니다(각자 다른 도메인의 고정 경로).

## 1. 원문 전사 + 판정 — **원문 12종**

원문: "권장 우선순위:"

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Explicit Workflow Binding | 부재 — 명시 바인딩 개념 전무 · 현행은 **코드 경로 고정**(바인딩이 아니라 하드코딩) | `NOT_APPLICABLE` |
| 2 | Approval Domain 전용 Tenant Workflow | 부재 — Approval Domain 축 미선언(§59 #5) | `NOT_APPLICABLE` |
| 3 | Legal Entity 전용 Workflow | 부재 — Legal Entity 개념 전무 | `NOT_APPLICABLE` |
| 4 | Workspace 전용 Workflow | 부재 — Workspace 개념 전무 | `NOT_APPLICABLE` |
| 5 | Program 전용 Workflow | 부재 — Program 개념 전무 | `NOT_APPLICABLE` |
| 6 | Country·Region Workflow | 부재(승인) · 인접 = 15개국 i18n(표시 축·도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | Financial Threshold 전용 Workflow Reference | 부재 — 🔴 금액 임계 분기 승인 전무(리터럴 `2` 는 금액 무관 고정) | `NOT_APPLICABLE` |
| 8 | Risk Workflow Reference | 부재 — Risk 축 전무 | `NOT_APPLICABLE` |
| 9 | Tenant Default Workflow | 부재 · 🔴 `admin_growth_approval` 은 **tenant_id 컬럼 자체가 없어**(AdminGrowth.php:142-149) 테넌트별 기본값이 성립 불가 | `NOT_APPLICABLE` |
| 10 | Platform Standard Template | 부재(승인) · 인접 = `feed_template`(상품 피드 도메인) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | Manual Review | 부재(폴백 축) · 인접 = 현행 승인 큐 자체가 사람 결재(`AdminGrowth::approvalDecide` :1322-1330)이나 **폴백이 아니라 유일 경로** | `NOT_APPLICABLE` |
| 12 | Block | 부재(폴백 축) · 인접 실자산 = `AdAdapters::executionEnabled`(:34-40 · **호출부 9곳 실배선 REAL**) | `VALIDATED_LEGACY`(차단 프리미티브 재사용) |

**실측 개수: 12 / 12 전사.** 커버리지 = 부재 9 · 분리 2 · 확장 1.

## 2. 규칙

- 🔴 **동일 우선순위의 여러 Workflow가 충돌하면 자동 임의 선택하지 마라**(원문 명시). 충돌은 **#11 Manual Review 또는 #12 Block 으로 낙하**해야 한다. 임의 선택(예: `ORDER BY id LIMIT 1`)은 계약 위반이며, 레포에 이미 그런 관행이 있다(`ad_delivery_dlq` `ORDER BY id LIMIT` AdAdapters.php:1193 — 큐 소비에는 정당하나 **정책 선택에 전용 금지**).
- 🔴 **12단계를 현행 승인 4종에 사후 배분 금지 — 역산.** 현행은 우선순위 축 위에 놓인 적이 없다(각자 고정된 단일 코드 경로).
- 🔴 **#7 Financial Threshold 가 결번의 핵심이다.** 현행 정족수는 **금액과 무관한 고정 리터럴 `2`**(Mapping.php:210)다 — 1만원 매핑 변경과 1억원 예산 변경이 같은 승인 강도를 받는다. 정의 신설 시 임계 분기가 최우선 요구다.
- **#9 Tenant Default 는 테넌트 결번 해소가 선결.** `admin_growth_approval` 에 tenant_id가 없고(:142-149), 조회는 전역(`:641`·`:1306`), 결정 경로도 격리가 없다(`:1324 WHERE id=?`). **테넌트별 기본 워크플로는 tenant_id 백필 전에는 정의 불가.**
- **#12 Block 은 `AdAdapters::executionEnabled` 재사용 강제** — 신규 차단 기전 신설 금지.
  - ⚠️ 오탐 주의: `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**(주석만 읽고 판단 금지) — 재플래그 금지.
- **#11 Manual Review 를 "이미 있다"고 계산 금지.** 현행 사람 결재는 **폴백이 아니라 유일 경로**다. §60의 Manual Review는 *자동 선택 실패 시의 안전 낙하*이며, 자동 선택이 없는 현재는 개념이 성립하지 않는다.
- **선택은 fail-closed.** 매칭 0건 → 자동 진행이 아니라 #11/#12 로. 무매칭을 "제약 없음"으로 해석하면 무게이트 집행이 된다(289차 CRITICAL P0 계열 재현).
- 🔴 12종 **"있다고 가정"하고 배선 금지**.
