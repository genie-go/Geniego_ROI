# DSAR — AI-Assisted Recovery Advisor (Part 3-20 §14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14 — AI-Assisted Recovery Advisor)

AI-Assisted Recovery Advisor는 인가 상태 이상·손상에 대해 **복구 계획(plan)을 제안**하는 자문기다. LLM 추론을 근거로 복구 전략·롤백 지점·영향·소요·위험을 산출하되, **집행권은 갖지 않는다** — 모든 제안은 사람 승인(§16) 또는 정책 게이트를 거쳐야만 반영된다.

| 산출물 | 정의 | 계약 |
|--------|------|------|
| Recovery Strategy | 이탈 유형별 권장 복구 경로(후보 N개) | 근거·대안 명시·자동집행 금지 |
| Rollback Point | 안전 복원 기준선 후보(스냅샷 참조) | 후보 제안일 뿐 롤백 실행은 §17 |
| Impact Analysis | 복구 시 영향받는 주체·권한·세션 범위 | 정성/정량 추정·불확실성 표기 |
| Estimated Recovery Time | 복구 소요 추정 | 추정치·신뢰구간(Explainable) |
| Risk Assessment | 복구 실행/미실행 위험 등급 | 근거 제시·근거 없는 결론 금지 |

핵심 원칙(V4 Explainable AI 준수): **AI는 plan만 생성, 자동승인·자동집행 절대 금지**. 모든 제안에 근거·신뢰도를 표기하고, 근거 없는 결론을 내지 않는다. 승인·집행은 별도 게이트의 책임이다.

## 2. Substrate 매핑

| SPEC 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| recovery advisor 로직(전략/롤백지점/영향/소요/위험) | 없음 (grep 0) | **ABSENT** |
| LLM 추론 인프라(참조) | ClaudeAI 진입/호출 표면(`ClaudeAI.php:18`·`:21`·`:46`·`:61`·`:70`·`:82`) | 재사용(추론 엔진만·advice 로직 없음) |
| 제안 기록 무결성(참조) | SecurityAudit append-only(`SecurityAudit.php:14-68`)·verify(`SecurityAudit.php:56-68`) | 재사용(plan 근거 앵커) |

## 3. 설계 계약

- Recovery Advisor는 **순신설**. `ClaudeAI.php:70`·`:82` LLM 호출 표면을 **인프라로만** 재사용하고, 그 위에 authz recovery 전용 프롬프트/스키마/가드레일을 신설한다(현행에 recovery advice 로직 없음).
- **집행 분리 불변식**: Advisor 출력은 항상 `advisory` 상태로만 존재한다. Rollback Point는 후보 제안일 뿐 실행은 §17, 승인은 §16의 책임이다. Advisor 경로에서 직접 정책·권한을 바꾸는 것을 설계상 금지.
- **Explainable 필수**: 모든 산출물에 근거·신뢰도·대안을 포함하고, 입력 데이터가 §9/§10 consistency 판정에서 신뢰 불가로 나오면 advice 자체를 BLOCKED로 표기한다(근거 없는 제안 금지).
- 제안·근거·모델 버전은 `SecurityAudit.php:14-68` 체인에 기록하고 `SecurityAudit.php:56-68` verify로 재현 가능하게 한다.

## 4. KEEP_SEPARATE (흡수 금지)

- ★**마케팅 anomaly hint** `ClaudeAI.php:3692`(·인접 `:3737`·`:3753`)는 캠페인/광고 이상 자문으로, 인가 상태 recovery advice와 **도메인이 다르다**. authz Recovery Advisor로 통합 금지 — 프롬프트/데이터/책임이 전혀 다른 별개 관심사다.
- **정산/재고** `PgSettlement.php:215`·`Wms.php:2160`는 LLM 자문 대상과 무관. 별개 유지.

## 5. 판정

**ABSENT** — recovery advisor 로직은 grep 0으로 전무하다(전략/롤백지점/영향/소요/위험 산출 부재). 유일 기반은 ClaudeAI LLM 인프라(`ClaudeAI.php:18`·`:70`·`:82`)뿐이며 recovery advice 로직은 없다. Advisor는 **순신설**·집행권 0·Explainable 강제이며, 마케팅 anomaly hint(`ClaudeAI.php:3692`)와 엄격 분리한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §9/§10 신뢰 입력·§16 승인·§17 롤백 계약 부재).
