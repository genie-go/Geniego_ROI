# DSAR — Approval Role Assignment Version (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_ASSIGNMENT_VERSION`(스펙 §2 Canonical Entity·§6 Assignment Version)은 "모든 Assignment 변경은 Version을 생성"(스펙 §6 원문)한다는 불변식을 담는 엔티티다. Part 3-3의 정직 판정에서 가장 날카로운 대조점이 바로 여기다 — ground-truth §7이 명시적으로 지목한 `TeamPermissions::replacePerms`/`replaceScope`(DELETE→INSERT)는 "권한 전체교체(version 소실)"의 **실증(evidence)**으로 등재되어 있다. 즉 현행 substrate는 Version 개념의 정반대(in-place 덮어쓰기로 이전 상태를 소실)를 실제로 수행 중이며, 이 문서는 그 자리에 Version 엔티티를 신설하는 설계를 정형화한다.

## 2. Canonical 필드

스펙 §6은 필드 목록을 별도 명시하지 않고 Version Type과 불변 규칙만 정의한다. 설계 제안 필드(스펙 §5 Assignment Definition의 Snapshot ID/Digest 필드를 Version 단위로 재적용): Version ID · Assignment ID(상위 참조) · Version Type · Version Number(순차) · Effective From · Created By · Approved By · Snapshot ID · Digest · Prior Version Reference(불변 체인).

## 3. 열거형 / 타입

스펙 §6 원문 — **Version Type**: Initial · Renewal · Scope Change · Role Version Change · Expiration Change · Approval Change · Restoration · Suspension · Revocation · Migration · Correction.

**불변 규칙(스펙 §6 원문)**: "과거 Version 수정 금지."

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

- **Version 개념 자체 = ABSENT**(ground-truth §6 부재 목록 "Version(변경이력 diff)"). 5개 실행 substrate 어디에도 변경 이력을 버전으로 관리하는 구조 없음.
- **★역-실증(anti-pattern evidence)**: `TeamPermissions::replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`·firsthand 확인)는 DELETE→INSERT로 **이전 상태를 물리적으로 소실**시킨다 — ground-truth §7 표에 "권한 전체교체(version 소실)" 항목으로 명시. 이는 Version Type "Correction"/"Scope Change"에 해당하는 작업을 수행하면서도 Version을 남기지 않는 현행 패턴의 직접 증거다.
- **`app_user.team_role` UPDATE**(`UserAuth.php:1334,1392`)도 동일 패턴 — 새 값으로 덮어쓸 뿐 이전 값에 대한 Version 레코드 없음.
- **api_key rotate**(`Keys.php:150-187`)는 개념적으로 "Migration" Version Type에 가장 근접하나(키 교체), 실제로는 신규 키 생성+구키 폐기이지 정형 Version 엔티티가 아님.
- **감사 로그 근접**: `auth_audit_log`(`UserAuth.php:4165,4174-4197`)가 변경 사실 자체는 append 방식으로 남기나(ground-truth §7 "변경 이력(mutable)" 근접 substrate), Version 엔티티가 요구하는 구조화된 diff·Version Type 분류·불변 체인이 아니라 mutable한 detail 문자열일 뿐이며 SecurityAudit의 해시체인(`SecurityAudit.php:56-68`)과도 무관.

## 5. 설계 원칙

- Version은 Assignment Definition에 종속되는 append-only 엔티티로, 과거 Version은 어떤 경로로도 수정되지 않는다(스펙 §6 불변 규칙).
- 현행 `replacePerms`/`replaceScope`류 in-place 교체 패턴은 Version 도입 후에도 **하위 실행 substrate로서 보존**하되(Golden Rule — 대체 아닌 확장), Version 계층이 그 위에서 변경 전/후 상태를 diff로 기록한다.
- Version Type 11종(Initial~Correction)은 5분산 write 각각이 수행하는 작업(초기 부여/역할변경/정지/삭제/키회전 등)에 매핑되어야 하며, 매핑되지 않는 임의 write는 허용하지 않는다(Runtime Guard·Static Lint와 연동 — 별도 DSAR).
- SecurityAudit tamper-evident 체인(`SecurityAudit.php:56-68`)으로 Version Digest를 승격하는 것을 목표로 하되(ADR D-1 "auth_audit_log → PARTIAL(승격)"), 이번 차수는 승격 대상 지정만(코드 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Role Version Change Version Type은 Part 3-1 Role Registry의 실제 Role Version 구현이 선행되어야 함.
- **Gap**: 현재 `replacePerms`/`replaceScope`가 이전 상태를 소실시키는 구조적 문제(version 부재의 실증)를 Version 엔티티 도입 없이는 해결할 수 없음 — 이는 신규 스키마·트랜잭션 재설계가 필요한 실질적 Gap.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002).
