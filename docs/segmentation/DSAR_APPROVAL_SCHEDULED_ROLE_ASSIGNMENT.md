# DSAR — Scheduled Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §1.13)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: Delegated Assignment ≤ 원 Assignment Scope · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12·§14) · 과거 Version 수정 금지(ADR §D-2)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지.

---

## 1. 목적

Scheduled Role Assignment = 미래 시점에 **Activate**되도록 예약된 Assignment 유형(스펙 §1 항목 13 "Scheduled Assignment"·§3 "지원 Assignment 유형"에 `Scheduled` 명시·§7 Lifecycle에 `Scheduled` 상태 명시). Temporary Assignment(§11)가 "만료 시 제거"에 초점인 반면, Scheduled Assignment는 "미래 특정 시점에 발효"에 초점 — 별개 축이다. 스펙 원문에는 §1 항목명 외 전용 섹션이 없어(§11 Temporary, §12 Emergency, §13 Break Glass, §14 Delegated만 전용 섹션 보유) 필드는 §5 Assignment Definition(Effective From)·§7 Lifecycle(`Scheduled` 상태)·§21 Expiration(`Scheduled Expiration`)에서 파생한다.

- **순신규**: 미래 예약 발효 개념 자체가 부재(ADR §D-5 "Temporary/Scheduled: 만료/예약 role 부재(순신규)").

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Scheduled 하위유형 · 스펙 §5·§7·§21에서 파생)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | subject id / subject type | 대상 Subject |
| 3 | effective from | 예약 발효 시점(스펙 §5) |
| 4 | effective to | 예약 종료 시점(스펙 §5·필요 시 §21 Scheduled Expiration과 결합) |
| 5 | assignment lifecycle | `Requested`→`Approved`→**`Scheduled`**→`Active`(스펙 §7) |
| 6 | assignment status | Scheduled 상태 대기 중 표시 |
| 7 | activation trigger | 발효 시점 도래 시 상태 전이 트리거 |
| 8 | assignment version | 변경 이력(스펙 §6) |

## 3. 열거형 / 타입

Assignment Lifecycle(스펙 §7) 12상태 중 `Scheduled`가 `Approved`와 `Active` 사이에 위치. Expiration 유형(스펙 §21) 중 `Scheduled Expiration`(예약 종료)이 대응 종료축.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Scheduled 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Scheduled Activation(미래 발효) | — | ABSENT | 5개 실행 substrate(team_role 3핸들러·api_key·wms·pm) 전부 **즉시 반영**(ADR §D-2 "caller 권한검증 통과 즉시 단일 트랜잭션 UPDATE") — 미래 시점 지연 발효 경로 grep 0 |
| 즉시발효 대조 substrate(부정 증거) | createTeamMember/updateTeamMember 즉시 UPDATE | `UserAuth.php:1334,1392` | 동기 실행만 실재 — Scheduled 상태로 대기하는 중간 단계 없음 |
| 즉시발효 대조 substrate(부정 증거) | provisionUser 즉시 INSERT/UPDATE | `EnterpriseAuth.php:483-511` | SSO/SCIM 프로비저닝도 IdP 이벤트 수신 즉시 반영·예약 큐 없음 |
| Scheduled Lifecycle 상태 자체 | — | ABSENT | Assignment Lifecycle 상태머신(스펙 §7) 전체가 순신규(ADR §D-2) — `Scheduled` 상태를 담을 그릇 자체 부재 |
| Scheduled Expiration(예약 종료) | api_key expires_at(고정 시점) | `Keys.php:119,170` | 근접이나 "고정 만료 시점"일 뿐 "예약 발효"가 아니며, 자동 워커 부재로 게이트-체크 시점에만 실효(`index.php:518-520`) |

## 5. 설계 원칙

- **Scheduled ≠ Temporary**: 발효 시점 예약(Scheduled)과 만료 시점 자동제거(Temporary)는 스펙상 별개 값(§3 "Temporary · … · Scheduled" 병렬 나열)이며 동일 필드로 병합 설계 금지.
- **Lifecycle 상태 전이는 워커 기반**: `Scheduled` → `Active` 전이는 시간 경과만으로 자동 발생해야 하며(Temporary의 자동 제거 워커와 대칭), 요청 시점 지연 평가(api_key expires_at 패턴)만으로는 불충분 — 발효 전에는 어떤 인가 게이트도 해당 Assignment를 유효로 취급해서는 안 됨(fail-closed).
- **즉시반영 5경로를 Scheduled 우회로 오용 금지**: 현행 5개 실행 substrate는 전부 즉시쓰기이므로, Canonical Assignment Registry 도입 전까지 "예약 발효"를 클라이언트단 지연 호출로 흉내내는 편법 설계 금지(ADR §D-1 통합 원칙 위반).

## 6. Gap / BLOCKED_PREREQUISITE

- Scheduled Activation 트리거/워커 = **전 구간 ABSENT**.
- Assignment Lifecycle 상태머신(스펙 §7) 자체 = **BLOCKED_PREREQUISITE**(ADR §D-2 코드 0) — `Scheduled` 상태 정의 대상 부재.
- Scheduled Expiration을 포함한 Expiration 통합 체계(스펙 §21) = Temporary Assignment 편(RP-002 동일 트랙)과 공동 설계 필요.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
