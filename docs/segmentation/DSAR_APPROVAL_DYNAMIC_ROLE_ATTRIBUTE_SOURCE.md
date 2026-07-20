# DSAR — Approval Dynamic Role Attribute Source (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Attribute Source)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Attribute Source는 스펙 §4가 정의하는, Rule Engine·ABAC·Conditional Role 평가의 **결정 입력값 카탈로그**다(User Attribute부터 Cost Center까지). ADR D-1·ground-truth §4는 이 중 **MFA/session/risk/environment 필드는 컬럼·로직이 실재하나 어느 것도 "role 활성 입력"으로 연결되어 있지 않다**고 확정한다 — 각각 로그인 챌린지·표시·감사·배포라벨 등 **개별목적**으로만 소비된다. Employment Status/Position/Department는 컬럼 자체가 부재(grep 0)다. 본 엔티티는 스펙 21개 속성 전체를 실 substrate 유무로 정직 분류한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `attribute_source_id` | Attribute Source 식별자(PK) |
| `attribute_name` | §4 열거값(21종) |
| `column_exists` | 대응 컬럼/필드 실재 여부 |
| `role_input_wired` | role 활성화 결정 입력으로 연결 여부(현행 전부 `false`) |
| `consumption_purpose` | 현행 소비 목적(로깅/표시/게이트/감사 등, role 결정 아님) |

## 3. 열거형 / 타입

- **`attribute_name`**(스펙 §4 verbatim, 21종): `User Attribute` · `Organization Attribute` · `Position` · `Department` · `Employment Status` · `Tenant` · `Region` · `Country` · `Language` · `Device` · `Network` · `Authentication Level` · `MFA 여부` · `Session Age` · `Login Time` · `Risk Score` · `Client Type` · `Environment` · `Business Calendar` · `Project` · `Cost Center`.
- **`role_input_wired`**: `TRUE`(role 결정에 연결) · `FALSE`(연결 없음 — 현행 전 항목이 `FALSE`).

## 4. 실 substrate 매핑 (PRESENT_UNWIRED/ABSENT·ground-truth만 인용)

| 속성(스펙 §4) | 판정 | 실 substrate (file:line) | role 활성 입력? |
|---|---|---|---|
| MFA 여부 | **PRESENT_UNWIRED** | `mfa_enabled/mfa_secret/mfa_method`(`UserAuth.php:3525`·`:946,960`) | ✗ 로그인 챌린지 게이트만(ground-truth §8) |
| Session Age | **PRESENT_UNWIRED** | `user_session.created_at/last_seen`(`Db.php:1111-1119`·`UserAuth.php:4237`) | ✗ `/auth/sessions` 표시만(`:4254-4281`) |
| Login Time | **PRESENT_UNWIRED** | `auth_audit_log.at`(`UserAuth.php:4165`) | ✗ 감사 타임스탬프 |
| Risk Score | **PRESENT_UNWIRED(정적 라벨)** | `auth_audit_log.risk VARCHAR(16)`(`:4165`) — 호출부 하드코딩 low/medium/high(`:4174,4203`·실사용 `:970,983`) | ✗ 계산값 아님 |
| Environment | **PRESENT_UNWIRED** | `Db::envLabel()`(`Db.php:56-61`) | ✗ 배포라벨·OTP 개발모드 게이트만(`UserAuth.php:966`) |
| Employment Status / Position / Department | **ABSENT** | 컬럼/필드 grep 0(EXISTING_IMPLEMENTATION §4 표) | N/A |
| Device / Network | **ABSENT(컬럼 없음)** | `user_session.ip/ua`만 표시용(표시 컬럼이지 Device/Network 분류 속성 아님) | ✗ |
| User Attribute / Organization Attribute / Tenant / Region / Country / Language / Authentication Level / Client Type / Business Calendar / Project / Cost Center | **미인용(ground-truth §4 표 범위 밖) → ABSENT 처리** | 이번 Part 3-5 ground-truth 2문서에 개별 substrate 인용 없음 — 반날조 원칙상 인용 없이 존재 주장 금지, 부재로 등재 | ✗ |

★ground-truth §4 총평: "MFA·session·risk·env는 실재하나 전부 로깅·표시·챌린지 게이트 등 개별목적·'role 활성 입력'으로 조합되는 지점 없음. Employment/Position/Department=아예 부재." 21종 중 **PRESENT_UNWIRED=5종**(MFA/Session Age/Login Time/Risk Score/Environment), **ABSENT(컬럼 없음)=3종**(Employment/Position/Department), **ABSENT(컬럼 근사만, 분류속성 아님)=2종**(Device/Network), **미인용(ground-truth 범위 밖)=11종**.

## 5. 설계 원칙

1. **PRESENT_UNWIRED 5종을 결정 입력으로 배선(확장, 재구현 아님)** — 기존 컬럼(`mfa_enabled`, `user_session.created_at/last_seen`, `auth_audit_log.at/risk`, `Db::envLabel()`)을 그대로 읽어 Attribute Source Adapter가 값을 공급. 컬럼 재정의 금지.
2. **Risk Score는 "정적 라벨→계산형" 승격을 별개 과제로 분리** — Runtime Risk Evaluation(별도 스펙 §20/§28)에서 다룬다. 본 엔티티는 현행이 정적 라벨임을 등재할 뿐 계산 로직을 설계하지 않는다.
3. **Employment/Position/Department는 순신규 컬럼 추가가 선행** — 현재 조직 데이터 모델에 부재. Attribute Source로 편입하려면 먼저 스키마 신설(별도 승인 필요, RP-002 범위 밖 추가 전제).
4. **미인용 11종은 "부재"로만 등재, "구현 예정 없음"과 혼동 금지** — 이번 ground-truth 조사 범위 밖이라 인용이 없을 뿐, 추후 전수조사에서 발견될 수 있음(정직 불확실성 표기).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Attribute Source가 Rule Engine·ABAC 결정 입력으로 실제 배선되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped 실 구현 이후. 본 차수 코드 0.
- **Gap-1(배선 부재)**: PRESENT_UNWIRED 5종 전부 role 결정 미연결 — Attribute Source Adapter 신설이 최우선 배선 작업(향후 세션).
- **Gap-2(컬럼 부재)**: Employment Status/Position/Department 3종은 스키마 신설 필요 — 순신규.
- **Gap-3(조사 범위)**: 11종은 이번 ground-truth 문서에서 개별 조사되지 않음 — 후속 세션에서 재확인 필요(현재는 ABSENT로 정직 등재, 재의심/재플래그 아닌 최초 등재).
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
