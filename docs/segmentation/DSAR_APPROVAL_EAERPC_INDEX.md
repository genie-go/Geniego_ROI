# DSAR — EAERPC Index (Part 3-36)

> **거버넌스 상태**: 설계 명세 DSAR 인덱스 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).

Part 3-36 (Enterprise Authorization Enterprise Reference Platform Certification) 산출 문서 색인.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/EPIC_06A_PART3_36_REFERENCE_PLATFORM_CERTIFICATION_SPEC.md` | canonical SPEC v1.0(§0~§28) |
| `docs/architecture/ADR_DSAR_AUTHZ_REFERENCE_PLATFORM_CERTIFICATION.md` | 설계 결정(D-1~D-5·자기참조 정직·중복경계) |
| `DSAR_APPROVAL_EAERPC_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `DSAR_APPROVAL_EAERPC_DUPLICATE_IMPLEMENTATION_AUDIT.md` | GT② 상위 Part(3-25/3-28/3-29) 중복 경계 |
| `DSAR_APPROVAL_EAERPC_CANONICAL_ENTITIES.md` | §2 20 엔티티 + §3~18 인증도메인 설계·판정 |
| `DSAR_APPROVAL_EAERPC_GOVERNANCE_MECHANISMS.md` | §19~28 Guard/Lint/Error/API/DB/Test/Gate |
| `DSAR_APPROVAL_EAERPC_INDEX.md` | 본 색인 |

## 판정 요약
- **★근본 정직 판정:** EAERPC 엔진을 EPIC 06-A에 적용 시 결과=**Not Certified**(Part1~3-35 전건 NOT_CERTIFIED·코드 0). 인증 프레임워크는 설계 가능·대상 플랫폼(06-A)은 인증 불가. "Certified" 표기 절대 금지.
- **★상위 Part 중복(핵심):** Functional/Security/Performance/Compliance Certification=Part 3-29(Validation Suite) Validator 실행·집계 계층·Production Certification=Part 3-25·Certification Readiness=Part 3-28 참조. **새 Validator/인증엔진 재정의 금지**.
- **PARTIAL(재사용): `NOT_CERTIFIED` 라벨·`Compliance.php`·E2E smoke/CI·pending_approval/handoff approval·`SecurityAudit`·deploy build / ABSENT-formal(통합 Certification Lifecycle/Renewal/Dashboard·Reference Signature=SBOM/artifact signing).**
- **★KEEP_SEPARATE:** 채널/제품 인증(kc_cert) ≠ Platform Reference Certification · Part3-28 Maturity Readiness(성숙도) ≠ Platform Certification(합격/불합격).
- **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-35 실 구현·인증 종속).

## 다음 (SPEC §다음)
Part 3-37 Global Center of Excellence → … → 3-43 Future Technology Adoption.
