# DSAR — Approval Dynamic Role Rule Version (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Rule Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만 · 없으면 ABSENT)

## 1. 목적

`APPROVAL_DYNAMIC_ROLE_RULE`(스펙 §2 Canonical Entity)의 버전 축인 Rule Version(스펙 §8)은 "Rule Engine이 평가하는 규칙 자체가 Immutable Version으로 관리되어야 한다"는 불변식을 담는 엔티티다. ground-truth §2가 명시하듯 RBAC용 Rule Engine 자체가 **ABSENT**(`RuleEngine.php`는 마케팅/재고 자동화이며 role/permission 문자열이 평가부 `evaluateTenant`(`:194-220`)에 전무·KEEP_SEPARATE)이므로, Rule Version은 "버전화할 대상 Rule 자체가 아직 없는" 이중 공백 상태에서 설계된다. 정적 role 체계(team_role/admin_level/api_key.role)도 변경 시 Version을 남기지 않는다 — Rule Version 설계는 이 공백을 동시에 메우는 목표를 갖는다.

## 2. Canonical 필드

스펙 §8은 Version Type 열거값만 정의하고 필드 섹션은 별도 없음. 설계 제안(Part 3-1/3-3 Version 엔티티 설계와 동형 — Golden Rule 일관성): Rule Version ID · Rule ID(`APPROVAL_DYNAMIC_ROLE_RULE` 참조) · Version Type · Version Number(순차) · Effective From · Created By · Digest · Prior Version Reference(불변 체인).

## 3. 열거형 / 타입

스펙 §8 원문 — **Version Type**: Initial · Update · Security Patch · Optimization · Migration. **불변 규칙**: Immutable Version(과거 Version 수정 금지 — Part 3-1/3-3 Version 엔티티와 동일 원칙).

## 4. 실 substrate 매핑 (ABSENT · ground-truth만 인용)

- **Rule(RBAC용) 자체 = ABSENT**(ground-truth §2 "RBAC용 Rule Engine — ABSENT"). `RuleEngine.php`(`:12,24,32,34,194-220`)는 조건=channel_roas/sku_stock/conversions(`:32`)·액션=alert/webhook/pause_channel/reorder(`:34`)인 **마케팅/재고 자동화**이며 role/permission 개념이 전무 — Rule Version이 버전화할 RBAC Rule 대상 자체가 부재.
- **정적 role 변경 = 버전 미생성**(ground-truth §1): `team_role`(로그인 시 세션 스냅샷 `UserAuth.php:1019`·변경은 팀배정 관리작업 `TeamPermissions.php:774`)·`admin_level`(`UserAuth.php:191,1022`·컨텍스트 재평가 없음)·`api_key.role`(생성 시 고정 `Db.php:942-955`·요청마다 재계산 없음·`index.php:573-576` rank 순위화만)은 전부 UPDATE/고정 배정 방식이며 변경 이력을 Version으로 남기지 않는다.
- **CONDITIONAL Component Rule Reference = enum명만**(ground-truth §9): `EPIC_06A_PART3_2_..._SPEC.md:331,661,705`에 Part 3-2 Canonical Entity enum 열거값으로만 존재. Rule을 참조하는 인터페이스 자체가 코드/스키마로 없어, Rule Version이 결합될 지점도 함께 부재.

## 5. 설계 원칙

- Rule Version은 Rule Engine(§4 Rule Version 소속 상위 `APPROVAL_DYNAMIC_ROLE_RULE`) 신설과 **동시에** 도입되어야 하며, 단독으로 먼저 구현할 대상이 없다(버전화할 Rule 자체가 순신규).
- Version Type 5종(Initial~Migration)은 마케팅 `RuleEngine.php`의 조건/액션 문법을 참고하되 그 스토어를 재사용하지 않는다(ADR D-4 — 오흡수 금지, 명명 유사에 속지 않음).
- 과거 Version 불변 원칙은 Part 3-1 Role Version·Part 3-3 Assignment Version과 동일 append-only 철학을 공유하여 06-A 계열 전체 일관성을 유지한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Rule Version은 (1) RBAC용 Rule Engine 자체(순신규) (2) 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped 실 구현이 **이중으로 선행**되어야 함 — 스펙 §8~§37 항목 중 가장 깊은 BLOCKED 계층.
- **Gap**: 현재 RBAC 맥락에서 "규칙"이라 부를 실행 가능한 대상이 전무하여, Rule Version 스키마를 먼저 설계해도 연결할 Rule ID가 없음(설계 순서상 Rule Engine 본체 설계가 선행되어야 함).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core·Rule Engine 본체 실구현 후 별도 승인세션(RP-002).
