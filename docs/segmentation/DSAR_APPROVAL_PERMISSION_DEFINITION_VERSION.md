# DSAR — Permission Definition Version (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission Definition의 **불변·추적가능 변경 이력**. Definition은 In-place로 절대 수정하지 않고, 모든 변경은 새 Version row로 append. Resolution·Decision Binding·Snapshot이 특정 시점의 Permission 의미를 재현할 수 있도록 각 Version은 완전한 스냅샷과 불변 digest를 보유한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `version_number` | 단조 증가 버전 번호 |
| `previous_version` | 직전 Version 참조(체인) |
| `version_type` | 변경 유형(§3) |
| `definition_snapshot` | 해당 시점 Definition 전체 스냅샷(불변) |
| `scope_snapshot` | 결합 scope 스냅샷 |
| `effective_from` / `effective_to` | 유효 구간 |
| `created_by` / `reviewed_by` / `approved_by` | 변경 주체 3자 |
| `immutable_digest` | 스냅샷 불변 해시(체인 검증) |

## 3. 열거형 / 타입

**version_type**: `INITIAL` · `NAME_CHANGE` · `RESOURCE_CHANGE` · `ACTION_CHANGE` · `EFFECT_CHANGE` · `SCOPE_CHANGE` · `RISK_RECLASSIFICATION` · `SECURITY_HARDENING` · `DEPRECATION` · `MIGRATION` · … (확장 가능).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Definition 대상 | `acl_permission`(현재 상태만·덮어쓰기) | ABSENT(버전화 없음) | `TeamPermissions.php:325-336`(replacePerms) |
| 변경 기록(부분) | `auth_audit_log`(team_permissions_set 등 변경 이벤트) | Evidence PARTIAL | `TeamPermissions.php`(UserAuth::logAudit) |

★**정직**: Permission Definition의 **버전화는 순신규 ABSENT**. 현 `acl_permission`은 `replacePerms`가 기존 grant를 **In-place로 교체**(`:325-336`)해 시점 재현 불가. `version_number`/`previous_version`/`definition_snapshot`/`immutable_digest`/effective 구간·3자(created/reviewed/approved) = 전부 순신규. `auth_audit_log`는 변경 이벤트만 남기고 Definition 스냅샷·digest 체인은 없음(per-request authz 결정/거부도 미감사).

## 5. 설계 원칙 / 결정

- **In-place Update 절대 금지** — 모든 변경은 새 Version append(현 replacePerms 덮어쓰기 방식을 append-only로 대체 정형화).
- 각 Version은 자기완결적 스냅샷 보유(Resolution이 과거 Decision을 재현 가능).
- `immutable_digest`로 이전 Version 체인 검증(Part 1 Hash Chain·Snapshot substrate와 결합).
- Historical Version 스냅샷은 삭제 금지(Lifecycle RETIRED/ARCHIVED여도 이력 보존).
- Golden Rule: acl_permission 변경 경로를 버전 append로 확장(별도 버전 store 신설이 아닌 정형화).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 버전 엔티티 전체 = 순신규(현 In-place 교체).
- **BLOCKED_PREREQUISITE**: `immutable_digest` 체인·Decision Binding은 선행 Decision Core + Part 1 Snapshot/Evidence 실 저장체 신설 후 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
