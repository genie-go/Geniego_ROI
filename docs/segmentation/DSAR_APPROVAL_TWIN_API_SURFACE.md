# DSAR — Authorization Digital Twin API Surface (Part 3-22 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
API Surface는 Authorization Digital Twin의 외부 계약(엔드포인트 집합)의 정본이다. 각 엔드포인트는 §25 Runtime Guard·§26 Static Lint·§27/§28 Error·Warning Contract를 통과한 뒤에만 동작하며, 운영 실체를 변경하지 않는다(read-derived·격리 write). 본 §29가 규정하는 8종 엔드포인트:

- **Create Twin** — 권한 상태의 미러 twin 생성.
- **Synchronize Twin** — twin을 운영 스냅샷과 동기화.
- **Execute Replay** — 이벤트 리플레이 실행(인가·격리 하).
- **Run Scenario** — 시나리오 시뮬레이션 실행.
- **Predict Impact** — 권한 변경의 영향 예측.
- **Query Forecast** — 예측 결과 조회.
- **Query Twin Analytics** — twin 분석 지표 조회.
- **Export Twin Snapshot** — twin 스냅샷 내보내기.

## 2. Substrate 매핑 (기존 기반 · 재사용 대상)
| 엔드포인트 | 재사용 substrate | 현행 근거 | 성격 |
|---|---|---|---|
| Create Twin | write-PEP `guardTeamWrite` | `UserAuth.php:1167`, deny `:1182` | write 인가 baseline |
| Synchronize Twin | env 격리·DB 연결 | `Db.php:81-84`, `:63-87` | 격리 baseline |
| Execute Replay | RBAC role 판정 | `UserAuth.php:1179-1181`, 거부 `:1188` | 주체 인가 |
| Run Scenario | (시나리오 런타임 부재) | — | ABSENT |
| Predict Impact | 추론 진입(일반) | `ClaudeAI.php:18` | 예측 baseline |
| Query Forecast | 추론 진입(일반) | `ClaudeAI.php:18` | 예측 baseline |
| Query Twin Analytics | 시스템 메트릭 | `SystemMetrics.php:32`, 집계 `:36-45` | 분석 baseline |
| Export Twin Snapshot | append-only 봉인 | `SecurityAudit.php:56-67`, `:27` | 무결성 봉인 |

## 3. 설계 계약 (본 DSAR가 규정)
- **배선 규약**: 8종 모두 `/api` 접두 하에 라우트 등록 파일에 `$register`로 배선(신규 실배선 /api 접두 필수 — nginx SPA HTML 폴백 착시 회피). 라우트 미배선 핸들러는 실백엔드 아님.
- **인가 게이트**: write 계열(Create/Synchronize/Execute/Run)은 write-PEP(`UserAuth.php:1167`) + role(`UserAuth.php:1179-1181`) 통과 필수, 실패 시 403(`UserAuth.php:1182`·`:1188`). read 계열(Query Forecast/Analytics/Export)은 조회 인가만.
- **운영 무영향 불변**: 모든 엔드포인트는 운영 실체 write 금지 — 격리 스토어(env 격리 `Db.php:81-84`)에만 쓴다. Export Twin Snapshot은 SecurityAudit 봉인(`SecurityAudit.php:56-67`·`:27`)으로 무결성 보장.
- **예측 계열**: Predict Impact/Query Forecast는 추론 진입(`ClaudeAI.php:18`) 상위에 §27 Confidence 게이트를 얹어 신뢰도 미달 산출 차단(근거·신뢰도 표시 필수, Explainable AI). Query Twin Analytics는 시스템 메트릭(`SystemMetrics.php:32`) 집계를 twin 스코프로 확장.
- **중복 금지**: 기존 Analytics(`SystemMetrics.php:32`)·예측(`ClaudeAI.php:18`) 위에 얹되 중복 엔진 신설 금지 — twin 스코프만 추가.

## 4. 판정
**ABSENT — 8종 순신규.** twin API surface 전용 코드는 부재. 재사용 가능한 baseline은 write 인가(`UserAuth.php:1167`), 격리(`Db.php:81-84`), 분석(`SystemMetrics.php:32`), 예측(`ClaudeAI.php:18`), 봉인(`SecurityAudit.php:56-67`)이며 Run Scenario는 substrate조차 부재. **Query Analytics=SystemMetrics · Forecast=ClaudeAI · `/api` 접두·`$register` 배선.** **순신설 · 코드 변경 0 · NOT_CERTIFIED.**
