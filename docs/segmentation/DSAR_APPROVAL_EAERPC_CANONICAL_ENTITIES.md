# DSAR — EAERPC Canonical Entities Design & Judgment (Part 3-36 §2~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★상위 Part 3-25/3-28/3-29 참조·엔진 재정의 금지.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_REFERENCE_PLATFORM | 부재(플랫폼 자체=제품) | — | ABSENT-formal |
| 2 | APPROVAL_CERTIFICATION_PROFILE | 부재 | — | ABSENT |
| 3 | APPROVAL_CERTIFICATION_CRITERIA | Completion Gate(각 Part §Gate) | `DSAR_APPROVAL_*` | PARTIAL(문서형 기준) |
| 4 | APPROVAL_CERTIFICATION_EXECUTION | E2E/CI 실행 | `tools/e2e`·`deploy.yml` | PARTIAL(3-29 공유) |
| 5 | APPROVAL_CERTIFICATION_RESULT | NOT_CERTIFIED(전건) | `DSAR_APPROVAL_*` | PARTIAL(=Not Certified) |
| 6 | APPROVAL_CERTIFICATION_EXCEPTION | 부재(--no-verify=비형식 waiver) | `.githooks/` | ABSENT-formal |
| 7 | APPROVAL_CERTIFICATION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 8 | APPROVAL_CERTIFICATION_APPROVAL | pending_approval·handoff approval | `Catalog.php`·`Alerting.php` | PARTIAL |
| 9 | APPROVAL_CERTIFICATION_RENEWAL | 부재 | — | ABSENT |
| 10 | APPROVAL_CERTIFICATION_BASELINE | Reference Architecture(Part3-26 설계) | `docs/spec/*` | ABSENT-formal |
| 11 | APPROVAL_CERTIFICATION_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_CERTIFICATION_DIGEST | 부재 | — | ABSENT |
| 13 | APPROVAL_CERTIFICATION_ANALYTICS | 부재 | — | ABSENT |
| 14 | APPROVAL_CERTIFICATION_REPORT | 부재(PM 이력=비형식) | `docs/pm/` | ABSENT-formal |
| 15 | APPROVAL_CERTIFICATION_VERSION | git·문서 버전 | git | PARTIAL |
| 16 | APPROVAL_CERTIFICATION_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 17 | APPROVAL_REFERENCE_RELEASE | deployMarker | `Db.php` | PARTIAL |
| 18 | APPROVAL_REFERENCE_BUILD | CI 빌드·npm build | `deploy.yml` | PARTIAL(SBOM 부재) |
| 19 | APPROVAL_REFERENCE_VALIDATION | E2E/CI | `tools/e2e` | PARTIAL(3-29 공유) |
| 20 | APPROVAL_REFERENCE_SIGNATURE | 부재(artifact signing 없음) | — | ABSENT(순신설) |

## 도메인 설계 계약(§3~§18 요지)
- **§5 Functional Certification**: RBAC/ABAC/Policy Engine/API 대상. ★실 substrate 강함(RBAC/writeGuard/effectiveForUser)이나 인증은 이 실 구현을 **검증**(Part 3-29 Validator 실행). 이번 세션 보안 5클래스 감사가 사실상 Functional/Security Certification 수동 실행.
- **§6 Security Certification**: Zero Trust(부분)·Encryption(Crypto AES-256-GCM)·Secret(P5 세션해시)·Vulnerability(CI CodeQL/composer audit) 실재·형식 인증 부재.
- **§8 Availability·§9 Compliance**: Part 3-30/3-25/3-28 참조. Multi-Region=단일 호스트라 부재.
- **§14 Renewal·§20 Reference Signature**: 순신설(SBOM/artifact signing 부재·Part3-25 정합).

## 판정
**PARTIAL(§3~5·§7~8·§15~19=Completion Gate/E2E/CI/pending_approval/SecurityAudit/deploy substrate·상위 Part 공유) / ABSENT-formal(통합 Lifecycle/Renewal/Dashboard/Reference Signature) + ★06-A=Not Certified.** 코드 0. BLOCKED_PREREQUISITE. 실행 시 상위 Part Validator 참조·엔진 재정의 금지.
