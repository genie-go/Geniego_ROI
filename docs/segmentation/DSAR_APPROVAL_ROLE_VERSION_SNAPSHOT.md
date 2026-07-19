# DSAR — Role Version Snapshot (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Version Snapshot = **Role Definition의 특정 Version이 활성화되는 순간, 그 Version Payload 전체를 불변으로 보존**하는 substrate. Role Snapshot(별편 1)이 "임의 감사 시점의 캡처"라면, 본 편은 **"Version 활성화 이벤트에 결합된, 그 Version의 정본 페이로드"**다.

- **핵심 규율**: **현재 상태로 과거 Version을 재구성하지 않는다.** 각 Version은 활성화 시점의 페이로드를 스스로 보존하며, In-place Update로 과거 의미를 덮지 않는다.
- **순신규**: 전수조사 §3에서 **Version=ABSENT**(버전 컬럼/개념 없음). 유일 근접 `menu_defaults`류 라벨은 리터럴 고정이라 버전 아님(ADR §5.2 CONSOLIDATION 축과 별개). 레포에 Role Version 개념 자체가 부재.
- Version Snapshot은 Role Version 활성화 Audit Event(별편 5 `VERSION_CREATED`/`ACTIVATED`)와 1:1로 결합된다.

## ② Canonical 필드 (코드 0 · 구조 명세)

`ROLE_VERSION_SNAPSHOT` (전부 신규)

| # | 필드 | 의미 |
|---|---|---|
| 1 | role_version_snapshot_id | 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | role_definition_ref | 소속 Role Definition |
| 4 | version_number | Version 순번(단조 증가·불변) |
| 5 | version_status | Version 상태(③) |
| 6 | version_payload | 활성화 시점 Role Definition 전 필드 불변 사본(별편 1 필드 집합) |
| 7 | permission_mapping_snapshot_ref | 그 Version의 Permission 매핑 스냅샷(별편 3) |
| 8 | predecessor_version_ref | 직전 Version 참조(체인·In-place 금지) |
| 9 | change_summary | 이전 Version 대비 변경 요약(감사용·비파괴) |
| 10 | activated_at / superseded_at | 활성화·대체 시각(Business/System Time) |
| 11 | authored_by / approved_by | 작성·승인 Actor 참조(Authority≠Role) |
| 12 | version_digest | Version Payload 무결성 다이제스트(별편 6) |

## ③ 열거형 (설계 · 코드 0)

- **version_status**: `DRAFT` → `PENDING_REVIEW` → `APPROVED` → `ACTIVE` → `SUPERSEDED` → `DEPRECATED` → `RETIRED` → `ARCHIVED`
  - Lifecycle(별편 1 ③)과 정합. 한 Definition은 다수 Version을 갖고 **최대 1개만 ACTIVE**.
- **change_type**(Version 생성 사유·설계 예약): `INITIAL` · `PERMISSION_CHANGE` · `SCOPE_CHANGE` · `POLICY_CHANGE` · `RISK_CHANGE` · `OWNER_CHANGE` · `CORRECTION`

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Version 축 | 최근접 substrate | §5.2 태그 | file:line (2문서) | 판정 |
|---|---|---|---|---|
| version_payload(정의 필드) | `team_role`+`TeamPermissions` | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188`·`TeamPermissions.php:120-131` | PARTIAL(현재값만) |
| **version_number/status** | — | — | **ABSENT** | **ABSENT(버전 개념 부재)** |
| predecessor 체인 | — | — | **ABSENT** | **ABSENT** |
| activated_at/superseded_at | — | — | **ABSENT** | **ABSENT** |
| approved_by(승인 Actor) | — | — | **ABSENT**(Authority=Part 5) | **ABSENT** |
| version_digest | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★ADR §5.2: `admin_roles/user_roles`(`routes.php:1670`·`UserAdmin.php:596-599`)는 유일한 role-mgmt 시도였으나 DORMANT로 289차 폐기 → **Version 축을 여기로 재부활하지 않는다**. team_role/TeamPermissions 위에 신설.

## ⑤ 설계원칙

- **불변 Payload 보존**: Version 활성화 시 페이로드를 통째로 동결. **In-place Update 금지**(과거 Version 의미가 현재값으로 오염되면 감사 재현 불가).
- **현재로 과거 재구성 금지**: 과거 Version 조회는 저장된 payload에서만. 현재 Definition으로 역산 금지.
- **단조 Version·최대 1 ACTIVE**: Version 순번 단조 증가. 활성 Version 유일성은 Mandatory Control.
- **Role≠Authority**: `approved_by`는 승인 권한 축(Part 5)이며 Role Version 자체와 분리.
- **Golden Rule**: `version_digest`=선행 Canonical Cryptographic Hash Chain 봉인기 개념 재사용(중복 무결성 모델 신설 금지·별편 6).
- **forward-only**: 시행일 이후 생성 Version만 payload 보유. 과거 role 상태의 소급 Version 생성 불가.

## ⑥ Gap

- Version 엔티티·순번·status 전이·payload 동결·predecessor 체인 = **전량 ABSENT**.
- `activated_at`/`superseded_at` as-of 질의·최대 1 ACTIVE 제약 = **ABSENT**.
- Permission_mapping_snapshot의 Permission **Version** 결합 = **BLOCKED_PREREQUISITE**(선행 Part 2 Permission Engine 부재).
- 실 Version 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
