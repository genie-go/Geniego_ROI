# DSAR — EAUATCP Canonical Entities Design & Judgment (Part 3-59 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Part 3-45/3-47/3-56 동일 substrate·Reputation/Negotiation aspirational.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_UNIVERSAL_TRUST | 부재(형식 Universal Trust) | — | ABSENT-aspirational |
| 2 | APPROVAL_TRUST_CIVILIZATION | 부재(형식 문명) | — | ABSENT-aspirational |
| 3 | APPROVAL_TRUST_DOMAIN | 대행사/파트너·RBAC 도메인 | `AgencyPortal.php`·`index.php` | PARTIAL |
| 4 | APPROVAL_TRUST_POLICY | RBAC/scope·재검증 | `index.php`·`AgencyPortal.php` | PARTIAL |
| 5 | APPROVAL_TRUST_RELATIONSHIP | 대행사→클라이언트 위임 | `AgencyPortal.php`·`PartnerPortal.php` | PARTIAL-strong |
| 6 | APPROVAL_TRUST_REPUTATION | DataTrust Score(데이터·seed) | `DataPlatform.php` | PARTIAL(KEEP_SEPARATE) |
| 7 | APPROVAL_TRUST_EXCHANGE | 암호서명·해시체인 | `Crypto`·`SecurityAudit.php` | PARTIAL(cross-org Federation 부재) |
| 8 | APPROVAL_TRUST_NEGOTIATION | 부재(자율 협상) | — | ABSENT-aspirational |
| 9 | APPROVAL_TRUST_KNOWLEDGE | 부재(Part 3-49 참조) | — | ABSENT |
| 10 | APPROVAL_TRUST_ANALYTICS | 부재(형식) | — | ABSENT |
| 11 | APPROVAL_TRUST_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_TRUST_EVIDENCE | append-only 정본·암호 | `SecurityAudit.php`·`Crypto` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_TRUST_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_TRUST_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 15 | APPROVAL_TRUST_VERSION | git·API 버전 | git | PARTIAL |
| 16 | APPROVAL_TRUST_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 17 | APPROVAL_TRUST_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 18 | APPROVAL_TRUST_EXCEPTION | FP 레지스트리 | `reference_audit_false_positives` | PARTIAL-informal |
| 19 | APPROVAL_TRUST_OPTIMIZATION | 부재(자율 최적화) | — | ABSENT-aspirational |
| 20 | APPROVAL_TRUST_FEDERATION | 대행사/SSO 연합 | `AgencyPortal.php`·`EnterpriseAuth.php` | PARTIAL(Enterprise만) |

## 도메인 설계 계약(§3~§20 요지)
- **§4·§5·§20 Trust/Federation**: `AgencyPortal`/`PartnerPortal`(크로스조직)·`EnterpriseAuth`(연합) 재사용. AI/Robot Identity·Multi-Cloud/Government=미래.
- **§7 Autonomous Trust Policy / Runtime**: 재검증(Zero Trust)+`index.php` RBAC/writeGuard 승격.
- **§9 Evidence Exchange**: `Crypto` 서명+`SecurityAudit`. cross-org Federation=미래.
- **§6 Reputation**: DataTrust(데이터 신뢰≠평판·seed)·형식 Reputation Manager 신설.
- **§8·§11·§19·§20 Negotiation/KG/Advisor/Optimization**: 형식/aspirational 순신설·마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL(§3~7·§12·§20=Agency/Partner/EnterpriseAuth/재검증/암호/DataTrust 재사용) / ABSENT-aspirational(§1·§2·§8·§9·§10·§19=Universal Trust/문명/Negotiation/KG/Analytics/Optimization).** 코드 0. BLOCKED_PREREQUISITE. ★Part 3-45/3-47/3-56 상위집합(재설계 금지)·크로스조직/신뢰 재사용·Reputation/Negotiation 조기구현 금지·DataTrust≠평판·마케팅 AI 분리.
