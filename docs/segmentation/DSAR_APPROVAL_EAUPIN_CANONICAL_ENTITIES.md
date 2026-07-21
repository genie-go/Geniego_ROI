# DSAR — EAUPIN Canonical Entities Design & Judgment (Part 3-54 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★런타임 RBAC/writeGuard 재사용·네트워크 fabric aspirational·마케팅 RuleEngine 분리.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_POLICY_NETWORK | 부재(형식 네트워크·단일 노드) | — | ABSENT-aspirational |
| 2 | APPROVAL_POLICY_NODE | 부재 | — | ABSENT |
| 3 | APPROVAL_POLICY_DOMAIN | RBAC/정책 도메인 | `public/index.php`·헌법 | PARTIAL-informal |
| 4 | APPROVAL_POLICY_RULE | ★RBAC role/scope·alert/security 정책 | `public/index.php`·`Alerting.php`·`UserAuth.php` | PARTIAL-strong(런타임) |
| 5 | APPROVAL_POLICY_GRAPH | 부재(Part 3-49 참조) | — | ABSENT |
| 6 | APPROVAL_POLICY_SIMULATION | 부재(What-if) | — | ABSENT |
| 7 | APPROVAL_POLICY_RECOMMENDATION | 부재 | — | ABSENT |
| 8 | APPROVAL_POLICY_CONFLICT | 부재(Rule Collision) | — | ABSENT |
| 9 | APPROVAL_POLICY_COMPLIANCE | Privacy·감사 | `GdprConsent.php`·`Compliance.php` | PARTIAL |
| 10 | APPROVAL_POLICY_ANALYTICS | 부재 | — | ABSENT |
| 11 | APPROVAL_POLICY_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_POLICY_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_POLICY_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_POLICY_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 15 | APPROVAL_POLICY_VERSION | git·API 버전 | git | PARTIAL-informal |
| 16 | APPROVAL_POLICY_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 17 | APPROVAL_POLICY_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 18 | APPROVAL_POLICY_EXCEPTION | 부재 | — | ABSENT |
| 19 | APPROVAL_POLICY_FEDERATION | agency scope(부분)·글로벌 부재 | `AgencyPortal.php` | PARTIAL(Partner만) |
| 20 | APPROVAL_POLICY_INTELLIGENCE | 부재(형식 지능) | — | ABSENT |

## 도메인 설계 계약(§3~§20 요지)
- **§3·§4 Governance/Network(Runtime Enforcement)**: `index.php` RBAC+writeGuard(289차 서버전역) 승격(★런타임 정책 집행 실재·중복 정책엔진 금지). alert/security/scope 통합 인덱싱.
- **§12·§13 Lifecycle/Version**: `CHANGE_GATE`+git 형식화(Version Graph 신설).
- **§5·§6·§7·§8·§9·§10 KG/Recommendation/Simulation/Conflict/Distribution/Sync**: 형식 순신설·Multi-Cloud/Region=단일 호스트라 aspirational(Part 3-47).
- **§4 AI Policy Network / §20 Intelligence / AI Advisor**: 마케팅 RuleEngine·마케팅 AI KEEP_SEPARATE(Part 3-2/3-5/3-46).
- **§19 Federation**: Partner=`AgencyPortal` scope. 글로벌/규제 federation=미래.

## 판정
**PARTIAL-strong(§4=런타임 RBAC/writeGuard 정책 집행 실재) / PARTIAL(§3·§9·§12·§19) / ABSENT-formal(§1·§2·§5~8·§10·§11·§13·§20=Network/KG/Simulation/Conflict/Intelligence).** 코드 0. BLOCKED_PREREQUISITE. ★런타임 enforcement 재사용(중복 정책엔진 금지)·네트워크 fabric/KG/시뮬 신설·마케팅 RuleEngine 분리.
