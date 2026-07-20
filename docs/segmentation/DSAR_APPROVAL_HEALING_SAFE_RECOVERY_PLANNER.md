# DSAR — Safe Recovery Planner (Part 3-20 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`Safe Recovery Planner`는 거버넌스 이탈·자동 교정 실패 시 **안전한 복구 전략을 선택·계획**하는 계약이다. 복구 강도별 8단계를 정의하고, 위험도가 임계를 넘으면 사람 승인을 강제한다.

- **Retry** → **Restart** → **Reload** → **Failover** → **Rollback** → **Isolation** → **Graceful Degradation** → **Manual Approval Required**.
- 원칙: 최소 침습 우선(Retry/Reload) → 파괴·상태변경 큰 전략(Rollback/Isolation)일수록 승인·감사 요구 강화.
- Manual Approval Required는 **종착 안전판** — 자동 판단 불가·비가역·Critical 대상 시 항상 이 경로.

복구 계획은 실행이 아니라 **계획 산출**이며, 집행은 승인·Guardrail을 통과한 액션만.

## 2. Substrate 매핑

| SPEC 전략 | 현행 substrate | 관계 | 인용 |
|---|---|---|---|
| Rollback | schema 롤백 | 재사용 기반(스키마 한정) | `Migrate.php:310` |
| Manual Approval Required | maker-checker 매핑 승인 | 승인 경로 재사용 | `Mapping.php:240`,`:268-271`,`:287` |
| Reload/Restart 관측 접점 | 시스템 메트릭·헬스 | 상태 신호원 | `SystemMetrics.php:60`,`:67-76`,`:417`,`Health.php:27` |
| 복구 전략 선택 오케스트레이션 | — | ABSENT(grep 0) | 없음 |

현행에 recovery planner가 없다(recovery planner grep 0). Rollback은 `Migrate.php:310`의 **스키마 롤백**에 국한되고, Manual Approval은 `Mapping.php:240`·`:268-271`·`:287`의 maker-checker 승인 흐름을 재사용 가능하나, 전략 선택 로직(Retry→…→Manual)은 부재하다.

## 3. 설계 계약

- **입력**: 이탈 유형·영향 반경·가역성·§7 자동교정 실패 사유.
- **전략 선택**: 최소 침습부터 상향 탐색. 각 전략은 사전조건·위험도·롤백 가능성 태그.
- **승인 게이트**: Rollback/Isolation/비가역 대상 → `Mapping.php:240`·`:287` maker-checker 경유 Manual Approval 강제.
- **Rollback 범위**: 스키마성 롤백은 `Migrate.php:310` 재사용, 권한·역할 삭제성 롤백은 자동 금지(§7 Guardrail 연동).
- **관측**: 복구 전후 `SystemMetrics.php:67-76`·`Health.php:27`로 상태 확인, `SecurityAudit.php:14-68`에 계획·집행 기록 append.
- **Fail-closed·무후퇴**: 안전 전략 미확정 시 Manual Approval Required로 종착. 기존 Migrate·Mapping·Health 동작 불변.

## 4. KEEP_SEPARATE

- `GraphScore.php` — 그래프 점수 산출. 복구 전략과 도메인 무관, 병합 금지.
- `ModelMonitor.php:221` — 모델 모니터링. Graceful Degradation 신호원 후보이나 엔진 분리 유지.

## 5. 판정

**ABSENT** — recovery planner는 grep 0. Rollback은 `Migrate.php:310`(스키마 한정)·Manual Approval은 `Mapping.php:240`(maker-checker)로 부분 재사용 가능하나 8단계 전략 선택 오케스트레이션은 부재. **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
