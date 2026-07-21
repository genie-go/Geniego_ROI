# DSAR — EAACGP Canonical Entities Design & Judgment (Part 3-53 §2~§19)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★실 헌법(CONSTITUTION.md)·CHANGE_GATE·SecurityAudit 재사용·런타임 엔진 greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_CONSTITUTION | ★최상위 개발 헌법 | `docs/CONSTITUTION.md`·데이터 헌법 6볼륨 | PARTIAL-strong |
| 2 | APPROVAL_CONSTITUTION_RULE | 절대금지·Golden Rule·게이트 규칙 | `docs/CONSTITUTION.md`·`CHANGE_GATE.md` | PARTIAL-informal |
| 3 | APPROVAL_CONSTITUTION_POLICY | 헌법 정책·pre-commit 게이트 | `CHANGE_GATE.md`·pre-commit G-게이트 | PARTIAL(개발·런타임 아님) |
| 4 | APPROVAL_CONSTITUTION_DECISION | ADR·PM 승인 | `docs/architecture/`(ADR)·`/v423/approvals` | PARTIAL-informal |
| 5 | APPROVAL_CONSTITUTION_AMENDMENT | git+게이트+PM 승인 | git·`CHANGE_GATE.md`·`AgencyPortal.php` | PARTIAL-informal |
| 6 | APPROVAL_CONSTITUTION_EXCEPTION | 부재(형식 예외) | — | ABSENT |
| 7 | APPROVAL_CONSTITUTION_COMPLIANCE | verify-before-change 규율 | `CHANGE_GATE.md` | PARTIAL-informal |
| 8 | APPROVAL_CONSTITUTION_AUDIT | ★append-only 해시체인 | `SecurityAudit.php`(verify) | PARTIAL-strong(정합) |
| 9 | APPROVAL_CONSTITUTION_KNOWLEDGE | 부재(Part 3-49 참조) | — | ABSENT |
| 10 | APPROVAL_CONSTITUTION_KPI | 부재(형식 KPI) | — | ABSENT |
| 11 | APPROVAL_CONSTITUTION_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_CONSTITUTION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_CONSTITUTION_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_CONSTITUTION_ANALYTICS | 부재 | — | ABSENT |
| 15 | APPROVAL_CONSTITUTION_BASELINE | 헌법 정본·git | `docs/CONSTITUTION.md`·git | PARTIAL |
| 16 | APPROVAL_CONSTITUTION_VERSION | git·헌법 버전 | git | PARTIAL |
| 17 | APPROVAL_CONSTITUTION_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 18 | APPROVAL_CONSTITUTION_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 19 | APPROVAL_CONSTITUTION_APPROVAL | 승인 워크플로우 | `AgencyPortal.php`·`/v423/approvals` | PARTIAL |
| 20 | APPROVAL_CONSTITUTION_FEDERATION | SSO federation(부분) | `EnterpriseAuth.php` | PARTIAL |

## 도메인 설계 계약(§3~§19 요지)
- **§3 Constitutional Governance**: `CONSTITUTION.md`+데이터 헌법 6볼륨 승격(중복 헌법 절대 금지).
- **§4·§5 Policy Engine/Validation**: `CHANGE_GATE`+pre-commit G-게이트(sacred SHA/중복금지) 승격. executable Rule Engine·런타임 검증 신설.
- **§10 Audit / Immutable History**: `SecurityAudit::verify`(완벽 정합·중복 체인 금지).
- **§8 Amendment**: git+게이트+PM 승인 형식화(Amendment Chain 신설).
- **§7 Conflict Resolver / §11 Knowledge Graph / §18 AI Advisor / §19 Federation**: Conflict Resolver/KG(Part 3-49) 신설·AI Advisor 마케팅 AI KEEP_SEPARATE·Federation=EnterpriseAuth.

## 판정
**PARTIAL-strong(§1·§8=CONSTITUTION.md·SecurityAudit 강함) / PARTIAL-informal(§2~5·§7·§15·§19=게이트/ADR/git/승인) / ABSENT(§6·§9~11·§13·§14=Exception/Knowledge Graph/KPI/Analytics).** 코드 0. BLOCKED_PREREQUISITE. ★실 헌법/게이트/SecurityAudit 재사용(중복 절대 금지)·런타임 헌법 엔진 신설·마케팅 AI 분리.
