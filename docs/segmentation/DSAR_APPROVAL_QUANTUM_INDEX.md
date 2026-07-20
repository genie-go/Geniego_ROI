# DSAR — Authorization Quantum-Ready Index (Part 3-23 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-23 §30은 Quantum-Ready 권한 데이터의 **인덱스 전략** 6축을 규정한다:
(a) **Crypto Asset Index** — 자산 유형·알고리즘·강도별 조회 인덱스.
(b) **Key Index** — 키 ID·버전·상태·회전 스케줄 인덱스.
(c) **Certificate Index** — 인증서 지문·발급자·만료일·체인 위치 인덱스.
(d) **Algorithm Index** — 알고리즘 계열(고전/하이브리드/PQC)·양자 취약도 인덱스.
(e) **Migration Index** — 마이그레이션 단계·대상 자산·상태 인덱스.
(f) **Snapshot Index** — 시점 스냅샷·다이제스트 조회 인덱스.

## 2. Substrate 매핑
| §30 인덱스 | 현행 substrate | 근거(file:line) | 상태 |
|---|---|---|---|
| Crypto Asset Index | crypto 관리 테이블 부재 | (allowlist 외·기술 서술) | ABSENT |
| Key Index | 현 DB 인덱스 축=api_key | `Db.php:945`·`:998` | ABSENT(관리 인덱스 없음) |
| Certificate Index | 인증서 관리 테이블 부재 | (기술 서술) | ABSENT |
| Algorithm Index | 알고리즘 카탈로그 부재 | (기술 서술) | ABSENT |
| Migration Index | 마이그레이션 테이블 부재 | (기술 서술) | ABSENT |
| Snapshot Index | 스냅샷 테이블 부재 | (기술 서술) | ABSENT |

## 3. 설계 계약
- 6개 인덱스 전부 §29 신설 관리 테이블에 **종속**한다. §29 스키마 미확정 상태에서 인덱스 단독 구축 불가(BLOCKED_PREREQUISITE).
- 현행 DB 인덱스 축은 api_key(`Db.php:945`·`:998`)에 국한 — crypto 자산/키/인증서/알고리즘/마이그레이션/스냅샷 관리 인덱스는 전무(grep 0·GT①).
- 모든 신설 인덱스는 `tenant_id` 선두 복합키(api_key tenant `Db.php:945`와 동일 격리)로 설계하여 §29 Tenant Isolation 제약과 정합.
- Algorithm Index는 양자 취약도(quantum_vulnerability) 컬럼을 포함해 §31 Quantum Risk 스캔·§32 Weak Algorithm Injection 탐지의 조회 경로로 재사용.

## 4. 판정
**ABSENT**. crypto 관리 테이블·인덱스 전무(grep 0·GT①). 현 DB=api_key(`Db.php:945`·`:998`). 6개 인덱스 전부 **순신설**이며 §29 스키마 선행 필수(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
