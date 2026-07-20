# DSAR — LTER Canonical Entities Design & Judgment (Part 3-27 §2~§24)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC/ADR/GT: Part 3-27 계보. file:line 인용은 GT①(`_EXISTING_IMPLEMENTATION`)·GT②(`_DUPLICATE_IMPLEMENTATION_AUDIT`)/ADR 등장분만(반날조).

## 20 Canonical Entity — substrate 매핑·판정

| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_EVOLUTION_REGISTRY | 부재 | — | ABSENT(순신설·전 진화자산 인덱스) |
| 2 | APPROVAL_ROADMAP | 부재 | — | ABSENT |
| 3 | APPROVAL_CAPABILITY | 부재(능력 카탈로그 없음) | — | ABSENT |
| 4 | APPROVAL_TECHNOLOGY_TRACK | 부재 | — | ABSENT |
| 5 | APPROVAL_ARCHITECTURE_EVOLUTION | 부재(현 아키텍처=Slim 모놀리식) | — | ABSENT |
| 6 | APPROVAL_SECURITY_EVOLUTION | 부재(MFA/세션해시 등 개별 실재·로드맵 부재) | — | ABSENT-formal |
| 7 | APPROVAL_COMPLIANCE_EVOLUTION | 부재(DSAR/Consent 개별 실재·진화계획 부재) | — | ABSENT-formal |
| 8 | APPROVAL_AI_EVOLUTION | 부재(AI 기능 실재·진화 로드맵 부재) | — | ABSENT-formal |
| 9 | APPROVAL_TECHNICAL_DEBT | 비형식 로그 | `NEXT_SESSION.md`·`docs/` | PARTIAL-informal |
| 10 | APPROVAL_DEPRECATION_PLAN | 구버전 라우트 stub 유지 | `backend/src/routes.php` | PARTIAL-informal(형식 절차 부재) |
| 11 | APPROVAL_VERSION_LIFECYCLE | API 버전 병렬 라우팅 | `backend/src/routes.php` | PARTIAL-informal(형식 상태머신 부재) |
| 12 | APPROVAL_VENDOR_STRATEGY | 부재 | — | ABSENT |
| 13 | APPROVAL_INVESTMENT_PLAN | 부재 | — | ABSENT |
| 14 | APPROVAL_ROADMAP_SNAPSHOT | 부재 | — | ABSENT |
| 15 | APPROVAL_ROADMAP_EVIDENCE | append-only 정본만 실재 | `backend/src/SecurityAudit.php` | ABSENT(Evidence 스키마 부재·체인 재사용 대상) |
| 16 | APPROVAL_ROADMAP_DIGEST | 부재 | — | ABSENT |
| 17 | APPROVAL_ROADMAP_ANALYTICS | 부재 | — | ABSENT |
| 18 | APPROVAL_ROADMAP_DRIFT | 부재(ModelMonitor drift=KEEP_SEPARATE) | — | ABSENT |
| 19 | APPROVAL_ROADMAP_REVALIDATION | 부재 | — | ABSENT |
| 20 | APPROVAL_ROADMAP_RECONCILIATION | 부재(정산 reconciliation=KEEP_SEPARATE) | — | ABSENT |

## 도메인 설계 계약(§3~§24 요지)
- **§3 Time Horizon(Current/Next/1/3/5/10Y)**: 각 단계 목표·투자·위험·기대효과·성공기준. 순신설.
- **§4 Capability(11영역)·§5 Architecture(Monolith→…→Adaptive)**: 현 상태=Slim 모놀리식(`public/index.php`)·능력 카탈로그 부재 → 첫 단계=Modular 경계 도출.
- **§6 Security Evolution**: Passwordless/Continuous Auth·PQC·Confidential Computing. 현행 개별 보안(MFA·세션해시 P5)은 실재하나 로드맵 미연결.
- **§9 Modernization·§10 Technical Debt·§11 Dependency Lifecycle**: composer/npm 목록을 소스로 EOL/refactor 우선순위(Critical/High/Med/Low) 계층 신설.
- **§12 Version Lifecycle(Preview→…→Retired)·§13 Deprecation(Announce→Sunset→Removal)**: 기존 `/vNNN` 병렬 라우팅 **승격**(중복 신설 금지·backward compat 보존).
- **§18~24 Snapshot/Evidence/Digest/Analytics/Drift/Revalidation/Reconciliation**: Immutable=`SecurityAudit::verify` 체인 재사용·Tenant Isolation=`Db.php` 격리 재사용.

## 판정
**전건 ABSENT(형식) / 일부 PARTIAL-informal(§9~§11 substrate).** 코드 변경 0. 모든 엔티티는 선행 Part 인증(BLOCKED_PREREQUISITE)에 종속하며, 실행 시 기존 버전 라우팅·SecurityAudit·Db 격리를 확장한다(엔진 난립·해시체인 신설 금지).
