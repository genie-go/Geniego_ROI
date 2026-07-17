# DSAR — Workflow Candidate (§59)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §59 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 **선택(Candidate)** 개념 | grep 0 — 후보 산출·매칭·충돌 해소 전무 | `NOT_APPLICABLE` |
| 워크플로 정의 테이블 | `workflow_*`/`flow_*`/`wf_*` **grep 0** → **매칭할 후보 모집단 자체가 없음** | `NOT_APPLICABLE` |
| 승인 4종의 "누가·몇 명·어떤 순서" | 🔴 **코드 상수** — `Mapping.php:209-210` INSERT 인자에 `required_approvals` **리터럴 `2`** · `Alerting.php:562` 응답 `"required_approvals" => 2` **하드코딩** · `AdminGrowth` **단일 결재 암묵**(정족수 컬럼 자체 없음 :142-149) | `NOT_APPLICABLE` |
| 선택 정책(Selection Policy) | grep 0 | `NOT_APPLICABLE` |
| 템플릿 참조 | 승인 축 부재 · 인접 = `feed_template`(FeedTemplate.php — **상품 피드 도메인**) | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — 후보 선정·우선순위 개념이 전무하다.** §59는 "여러 워크플로 정의 중 **어느 것을 고를지**"를 기록하는 계약이다. 그러나 현행 승인 4종은 워크플로를 **고르지 않는다**: 어떤 승인이 몇 명을 요구하는지가 **호출 지점 코드 상수**로 박혀 있다(`2` 리터럴 ×2 · 암묵 단일결재 ×1). **선택할 대상이 1개도 없으므로 선택 로직이 없는 것이 아니라, 선택이라는 개념 자체가 성립한 적이 없다.**

**★축 주의 2 — "리터럴 2가 있으니 정족수 정책은 있다"고 계산 금지.** `Mapping.php:210` 의 `2` 는 **INSERT 실행 인자의 리터럴**이지 정책이 아니다. 조건(테넌트·금액·리스크·도메인)에 따라 달라질 여지가 코드에 없다. 이를 "정책 존재"로 계산하면 역산이다.

**★축 주의 3 — `Alerting:562` 의 `2` 는 장식이다.** `action_request` 는 **정족수 컬럼이 없고**, `listActionRequests` 는 `required_approvals:2` 를 응답하나 `decideAction` 은 **1명에 approved** 처리한다 = **계약 위반이 이미 존재**. 게다가 `INSERT INTO action_request` **grep 0 = 생산자 전무 = 한 번도 채워진 적 없음**(VACUOUS). 프론트 `Approvals.jsx:576` 의 `required_approvals` 도 **매핑 1회 후 참조 0**(dead field).

## 1. 원문 전사 + 판정 — **원문 29종**

