# ADR — DSAR Rebate Role, Organization, Tenant, Workspace & Scope Governance

- **상태**: Accepted (설계 정본 · 구현 미착수)
- **차수**: 289차
- **EPIC**: 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · **Spec Version 1.0 수령분**
- **코드변경**: **0** (비파괴)
- 정본: [`CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md`](../segmentation/CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · §53 **57편** · 요구 분모 [`REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md`](../segmentation/REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)

---

## 맥락 — 자율 설계본의 양보

289차 초반 **스펙 미수령 상태**에서 5-2를 자율 판단으로 수행했고, 산출물마다
**"스펙 수령 시 본 문서가 양보한다"**를 명시했다. **스펙이 수령됐으므로 그 약속을 이행한다.**

- **정본**: 본 ADR + `CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md` + §53 57편
- **자율 설계본**: `CANONICAL_DSAR_AUTHORIZATION_ORGANIZATION_TENANT_SCOPE.md` ·
  `CANONICAL_DSAR_AUTHORIZATION_ROLE_GOVERNANCE.md` · `ADR_DSAR_REBATE_AUTHORIZATION_ORG_ROLE_SCOPE.md`
  → **참고 이력으로 보존**(무후퇴 · **삭제하지 않음**)

**RP-001 준수**: 로드맵 확인 — `MASTER_REGISTRY:7`(5=Permission) + **5-1 §59 ㊾ 명시 위임**
(*"5-2 준비 완료 — 입력=Subject/Binding·Role Foundation·Scope Dimension 24·현행 DATA_SCOPES 9·Role 3계통 통합 과제"*).

---

## 결정

### D-1. 🔴 1-6의 COV-GAP-01을 이 블록에서 해소했다

**1-6 발견**: *"§53 요구 목록이 저장소 어디에도 없다. 스펙은 채팅에만 존재했고 컨텍스트는 소멸하므로
커버리지가 원리적으로 계산 불가능하다."*
**1-6 D-3 규칙**: *"`source_persisted = false`인 요구는 분모에 넣을 수 없다. 세션 컨텍스트는 저장소가 아니다."*

→ **스펙 수령 즉시 `REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md` 로 요구 목록을 영속**했다.

**결과 — 06-A 최초로 커버리지가 실제로 계산됐다:**
```
요구(분모) 57 · 산출(분자) 57 · 누락 0 · 커버리지 100%
측정 방법: for f in $REQ; do [ -f "$f.md" ]; done   (1-8 MeasurementMethod 준수)
```

> **1-7 D-10이 예언한 그대로다**: *"규칙을 문서로 남긴 블록은 인증 가능하고, 남기지 않은 블록은 불가능하다.
> 차이는 능력이 아니라 영속 여부다."*
> **선행 블록의 분모는 여전히 부재**이며 **MR-1-6-01로 인계된 상태**다.

### D-2. 🔴 이 도메인은 부재가 아니라 **존재·분산** — 신설이 아니라 통합

스펙 §3 전수 조사 결과 **요구 항목 상당수가 REAL**:
**IdP Group Mapping**(`sso_group_role_map` + `roleForGroups()` `EnterpriseAuth.php:70/72/78`) ·
**SCIM**(`sso_config.scim_enabled`/`scim_token_hash`/`auto_provision` :59 · `scimJson()` :35) ·
**Automatic Deprovisioning**(`EnterpriseAuth.php:400` `active===0 → DELETE FROM user_session`) ·
**Brand Registry**(`catalog_brand` `Catalog.php:151`·285차) · **Team**(`TeamPermissions.php:145/168`) ·
**Action 8 / Scope 9 / acl_permission**(:39/41/15) · **api_key Validity·Usage**(`expires_at`·`last_used_at`·`use_count`) ·
**External User 체계**(AgencyPortal **매 요청 approved fail-closed**·272차 · PartnerPortal · SupplyChain) ·
**Tenant Isolation**(agency 토큰 **서버바인딩 위조불가** `index.php:97-100` · **192차 `/api` 별칭 차단** :562-575).

**스펙 §5 단서와 일치** — *"공통 IAM Entity가 이미 있으면 Rebate 전용으로 복제하지 말고 확장하라."*

### D-3. 오탐 2건을 걸러냈다

| 히트 | 실체 |
|---|---|
| `workspace` | **`WorkspaceState` = `tenant_kv` KV 저장소**(279차) — **조직 Workspace Registry 아님** |
| `business_unit` | **Trustpilot API 자격증명 필드**(`ChannelSync.php:2573-2577`) — 조직 단위 아님 |

**1-6에서 grep REAL 히트 4건 중 3건이 오탐**이었다. **이름이 같다고 같은 것이 아니다.**

### D-4. 🔴 Scope Dimension = 계약 24 ∪ 현행 고유 4 = **28** (합집합)

`campaign`·`product`·`warehouse`·`own` 은 **스펙 24에 없는 현행 고유 축**이다.

> **스펙에 없다는 이유로 기존 축을 버리면 1-9 최우선 명령 위반**이다 —
> *"기존 정상 사용자 접근을 유지하면서 과도한 권한만 제거"*. **삭제 시 즉시 회귀**한다.

5-1 §51 **"통합(기존 9종 의미 변경 금지)"** 계승.

### D-5. Composite Role 기본값 = **INTERSECTION** (스펙 §13)

> **UNION 이 기본이면 Composite Role 이 조용히 권한을 확대한다.**
> **사용자는 "역할을 합쳤다"고 생각하지 "권한을 늘렸다"고 생각하지 않는다 — 그래서 위험하다.**

### D-6. Standard Role 결합 금지 3원칙 (스펙 §8 말미 구체화)

**Program Manager ⊅ Finance·Payout**(§0 질문 직답) · **Operator ≠ Approver 동일 Role**(넣으면
**Maker-Checker 전제가 설계 단계에서 파괴**) · **Access Admin + Finance 금지**(**권한 부여자가
스스로에게 지급 권한을 줄 수 있게 된다**).

**기반 REAL**: ACTIONS 8에 **approve·execute 가 이미 분리**(`TeamPermissions.php:39`).

### D-7. Role 3계통 통합은 `EquivalenceProof` 선행 (1-9 계승)

**증명 없는 통합 = 286차 rank 맵 붕괴 재현 — 가설이 아니라 실측 이력.**
**Golden 확보 → 동일 입력·동일 출력 증명 → 그 후 교체.** **4번째 Role Registry 신설 금지**(5-1 §51 결론 2).

### D-8. 🔴 1-8 교훈 2건을 회귀게이트에 적용했다

- **팬텀 보존 대상을 넣지 않았다** — 1-8 GOLDEN-GAP-01(5-1 회귀게이트가 **미배선 guard 를 보존 대상에 등재**해
  회귀 검증이 **공허하게 참**이 됨). **본 목록은 실행 경로가 확인된 것만** 담았다.
- **stale 수치를 옮겨 적지 않았다** — 1-8 GOLDEN-GAP-02(**"실측 351"이 실은 286차 코드 주석**).
  **본 문서는 requirePro 호출부에 수치를 적지 않고 측정 명령을 적었다**(1-8 D-7 `CorrectionPropagation`).

### D-9. Critical Gap 대응 = "Runtime Guard 차단(1차) + Access Review 등재(2차)" (5-7 계승)

**존재하지 않는 기능(Access Review)에 의존하지 않는다.**

### D-10. `VALIDATED_LEGACY` 에 `is_effective` 요구 (1-9 계승)

1-9 LEGACY-GAP-01: **"VALIDATED"가 거짓**이었다 — **파일 존재가 검증을 대체**했다.
→ 본 블록의 모든 `VALIDATED_LEGACY` 는 **`file:line` + 동작 경로 확인** 근거를 가지며,
**실 데이터·라이브 동작 미확인은 `UNVERIFIED` 표기**.

---

## 거부한 대안

| 대안 | 거부 사유 |
|---|---|
| 자율 설계본 유지 | **"스펙 수령 시 양보" 약속 위반** |
| 자율 설계본 삭제 | **무후퇴 위반** — 참고 이력 보존 |
| Rebate 전용 IAM 신설 | 3계통이 이미 존재 → **4번째 금지**(5-1 §51) |
| DATA_SCOPES 9를 스펙 24로 교체 | **campaign·product·warehouse·own 소실 = 즉시 회귀**(D-4) |
| Composite 기본 UNION | **조용한 권한 확대**(D-5) |
| Group Mapping 신설 | `sso_group_role_map` 이 **이미 정본** — removal behavior 만 추가 |
| Deprovisioning Job 신설 | `EnterpriseAuth.php:400` 이 **패턴 정본** — Trigger 확장 |
| O-1~O-4를 P0 확정 | **라이브 미검증** — FP 레지스트리(**PM 재증명 전 P0 단정 금지**) |
| 1-1의 Brand "부재" 기재를 즉시 수정 | **남의 블록 산출물 무단 수정**(1-8 D-10) → 인계 |
| 스펙 §65대로 "41항목 구축 완료" 보고 | **실 코드 0건** — **거짓 보고** |

---

## 결과

**§53 57편 + Canonical + ADR + 요구 분모 = 60편 · 코드변경 0 · 커버리지 57/57(100%).**

**Lint/Guard 계약**: Static Lint **20** · Runtime Guard **22** → **1-7 레지스트리 누계 37→57 · 44→66**.
**단 전부 `CONTRACT_ONLY`**(구현 0) — 1-7 판정 `NOT_READY` 불변.

**관찰 4건 전부 `UNVERIFIED` · 본 세션 수정 0.**

---

## 다음

**Part 4-5-3-1-5-3 — Rebate Approval Workflow, Multi-Level Approval & Risk-Based Decision Governance.**

입력 = 본 블록 Role·Scope 기반 + **`action_request` REAL**(재사용 강제·중복 승인엔진 금지) +
🔴 **1-6 G-01**(`Mapping.php:212` **1인 2회로 정족수 충족 = Maker-Checker 무효** · `UNVERIFIED` · **PM 재증명 선행 권고**).

> **결함이 있는 승인 엔진을 재사용하면 결함까지 재사용된다.** 재사용은 옳지만 **G-01 재증명이 선행**돼야 한다.
