# DSAR — Approval Scope Evidence (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Evidence · 스펙 §36)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scope Registry/Version(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변 · Cache는 Version 기반 · Default Intersection(Scope 자동확대 금지·ADR D-2) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §36 Scope Evidence = **Resolution(§10) · Policy(§9) · Mapping(data_scope 7곳 산재) · Snapshot(§35)** 각 단계의 근거를 tamper-evident하게 남기는 엔티티. 승인→검토→발급의 evidence chain을 형성한다.

- **순신규**: 전용 evidence chain grep 0. 근접=`auth_audit_log`(범용 감사로그·`teamAudit`) — 그러나 scope 전용이 아니고 "menus=N개" 카운트만 남기며 diff는 미기록(EXISTING_IMPLEMENTATION §9). ADR §3은 이를 "SecurityAudit tamper-evident 체인 승격" 대상으로 지정.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence id | Evidence PK |
| 2 | scope id | 대상 Scope |
| 3 | evidence type | 아래 §3 열거형 |
| 4 | subject | 누가 |
| 5 | action | 무엇을 |
| 6 | before state / after state | 변경 전/후 상태 |
| 7 | digest | 다이제스트(§37 참조) |
| 8 | recorded at | 기록 시각 |
| 9 | tamper evident hash | 승격 목표(SecurityAudit 체인) |
| 10 | status | Evidence 상태 |

## 3. 열거형 / 타입

**Evidence Type**(스펙 §36 원문): `RESOLUTION` · `POLICY` · `MAPPING` · `SNAPSHOT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Evidence Type | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| RESOLUTION(근접) | effectiveScope 산출(§10 Resolution) | `TeamPermissions.php:236-265` | 근접(resolution 로직 자체는 실재)이나 산출 결과의 근거를 별도로 남기지 않음(로그 없이 즉시 반환) |
| POLICY(근접) | HIGH_VALUE_KRW 임계치·evaluatePolicy 판정·requiresHighValueApproval 서버측 강제 | `Catalog.php:1036,1104-1169,395,597,860` | 근접(policy 판정 자체는 실재하고 289차 클라 우회 봉인)이나 판정 근거를 evidence로 남기는 전용 체계 없음(실행 로그만) |
| MAPPING(근접) | data_scope 7곳 산재(scope 개념 매핑 지점) | `TeamPermissions.php:41,160-166`(DUPLICATE_AUDIT §D-1 목록 전체) | 근접(매핑 대상 substrate는 실재)이나 매핑 근거를 기록하는 evidence 계층 없음 |
| SNAPSHOT | — | — | **ABSENT** — 원재료인 Snapshot 자체 순신규(§35 DSAR 파일 참조) |
| 범용 근접(전체) | `auth_audit_log`(`teamAudit` — 메뉴 변경 카운트만·diff 미기록) | `TeamPermissions.php:684-700` | 근접(감사 기록 자체는 실재)이나 scope 전용이 아니고 tamper-evident 미검증(SecurityAudit 체인 미적용 — ADR §3 승격 대상) |

## 5. 설계 원칙

- Evidence는 4종 모두 §35 Snapshot·§37 Digest와 연쇄한다 — Snapshot이 먼저 신설되어야 Evidence가 "무엇의 근거인지" 가리킬 대상이 생긴다.
- 기존 `auth_audit_log`(`teamAudit`)는 Evidence의 근접 substrate이나, ADR §3 규율에 따라 "SecurityAudit tamper-evident 체인으로 승격" 대상이지 그대로 재사용 대상이 아니다 — 현재 mutable·diff 미기록 상태로는 Evidence 요건(근거 보존) 미충족.
- MAPPING evidence는 DUPLICATE_AUDIT §D-1의 7곳 산재 자체를 근거로 삼되, 산재를 Canonical Scope Registry로 통합하는 과정에서 "어느 산재 지점에서 어떤 값이 왔는지"를 evidence로 남겨야 이행 검증이 가능하다.

## 6. Gap / BLOCKED_PREREQUISITE

- SNAPSHOT evidence = §35 선행 신설 필수.
- RESOLUTION/POLICY/MAPPING evidence = 근접 substrate 존재하나 전용 근거 기록 계층 ABSENT.
- tamper-evident 승격(SecurityAudit) = ADR §3 결정사항이나 이번 차수 코드 0.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Scope Registry 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
