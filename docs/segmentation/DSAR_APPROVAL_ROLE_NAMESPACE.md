# DSAR — Approval Role Namespace (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Namespace)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 폐기 admin_roles 재부활 금지 · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Namespace는 **Role Canonical Code의 구조·예약어·금지어를 규정하는 명명 계약**이다. 현재 5개 Role 어휘는 flat 문자열(`owner`/`manager`/`member`, `viewer`~`admin`, `master`/`sub`, `admin`/`super_admin`/`moderator`)로 서로 다른 값공간에 흩어져 있고 통합 namespace가 없어 **값 'admin'이 3개 체계에 서로 다른 의미로 중복**된다. 본 엔티티는 Role Code를 `{DOMAIN}:{FUNCTION}:{ROLE}` 3분절 구조로 정형화하여 도메인·기능·역할을 분리하고, 모호·특권 단어의 단독 사용을 금지한다. 예: `APPROVAL:DECISION:APPROVER`. **실 판정 문자열을 즉시 바꾸지 않고**(회귀 0) Canonical Code ↔ legacy 문자열 매핑을 위한 명명 표준만 세운다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `namespace_id` | Namespace 식별자(PK) |
| `namespace_code` | Namespace 정본 코드 |
| `code_format` | Role Code 포맷 규칙(`{DOMAIN}:{FUNCTION}:{ROLE}`) |
| `prefix` | 도메인/기능 prefix 규약 |
| `separator` | 분절 구분자(`:`) |
| `reserved_words` | 예약어 집합(시스템 전용) |
| `prohibited_words` | 단독 사용 금지어(§3) |
| `case_convention` | 대소문자 규약(예 UPPER_SNAKE) |
| `domain_component` / `function_component` / `role_component` | 3분절 정의 |
| `alias_allowed` | Alias 허용 여부(단 Runtime authz에는 미사용) |
| `tenant_id` | 테넌트 격리 키 |
| `owner` | Namespace 소유자 |
| `active_version` | 현재 유효 Namespace Version |
| `digest` | 정의 불변 digest |

## 3. 열거형 / 타입

- **`code_format`**: `{DOMAIN}:{FUNCTION}:{ROLE}` (3분절 필수·`separator`=`:`).
  - 예: `APPROVAL:DECISION:APPROVER` · `PAYMENT:SETTLEMENT:REVIEWER` · `SECURITY:AUDIT:AUDITOR`.
- **`prohibited_words`(단독 사용 금지 — 모호/특권 단어)**: `ADMIN` · `SUPER_ADMIN` · `ROOT` · `ALL` · `FULL_ACCESS` · `GOD` · `MASTER` · `DEFAULT` · `USER` · `MANAGER`.
  - 이 단어는 `{ROLE}` 분절에 **단독으로 올 수 없다**(도메인·기능 없이 전역 특권을 암시하기 때문). 반드시 도메인/기능으로 한정(예 `USER_ADMINISTRATION:ACCOUNT:ADMINISTRATOR`).
- **`reserved_words`**: 시스템 전용 prefix(예 `SYSTEM`·`SERVICE`·`PLATFORM`)는 고객 Custom Role에서 사용 금지.
- **`alias_allowed`**: legacy 문자열(owner/analyst/master 등)은 Alias로만 매핑, **Runtime 인가 판정에는 Canonical Code 사용**(Alias 직접 authz 금지).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Namespace(통합) | **ABSENT → 신설** | 통합 namespace 없음·flat 문자열 |
| team_role 어휘 | flat 문자열(정형화 대상) | `TeamPermissions::roleOf`(`TeamPermissions.php:120-131`) — owner/manager/member |
| api_key role 어휘 | flat 문자열(별개 값공간) | `Keys.php:95`(validRoles) — viewer/connector/analyst/admin |
| admin_level 어휘 | flat 문자열 | `UserAdmin.php:43-46` — master/sub |
| AdminMenu ROLE_ENUM | flat 문자열(반쯤 死) | `AdminMenu.php:247` — admin/super_admin/moderator |
| plan god flag 'admin' | ANTI_PATTERN(§6.5) | `TeamPermissions.php:132`·`AuthContext.jsx:720` |
| `namespace_code` / `code_format` / `prohibited_words` / `separator` | **ABSENT** | 없음 |

★**5개 어휘 값충돌(정직 Gap)**: 값 `admin`이 api_key role(rank 3)·AdminMenu ROLE_ENUM·plan god flag의 **3체계에 중복**되며 서로 다른 값공간/정규화/저장소를 가진다. 통합 Role Namespace가 없어 문자열만으로는 어느 체계 admin인지 판별 불가.

## 5. 설계 원칙

1. **3분절 강제** — `{DOMAIN}:{FUNCTION}:{ROLE}`로 도메인·기능·역할 분리(전역 특권 암시 방지).
2. **모호 단어 단독 금지** — ADMIN/SUPER_ADMIN/ROOT/ALL/FULL_ACCESS/GOD/MASTER/DEFAULT/USER/MANAGER는 단독 `{ROLE}` 불가·자동 활성 금지(§6.5 Least Privilege).
3. **Alias는 매핑 전용** — legacy 문자열은 Canonical Code의 Alias로 보존하되 Runtime authz는 Canonical Code로만.
4. **값충돌 해소는 매핑으로** — 3체계 'admin'을 서로 다른 Canonical Code로 분리(예 `API_CLIENT` 축 vs `USER_ADMINISTRATION` 축)하되 실 판정 코드는 유지(회귀 0).
5. **Tenant Isolation** — Custom Role Code는 테넌트 스코프·시스템 예약 prefix 침범 금지.
6. **Versioned** — namespace 규약 변경은 순신규 Version.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Namespace로 정규화한 Role Code를 실 Permission에 결합하려면 선행 Part 2 Permission Engine 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: namespace_code·code_format·prohibited_words·separator·alias 계약 전무 — 순신설.
- **Gap-2(★값충돌)**: 값 'admin' 3체계 중복(api_key·AdminMenu enum·plan god flag) — 통합 namespace 부재 정직 Gap. Canonical Code 매핑으로 분리 필요(후속).
- **Gap-3**: legacy flat 문자열(owner/analyst/master)은 도메인·기능 분절이 없어 Alias 매핑 시 도메인 판단 필요.
- **정직 부재**: Job Title/Position 기반 명명 개념 전무(ABSENT). admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
