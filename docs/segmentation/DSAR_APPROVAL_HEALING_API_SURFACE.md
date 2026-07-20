# DSAR — Self-Healing API Surface (Part 3-20 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

API Surface는 Self-Healing & Continuous Governance의 **외부 계약 8종**을 규정한다. 모든 엔드포인트는 `/api` 접두·라우트 등록 파일의 `$register` 배선·RBAC·테넌트 격리를 준수한다.

| API | 계약 |
|---|---|
| Query Health | 현재 거버넌스/시스템 건전성 조회 |
| Trigger Assessment | 건전성 평가 실행 트리거 |
| Execute Recovery Plan | 승인된 복구 계획 집행 |
| Query Recovery History | 복구 실행 이력 조회 |
| Query Governance Health | 거버넌스 종합 건전성 조회 |
| Run Recovery Simulation | 복구 시뮬레이션(dry-run) |
| Query Analytics | 자가치유 분석 지표 조회 |
| Verify Integrity | 감사 원장 무결성 검증 |

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Query Health | `SystemMetrics.php:60`·`Health.php:27`·라우트 `routes.php:1031-1041` | **baseline 조회만** — self-healing health 아님 |
| Verify Integrity | append-only 해시체인 verify `SecurityAudit.php:56-68` | **확장 대상** — 복구 원장 무결성 |
| Execute Recovery Plan / Trigger Assessment | (집행·트리거 핸들러 부재) | ABSENT |
| Recovery History / Simulation / Analytics / Governance Health | (핸들러·라우트 부재) | ABSENT |

## 3. 설계 계약

- **배선 표준**: 8종 모두 `/api` 접두를 사용하고 라우트 등록 파일에 `$register`로 배선한다(핸들러 미배선≠실백엔드). RBAC는 조회=analyst+, 집행(Execute Recovery Plan)=admin+ 및 maker-checker 승인 선행.
- **Query Health / Query Governance Health**: `SystemMetrics.php:60`·`Health.php:27`의 기존 health 조회를 **확장 재사용**하며 라우트는 `routes.php:1031-1041` 패턴을 참조. 중복 조회 엔드포인트 신설 금지.
- **Verify Integrity**: `SecurityAudit.php:56-68`의 verify를 **확장**하여 복구 실행 원장의 무결성을 검증 — 신규 검증엔진 신설 금지.
- **Execute Recovery Plan**: §26 Runtime Guard를 단일 관문으로 통과해야만 집행되며, Guardrail 위반 시 `AUTO_REMEDIATION_BLOCKED`(§28) 반환. 승인 없는 집행은 `RECOVERY_APPROVAL_REQUIRED`.
- **Run Recovery Simulation**: 상태변경 없는 dry-run으로 복구 계획의 §27 Static Lint·§26 불변식을 사전 검증. 시뮬레이션은 승인 불필요·부작용 0.
- **Query Recovery History / Analytics**: §29 Warning Contract·복구 실행 원장을 소스로 삼으며, 테넌트 격리 하에 조회.

## 4. 판정

**ABSENT (grep 0)** — 8종 API 전부 신규. 재사용 가능한 substrate는 Query Health(`SystemMetrics.php:60`·`Health.php:27`·`routes.php:1031-1041` baseline)·Verify Integrity(`SecurityAudit.php:56-68` 확장) 2건에 한정. 나머지 6종(Trigger Assessment/Execute Recovery Plan/Recovery History/Governance Health/Simulation/Analytics)은 핸들러·라우트 부재로 **순신설**이며 `/api` 접두·`$register` 배선 필수. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
