# DSAR — Operational Readiness Database Constraint (Part 3-25 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-25 §29는 Platform Final Integration & Operational Readiness 도메인의 **데이터 무결성 제약(Database Constraint)**을 규정한다. 5개 불변식을 요구한다:
- **Immutable Certification History** — 인증 이력 append-only, 사후 변조 불가.
- **Immutable Operational Sign-off** — 운영 승인(sign-off) 레코드 불변.
- **Release Version Integrity** — 릴리스 버전 단조·중복 불가·역행 금지.
- **Configuration Baseline Integrity** — 구성 기준선(baseline) 스냅샷 무결성.
- **Tenant Isolation** — 모든 인증/승인/릴리스 레코드의 테넌트 경계 절대 격리.

## 2. Substrate 매핑
| SPEC 불변식 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| Tenant Isolation | Db 테넌트 스코프 격리 | `backend/src/Db.php:81-84` | 격리 존재 |
| Immutable Certification History | SecurityAudit 해시체인 append-only | `backend/src/SecurityAudit.php:25-31` | 확장 기반 |
| Immutable Operational Sign-off | SecurityAudit 체인 링크 무결성 | `backend/src/SecurityAudit.php:47-52` | 확장 기반 |
| Release Version Integrity | migration 버전 락(단조 적용) | `backend/src/Db.php:157-163` | 부분 기반 |
| Configuration Baseline Integrity | 현 DB=env 설정 로드(제약 테이블 무) | `backend/src/Db.php:43-48` | 순신설 |

## 3. 설계 계약
- **Immutable Certification History**: `certification_history` 테이블은 존재하지 않는다(grep 0). 신설 시 각 행에 SecurityAudit 해시체인(`SecurityAudit.php:25-31`) preimage를 링크하여 append-only를 강제하고, verify 대상으로 편입한다. UPDATE/DELETE 트리거 금지, 정정은 보정행(compensating row)만.
- **Immutable Operational Sign-off**: sign-off 레코드는 체인 링크 무결성(`SecurityAudit.php:47-52`)을 상속한다. actor·시각·승인 대상 digest를 preimage에 봉인.
- **Release Version Integrity**: 릴리스 버전 단조성은 migration 락(`Db.php:157-163`)의 순차 적용 패턴을 참조 substrate로 삼되, 릴리스 도메인 전용 UNIQUE + 단조 CHECK는 순신설.
- **Configuration Baseline Integrity**: 현재 구성은 env 로드(`Db.php:43-48`)에 그치며 baseline 스냅샷·drift 제약 테이블이 전무 → 순신설. baseline digest는 SecurityAudit 봉인 권장.
- **Tenant Isolation**: 신설 4테이블 전부 `Db.php:81-84` 테넌트 스코프 술어를 필수 컬럼·인덱스로 상속. Cross-Tenant 인증/배포 레코드 원천 차단.

## 4. 판정
**PARTIAL.**
- 실재 substrate: Tenant Isolation=격리(`Db.php:81-84`), Immutable=SecurityAudit 해시체인(`SecurityAudit.php:25-31`·`:47-52`), Release Version=migration 락(`Db.php:157-163`).
- 순신설: Certification History·Operational Sign-off·Configuration Baseline Integrity 제약 테이블(현 DB=env 설정 `Db.php:43-48`, 거버넌스 테이블 grep 0).
- 코드 변경 0 · NOT_CERTIFIED · 선행 Part1~3-24 인증 후 실행 가능.
