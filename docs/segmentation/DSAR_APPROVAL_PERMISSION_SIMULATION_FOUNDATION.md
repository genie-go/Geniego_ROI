# DSAR — Permission Simulation Foundation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — Effective Set 영속체·Version substrate 부재)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

Permission/Grant/Deny/Scope/Group/Bundle 변경을 **실제로 적용하기 전에 가상 평가(what-if)**하여, 그 변경이 Effective Set·Scope·충돌·리스크·영향 주체/리소스에 미치는 영향을 사전 산출한다. ★**시뮬레이션은 실제 Grant/Deny/Cache/Decision을 절대 변경하지 않는다**(read-only what-if). 권한 확장·SoD 위반·과도 부여를 배포 전 발견하기 위한 안전 도구.

**순신규 근거**: 현재 effectiveForUser(`:366`)는 현재 상태만 계산하며 가상 변경 오버레이·전후 diff 기능 부재.

## ② Canonical 필드 (Simulation Run)

| 필드 | 설명 |
|---|---|
| `simulation_id` | 시뮬레이션 실행 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `simulation_type` | 아래 ③ 열거형(다중 변경 배치 가능) |
| `proposed_change` | 가상 변경 명세(적용 안 됨) |
| `subject_selector` | 영향 평가 대상 주체 셀렉터 |
| `current_effective_set` | 변경 전 Effective Allow/Deny Set |
| `simulated_effective_set` | 변경 후 가상 Effective Allow/Deny Set |
| `added` / `removed` | 추가·제거된 Permission |
| `scope_expansion` / `scope_reduction` | Scope 확장·축소 delta |
| `new_conflicts` / `resolved_conflicts` | 신규·해소 충돌 |
| `risk_diff` | 리스크 점수 전후 차 |
| `affected_subjects` / `affected_resources` | 영향 주체·리소스 목록 |
| `manual_review_required` | 수동검토 필요 여부(bool) |
| `simulated_at` | 실행 시각 |

## ③ 열거형 — Simulation Type

- `ADD_PERMISSION` / `REMOVE_PERMISSION`
- `ADD_GRANT` / `REVOKE_GRANT`
- `ADD_DENY` / `REMOVE_DENY`
- `CHANGE_SCOPE` / `EXPAND_SCOPE` / `REDUCE_SCOPE`
- `CHANGE_GROUP` / `CHANGE_BUNDLE` / `CHANGE_HIERARCHY`
- `CHANGE_DEPENDENCY` / `CHANGE_EXCLUSION`
- `CHANGE_RESOURCE` / `CHANGE_ACTION` / `CHANGE_CLIENT` / `CHANGE_ACTOR_TYPE`

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Simulation Type/필드 | substrate | §92 태그 | 근거 |
|---|---|---|---|
| `current_effective_set` 계산 | effectiveForUser | EXISTS(계산·미영속) | `:366` |
| `ADD_GRANT`/`REVOKE_GRANT` 대상 | acl_permission replacePerms·putMemberPermissions | Grant EXISTS·위임상한 | `:325`·`:628-647` |
| `EXPAND/REDUCE_SCOPE` | data_scope effectiveScope | ROW/DATA_SCOPE_CANDIDATE | `:236-265` |
| `ADD_DENY`/`REMOVE_DENY` | `1=0` 센티넬 | Deny PARTIAL | `:290,303` |
| `CHANGE_ACTOR_TYPE` | acl_permission subject_type(user/team/member) | subject 축 | `:152-171` |
| `CHANGE_ACTION` | ACTIONS 8종(view/create/update/delete/approve/export/execute/manage) | vocabulary 근접 | `:39` |
| 위임상한 위반 시뮬 | assignableMap·clampActions | fail-closed | `:354-360`·`:396-402` |
| `simulated_effective_set` 오버레이 | — | **ABSENT** (가상 변경 오버레이 엔진 부재) | 순신규 |
| `CHANGE_GROUP/BUNDLE/HIERARCHY/DEPENDENCY/EXCLUSION` | — | **ABSENT** (Group/Bundle/Hierarchy/관계 부재) | ABSENT |
| `CHANGE_RESOURCE`/`CHANGE_CLIENT` | api_key(client)만 부분 | client=CANONICAL·resource=ABSENT | `Keys.php:191,204` |
| `new_conflicts`/`risk_diff` | — | **ABSENT** (Conflict/Risk 모델 부재) | ABSENT |

## ⑤ 설계 원칙

- **Zero side-effect (절대)**: 시뮬레이션은 Grant/Deny/Cache/Decision/Audit(집행)에 어떤 쓰기도 하지 않음. 결과는 별도 Simulation Run 레코드로만 기록.
- **Expansion 경고 우선**: `scope_expansion`·`added`·`EXPAND_SCOPE`·`new_conflicts`가 있으면 `manual_review_required=true`(권한 확장 자동 승인 금지·§6 Scope Intersection).
- **위임상한 반영**: 가상 부여가 부여자 자신의 상한(assignableMap)을 넘으면 시뮬 단계에서 DELEGATION_EXCEEDED 예측 표기.
- **Fail-closed 기본**: 미해석 축은 Deny로 가정하여 과대 Allow 예측 방지.
- **Permission ≠ Role ≠ Authority**: 시뮬은 Permission Effective Set만. Role 부여 영향은 Part 3, Authority(금액/한도) 영향은 Part 5 시뮬로 분리.
- **Tenant 격리**: 영향 평가는 `tenant_id` 파티션 내 주체만.

## ⑥ Gap

- 가상 변경 오버레이 엔진·전후 diff·Conflict/Risk 모델 순신규 — effectiveForUser에 what-if 계층 부재(BLOCKED_PREREQUISITE).
- Group/Bundle/Hierarchy/Dependency/Exclusion/Resource 시뮬 타입은 해당 substrate ABSENT라 성립 불가.
- Effective Set 영속·Version이 선행되어야 정확한 전후 비교 가능.
- 실 구현 = 선행 신설 후 별도 승인세션(RP-002).
