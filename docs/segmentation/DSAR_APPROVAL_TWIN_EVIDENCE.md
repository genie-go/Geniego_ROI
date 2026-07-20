# DSAR — APPROVAL_TWIN_EVIDENCE (Part 3-22 §19·§30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19·§30 Immutable Replay History)

`APPROVAL_TWIN_EVIDENCE`는 권한 승인 트윈이 수행한 **예측·재생(replay)·시뮬레이션의 증거 레코드**로, 각 트윈 판단이 "왜·무엇을 근거로" 산출되었는지 사후 재현·감사할 수 있게 한다. 계약 필드:

- `replay` — 과거 권한 상태를 트윈에서 재생한 실행 기록(입력 스냅샷·재생 궤적).
- `prediction_evidence` — 예측 결과를 뒷받침하는 특징·가중치·입력 근거의 봉인.
- `ai_explanation` — 예측/추천에 대한 설명가능성(XAI) 근거 텍스트.
- `scenario` — 증거가 귀속된 what-if 시나리오 식별자.
- `validation_result` — 예측이 실제 승인 결과와 대조된 검증 판정(적중/이탈).

§30 Immutable Replay History 계약: 증거는 append-only·위변조 검증 가능해야 하며, 재생 이력은 소급 삭제·수정 불가다.

## 2. Substrate 매핑

| 계약 요소 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Immutable 증거 체인 | SecurityAudit 해시 체인 append·verify | `SecurityAudit.php:27`·`:56-67` | PARTIAL-substrate |
| 2차(부가) 체인 | AdminMenu 감사 체인 경로 | `AdminMenu.php:182-218` | PARTIAL-substrate |
| Replay 이력 | 없음(재생 엔진 부재) | — | ABSENT |
| Prediction Evidence | 없음(예측 엔진 부재) | — | ABSENT |
| AI Explanation | 없음(트윈 XAI 계층 부재) | — | ABSENT |
| Validation Result | 없음(예측-실측 대조 부재) | — | ABSENT |

## 3. 설계 계약

1. **불변 증거 저장은 SecurityAudit 해시 체인을 twin evidence로 확장**한다 — `SecurityAudit.php:27`(체인 앵커)·`:56-67`(append 및 verify 연결)을 재사용해 twin evidence 레코드를 동일 append-only 체인에 귀속시킨다. 별도 증거 DB 신설 금지(중복 체인 금지).
2. **2차 체인**(`AdminMenu.php:182-218`)은 관리 메뉴 감사용 부가 체인으로, twin evidence의 보조 앵커로만 참조(주 무결성원은 SecurityAudit).
3. **Replay·Prediction Evidence·AI Explanation·Validation Result**의 생성 로직은 전부 **순신설**(선행 트윈/예측 엔진 부재).

## 4. KEEP_SEPARATE

- **AI data_snapshot / 설명** — `ClaudeAI.php:474`·`:490`(생성형 AI 데이터 스냅샷·프롬프트 컨텍스트)은 트윈 예측 증거가 아니라 LLM 입력 스냅샷이다. 흡수 금지.
- **ML 모델 모니터링** — `ModelMonitor.php:42-43`은 마케팅 ML 지표로 twin evidence와 도메인 분리.

## 5. 판정

**PARTIAL-substrate**. 불변성 기반(append-only·verify)은 SecurityAudit 해시 체인(`SecurityAudit.php:27`·`:56-67`)과 2차 체인(`AdminMenu.php:182-218`)을 twin evidence로 확장 가능하나, Replay History·Prediction Evidence·AI Explanation·Validation Result의 실제 산출 계층은 전부 순신설이다. 선행 예측/재생 엔진 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