원문: "Workflow 선택 시 다음을 기록한다."

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | candidate_id | 부재 | `NOT_APPLICABLE` |
| 2 | approval request | 부재(참조형) · 인접 실체 = `mapping_change_request`(Mapping.php:209) | `LEGACY_ADAPTER`(흡수 대상) |
| 3 | approval request version | 부재 — 승인 요청 버전 개념 전무 | `NOT_APPLICABLE` |
| 4 | approval case | 부재 — Case 개념 전무 | `NOT_APPLICABLE` |
| 5 | approval domain | 부재 — 도메인 축이 코드 분산(`ref_type` AdminGrowth.php:144 가 유사하나 자유 문자열) | `NOT_APPLICABLE` |
| 6 | request type | 부재 · 유사 = `ref_type`(AdminGrowth.php:144 · VARCHAR(40) 자유값 · 열거 미선언) | `NOT_APPLICABLE` |
| 7 | resource type | 부재 · 유사 = `ref_type`/`platform`+`field`(Mapping.php:209) | `NOT_APPLICABLE` |
| 8 | resource version | 부재 — 🔴 optimistic lock(`version`) grep 0 | `NOT_APPLICABLE` |
| 9 | tenant | 부분 존재 · 🔴 **`admin_growth_approval` 은 tenant_id 컬럼 없음**(AdminGrowth.php:142-149) · `mapping_change_request` 는 존재(:209) | `NOT_APPLICABLE`(일관성 결번) |
| 10 | workspace | 부재 — Workspace 개념 전무 | `NOT_APPLICABLE` |
| 11 | organization | 부재 | `NOT_APPLICABLE` |
| 12 | legal entity | 부재 | `NOT_APPLICABLE` |
| 13 | country | 부재(승인) · 인접 = 15개국 i18n·원산지 축(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 14 | environment | 부재(승인) · 인접 = `Db::envLabel()`(278차 · 운영/데모) | `LEGACY_ADAPTER` |
| 15 | amount | 부재(승인 선택 축) · 인접 = 예산/지출 값 다수(도메인 상이) | `NOT_APPLICABLE` |
| 16 | currency | 부재(승인 축) · ⚠️ 레지스트리 currency 오강제 = **287차 확정 오탐** — 재플래그 금지 | `NOT_APPLICABLE` |
| 17 | risk reference | 부재 | `NOT_APPLICABLE` |
| 18 | matched workflow definitions | 부재 — 🔴 **정의 테이블 grep 0 → 매칭 모집단 자체가 없음** | `NOT_APPLICABLE` |
| 19 | matched workflow versions | 부재 | `NOT_APPLICABLE` |
| 20 | template reference | 부재(승인) · 인접 = `feed_template`(상품 피드 도메인) | `KEEP_SEPARATE_WITH_REASON` |
| 21 | selection policy reference | 부재 — §60 자체가 부재 | `NOT_APPLICABLE` |
| 22 | excluded workflows | 부재 | `NOT_APPLICABLE` |
| 23 | conflict result | 부재 — 충돌 해소 개념 전무 | `NOT_APPLICABLE` |
| 24 | proposed workflow | 부재 | `NOT_APPLICABLE` |
| 25 | proposed start node | 부재 — 🔴 START 노드 부재(§13·§12) | `NOT_APPLICABLE` |
| 26 | required variables | 부재 — Variable 개념 전무 | `NOT_APPLICABLE` |
| 27 | validation result | 부재(선택 축) · 인접 = `Mapping::validateValue`(Mapping.php:203 · **매핑값 검증**) | `KEEP_SEPARATE_WITH_REASON` |
| 28 | manual review requirement | 부재 · §60 #11(Manual Review)와 짝 | `NOT_APPLICABLE` |
| 29 | evidence | 부재 · 인접 = `audit_log`(AdminGrowth.php:157-159) | `LEGACY_ADAPTER` |

**실측 개수: 29 / 29 전사.** 커버리지 = 부재 21 · 어댑터 4 · 분리 4.

## 2. 규칙

- 🔴 **§59는 "선택 로직 부재"가 아니라 "선택 개념 부재"다.** 현행 승인 4종은 **누가·몇 명·어떤 순서가 코드 상수**(`Mapping.php:210` 리터럴 `2` · `Alerting.php:562` 하드코딩 `2` · `AdminGrowth` 암묵 단일결재)로, 조건에 따라 달라질 여지가 코드에 없다. **정의(Definition)가 신설되기 전까지 Candidate는 기록할 대상이 없다.**
- 🔴 **`Alerting.php:562` 의 `2` 를 정족수 자산으로 계산 금지.** `action_request` 는 정족수 컬럼이 없고, 응답은 `2` 를 약속하나 `decideAction` 은 **1명에 approved** = **계약 위반이 이미 존재**. 생산자 grep 0(VACUOUS)이라 아직 드러나지 않았을 뿐이다. **현 상태 방치 = 가짜 정족수 잔존** → 첫 생산자로 배선하거나 폐기 후 디스패치만 회수하라.
- **`approval request` 흡수는 `Mapping::approve`+`actorId` 공용 추출로.** `mapping_change_request` 만이 REAL(정족수·위조불가 신원·자기승인 차단·dedup·상태 게이트 전부 `Mapping.php:238-294`)이다. 🔴 **4번째 Foundation 신설 금지(AL-19)** · **`EquivalenceProof` 선행 없이 통합 금지**(286차 rank 맵 붕괴 재현).
- **`tenant` 축은 결번을 먼저 메워라.** `admin_growth_approval` 에 tenant_id가 **없어**(AdminGrowth.php:142-149) 후보 산출의 테넌트 스코프가 성립하지 않는다. 조회도 전역(`:641`·`:1306`), 결정도 격리 없음(`:1324 WHERE id=?`). **테넌트 격리는 데이터 헌법상 절대** — 후보 매칭에 이 테이블을 편입하려면 백필이 선결.
- 🟠 **`approval domain`/`request type` 을 `ref_type` 으로 대체 금지.** `ref_type` 은 VARCHAR(40) **자유 문자열**이고 열거가 선언돼 있지 않다 — 매칭 키로 쓰면 오타가 곧 무매칭이다.
- **"상세 Dynamic Routing은 후속 Rule Engine에서 확장한다"**(원문 명시) — §59에서 라우팅 규칙을 앞당겨 구현하지 마라. 본 문서 범위는 **기록 계약**까지다.
- ⚠️ 오탐 주의(재플래그 금지): `Approvals.jsx:576` `required_approvals` 는 grep 0이 아니라 **매핑 1회 후 참조 0**(dead field) · 레지스트리 currency 오강제 = **287차 확정**.
- 🔴 29종 **"있다고 가정"하고 배선 금지**.
