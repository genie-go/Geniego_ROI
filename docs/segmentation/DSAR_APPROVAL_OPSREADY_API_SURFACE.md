# DSAR — OpsReady API Surface (Part 3-25 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

OpsReady API Surface는 Part 3-25 운영 준비를 조회·집행하는 **8종 엔드포인트**를 정의한다. 모든 쓰기 경로는 §24 Runtime Guard 뒤에 배치되며 fail-closed다.

- **Validate Platform** — 플랫폼 통합 무결성 검증.
- **Assess Readiness** — 준비도 종합 평가.
- **Generate Production Certificate** — 운영 인증서 발급.
- **Query Operational Status** — 운영 상태 조회(읽기).
- **Execute Final Validation** — 최종 검증 집행.
- **Export Go-Live Checklist** — go-live 체크리스트 내보내기.
- **Query Analytics** — 운영 준비 분석 조회(읽기).
- **Export Integration Snapshot** — 통합 스냅샷 내보내기.

## 2. Substrate 매핑

| 엔드포인트 | 현존 substrate (①②) | 인용/상태 | 관계 |
|---|---|---|---|
| Query Operational Status | Health 쿼리 상태 | `backend/src/Handlers/Health.php:27-45` | 상태 조회 재사용 |
| Assess Readiness | Compliance 평가 | `backend/src/Handlers/Compliance.php:50-128` | 준비도 평가 확장 |
| Generate Production Certificate | SecurityAudit 인증 서명 | `backend/src/SecurityAudit.php:25-31` | 인증 발급 확장 |
| Validate Platform | (플랫폼 검증) | 부재 | ABSENT·순신설 |
| Execute Final Validation | (최종 검증) | 부재 | ABSENT·순신설 |
| Export Go-Live Checklist | (체크리스트 export) | 부재 | ABSENT·순신설 |
| Query Analytics | (준비 분석) | 부재 | ABSENT·순신설 |
| Export Integration Snapshot | (스냅샷 export) | 부재 | ABSENT·순신설 |

## 3. 설계 계약

- 8종 엔드포인트는 전부 순신규이며 **`/api` 접두**로 배선하고 라우트 등록 파일에 `$register`로 배선한다(nginx SPA HTML 폴백 착시 회피).
- 읽기 3종(Query Status·Assess·Query Analytics)은 Guard 뒤 read-only. 쓰기 5종(Validate·Certificate·Final Validation·Checklist·Snapshot)은 §24 Guard 통과 후만 집행.
- Query Status는 `Health.php:27-45`, Assess Readiness는 `Compliance.php:50-128`, Certificate는 `SecurityAudit.php:25-31`을 소비·확장하며 중복 핸들러를 신설하지 않는다.
- 실패는 §26 에러, 경미 신호는 §27 경고로 매핑. API는 substrate 소비 외 상태 변경 없음(비파괴).

## 4. 판정

**ABSENT — greenfield.** 8종 opsready API는 전부 순신규 표면이다. Query Status(`Health.php:27-45`)·Assess Readiness(`Compliance.php:50-128`)·Certificate(`SecurityAudit.php:25-31`) 3개 substrate를 소비·확장하며 `/api` 접두·`$register` 배선으로 설계한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
