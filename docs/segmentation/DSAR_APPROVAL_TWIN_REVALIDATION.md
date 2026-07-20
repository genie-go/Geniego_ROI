# DSAR — Authorization Twin Revalidation (Part 3-22 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_TWIN_REVALIDATION은 **트윈이 표상하는 인가 상태가 여전히 유효한지 재검증**하는 계약이다. 트윈은 시점 t의 정책·역할·런타임을 스냅샷하지만, substrate가 변경되면 그 스냅샷은 즉시 낡는다(stale). Revalidation은 "언제 트윈을 다시 검증할 것인가"를 규정하는 트리거·절차 계약이다.

Revalidation 트리거 5종(변경 이벤트 유형):
- **Policy 변경** — 정책 규칙·권한 매핑 수정.
- **Runtime 변경** — 실행시 결정 경로·게이트 변경.
- **AI Model 변경** — 예측 governance를 구동하는 모델/규칙 교체.
- **Compliance 변경** — 규제·인증 요건 갱신으로 인한 재인증 필요.
- **Federation 변경** — 외부 identity/역할 연합 소스 변동.

각 트리거는 (trigger_type, source_event_ref, triggered_at, revalidation_scope, outcome)로 기록되며, 트리거 발생 시 트윈은 부분 또는 전체 재검증을 수행하고 결과를 §24 Reconciliation에 연결한다.

## 2. Substrate 매핑

| SPEC 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 변경 이벤트 원천(트리거 감지 소스) | `SecurityAudit.php:27` 인가/변경 이벤트 기록 | 존재(원천만) |
| 재검증 결과 봉인 | `SecurityAudit.php:56-67` 해시체인 | 존재(봉인 substrate) |
| Twin 상태 스냅샷(재검증 대상) | — | **ABSENT (grep 0)** |
| 트리거 라우터·revalidation_scope 계산기 | — | **ABSENT (grep 0)** |
| Policy/Runtime/AI/Compliance/Federation 변경 구독기 | — | **ABSENT (grep 0)** |

## 3. 설계 계약

- **감지(Detect)**: 5종 변경 이벤트를 `SecurityAudit.php:27` 이벤트 스트림에서 구독한다. 변경은 이미 감사에 남으므로 이를 유일 트리거 원천으로 삼는다(별도 변경 로그 신설 금지).
- **범위(Scope)**: 변경 유형별로 revalidation_scope를 결정 — Policy/Runtime은 영향 principal 부분집합, AI Model/Compliance는 전체, Federation은 연합 경계 principal.
- **재검증(Revalidate)**: 트윈 스냅샷을 대상으로 현행 substrate와 재대조. 유효하면 재봉인, 무효하면 §24 Reconciliation 호출.
- **봉인(Seal)**: 재검증 outcome을 `SecurityAudit.php:56-67` 해시체인에 append. 재검증 여부·시점·결과가 tamper-evident 이력으로 남아야 한다.
- **비파괴**: 기존 감사 이벤트 소비만 추가하며 원천 기록 형식은 변경하지 않는다(무후퇴).

## 4. KEEP_SEPARATE

- **정산 재검증/재대조**(`PgSettlement.php:294-295`·`Connectors.php:896-902`·`KrChannel.php:415-419`) — 금액·주문·채널 정합 재검증. 인가 상태 유효성 재검증과 도메인 무관. 흡수 금지.
- **ML 모델 재평가**(`ModelMonitor.php:42-43`) — 모델 성능 재측정. 인가 트윈 재검증 트리거의 AI Model 변경과 이름은 겹치나, 전자는 모델 정확도, 후자는 인가 결정 유효성 재확인이다. 별개 유지.

## 5. 판정

**ABSENT** · BLOCKED_PREREQUISITE. Twin 스냅샷·트리거 구독기·revalidation_scope 계산기 전부 부재. 변경 이벤트 원천은 `SecurityAudit.php:27`에 존재하나 이는 재검증 절차가 아닌 원천 로그일 뿐이다. §22 Drift·§24 Reconciliation 선행 부재로 착수 불가. 순신설 · 코드 변경 0 · NOT_CERTIFIED.
