# DSAR — Approval Role Assignment Renewal (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Renewal · 스펙 §22)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §22 Assignment Renewal은 만료 예정/만료된 Assignment를 Manual·Auto·Approval Required·Review Required 방식으로 연장하고, Renewal도 반드시 새 Version을 생성하는 능력이다. **ABSENT 판정**: Assignment 자체에 만료 개념이 대부분 없으므로(§21 Expiration 참조) "연장"할 대상 자체가 대부분 존재하지 않는다. Renewal workflow(승인/검토 요구)는 승인 workflow 전수 부재(GROUND_TRUTH §3 "승인 workflow 부재(전수 grep 0)")와 동일 근거로 부재.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_RENEWAL`(전부 신규 · 스펙 §22 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | renewal id | 식별자 |
| 2 | assignment id | 대상 Assignment |
| 3 | renewal type | 아래 §3 |
| 4 | requested by | 요청자 |
| 5 | approval required flag | 승인 필요 여부(§9 결합) |
| 6 | review required flag | 검토 필요 여부 |
| 7 | new effective to | 연장된 만료일 |
| 8 | version reference | Renewal로 생성된 Version(Version Type=Renewal) |

## 3. 열거형 / 타입

**Renewal Type**(스펙 §22 원문): `MANUAL · AUTO · APPROVAL_REQUIRED · REVIEW_REQUIRED`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Renewal Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| MANUAL | **ABSENT** | Assignment "연장" 개념 자체 부재. 근접 후보로 api_key `rotate`(`Keys.php:150-187`·`UserAuth.php:4340-4399`)가 있으나, rotate는 **비밀키 재발급**(secret material 교체)이지 role/expires_at 유효기간 연장이 아니며, 두 목적을 혼동하지 않는다 |
| AUTO | **ABSENT** | 자동 갱신 로직·워커 부재(bin 스크립트 전수 0) |
| APPROVAL_REQUIRED | **ABSENT** | 승인 workflow 전수 grep 0(`pending_approval`/`approveQueue` 매치는 전부 캠페인/가격 도메인·role 무관, GROUND_TRUTH §3) |
| REVIEW_REQUIRED | **ABSENT** | 검토(Review) 단계 개념 부재 |
| Version 생성(Renewal도 Version 생성) | **ABSENT(전제 자체 부재)** | Assignment Version 자체 부재(§6 참조). `replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`)는 DELETE→INSERT로 이전 상태를 보존하지 않아 "Version 생성"과 정반대 패턴 |

## 5. 설계 원칙

- api_key `rotate`(`Keys.php:150-187`·`UserAuth.php:4340-4399`)를 Renewal의 참조 패턴으로 오흡수하지 않는다 — rotate는 시크릿 재발급이며, Assignment 유효기간 연장과 목적이 다르다(rotate 후에도 role 값·기존 expires_at 정책은 별개로 유지됨).
- Renewal이 유의미하려면 **선행적으로 Expiration(§21)이 실 신설**돼 있어야 한다 — 만료 개념이 없는 자원(team_role/wms/pm)에 Renewal을 먼저 설계하면 대상 없는 빈 워크플로가 된다.
- APPROVAL_REQUIRED/REVIEW_REQUIRED는 §9 Assignment Approval의 재사용이며, Renewal 전용 승인 로직을 별도로 신설하지 않는다(단일 Approval 엔진 원칙).

## 6. Gap / BLOCKED_PREREQUISITE

- 4개 Renewal Type **전부 ABSENT(순신규)**. 근접 substrate로 오인 가능한 api_key rotate는 목적이 달라 대체물이 아님을 명시.
- Renewal의 전제인 Assignment Expiration(§21)·Assignment Version(§6)이 먼저 **BLOCKED_PREREQUISITE**로 판정된 상태 — Renewal은 이 두 축이 실구현된 이후에만 설계·구현 순서상 의미를 가진다.
- 실 엔진 = 선행 Assignment Registry/Version/Expiration(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
