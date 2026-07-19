# DSAR — Composite Risk Aggregation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role의 Risk가 구성 Component 중 **최대 Risk보다 낮아지지 않도록** 하는 canonical 규칙(§6.10·§28). Critical/Administrative/Approval/User Administration/Sensitive Data/Export/Override Permission이 유입되면 상향한다.

## 2. Canonical 필드

Composite Role(§21)·Composite Role Version(§22)·Effective Composite Role Set(§35)의 Risk 관련 필드로 구현한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `risk_aggregation_policy` | §21 Composite Role | 채택 정책 |
| `risk_aggregation_snapshot` | §22 Composite Role Version | 버전별 스냅샷 |
| `risk_result` | §22·§35 | 산출 Risk 결과 |
| `criticality_result` | §22·§35 | 산출 Criticality 결과 |
| `conflict_result` | §22 Composite Role Version | 상향 트리거 요인(Conflict 존재) |
| `dependency_result` | §35 Effective Composite Role Set | 상향 트리거 요인(Dependency 결과) |

## 3. 열거형 / 타입

전용 열거형 없음(§28은 고려 요소 목록으로 서술). 고려 요소: 구성 Role 최대 Risk · Critical/Administrative/Approval/User Administration/Sensitive Data/Export/Override Permission 포함 여부 · Scope Breadth · Actor Type · Temporary/Emergency Assignment 허용 · Conflict 존재 · Explicit Deny 제거 시도.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Risk Aggregation | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) |

★**정직**: Composite Risk Aggregation은 전수조사 §5(근접 알고리즘/구조 패턴) 테이블에도 대응 항목이 없다 — **근접 substrate 자체가 부재**하는 정직한 순신규다. 참고로 `resolveAdminByToken`(`UserAuth.php:2998-3024`, 드리프트 주석 `:2988-2991`)은 admin 판정 SSOT일 뿐이며, 전수조사에서 "admin=최상위 role로 오모델 금지(§6.5·plan≠Role·289차 P4)"의 **경계 대상**으로만 등장한다 — Composite Risk Aggregation의 근접 패턴으로 인용하지 않는다(오인 금지).

## 5. 설계 원칙

- Composite Risk ≥ max(구성 Component Risk)(§6.10 필수 통제·§6.16 고객 설정으로 비활성화 불가) — 하향 금지.
- Critical/Administrative/Approval/User Administration/Sensitive Data/Export/Override Permission이 하나라도 유입되면 상향한다.
- Conflict 존재(§18 Role Conflict) 또는 Explicit Deny 제거 시도 자체가 Risk 상향 트리거다.
- Temporary/Emergency Assignment 허용 여부도 Risk 계산 입력이며, 임시 부여가 Risk를 낮추는 방향으로 작용하지 않는다.
- `resolveAdminByToken` 등 admin 판정 SSOT를 Composite Risk의 최상위 등가물로 오모델하지 않는다(§6.5·289차 P4 재플래그 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Composite Risk Aggregation·Risk/Criticality Result = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Role Risk Classification(Part 3-1)·Permission Engine(Part 2)의 Critical/Sensitive Permission 분류 실구현이 선행되지 않아 공회전.
- 근접 substrate 없음(정직한 부재) — 날조 금지. 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
