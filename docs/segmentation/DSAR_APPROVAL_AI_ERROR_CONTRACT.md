# DSAR — Authorization AI Governance: AI Error Contract (Part 3-15 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §30은 authz AI 거버넌스 경로가 반환하는 결정론적 오류코드 7종(fail-closed)을 규정한다.

| 코드 | 발생 조건 | 매핑 |
|---|---|---|
| AI_MODEL_NOT_FOUND | 요청 model_version 미존재/미배포 | Runtime Guard §28 G-1 |
| AI_MODEL_DEPRECATED | 폐기 모델 버전 사용 | Static Lint §29 L-5·Warning §31 |
| AI_CONFIDENCE_TOO_LOW | Confidence Score(§18) 임계 미달 | Human Approval §19 |
| AI_RECOMMENDATION_REJECTED | 추천이 승인 게이트에서 반려 | Human Approval §19 |
| AI_DATASET_INVALID | 학습 데이터셋 무결성/품질 실패 | Feature Store §4·Guard §28 G-3 |
| AI_FEATURE_MISSING | 필수 Feature 결측 | Feature Store §4 |
| AI_GOVERNANCE_BLOCKED | Governance Rule 위반 자동변경 차단 | Autonomous §20·Human Approval §19 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 코드군 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz AI Error Contract 전체 | **ABSENT(순신규)** | authz AI 추천/예측 엔진 자체 부재(GT② §2·GT① §3) → 오류코드 표면 없음 |
| MODEL_NOT_FOUND/DEPRECATED substrate | **PARTIAL(패턴)** | `Db.php:448-456` risk_model_registry(is_deployed)·`Risk.php:149-152` 배포모델 조회 패턴(★마케팅 fraud·KEEP_SEPARATE) — GT① §D |
| DATASET_INVALID/FEATURE_MISSING substrate | **PARTIAL(패턴·미배선)** | `DataPlatform.php:231-346` 데이터 quality/신뢰 게이트(**ML feature store 아님**·소비=마케팅) — GT① §C |
| RECOMMENDATION_REJECTED/GOVERNANCE_BLOCKED substrate | **PARTIAL(maker-checker)** | `Mapping.php:238-294`(approve·반려)·`Alerting.php:601-608`·`AccessReview.php:177-242`(justification 결정) — GT① §B·AI 미배선 |
| CONFIDENCE_TOO_LOW | **ABSENT** | AI Confidence(§18) authz 미존재(GT② §2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **E-1 fail-closed**: 모든 오류는 authz 변경을 **차단**(허용 아님). AI_GOVERNANCE_BLOCKED가 최종 안전망(SPEC §20 자동수행 불가 대상).
- **E-2 결정론적 매핑**: 각 코드는 단일 원인에 매핑(중복·모호 금지). Runtime Guard(§28)·Static Lint(§29)·Human Approval(§19) 위반이 각 코드로 정규화.
- **E-3 Evidence 동반**: 오류 반환 시 SecurityAudit(`AccessReview.php:225` 패턴) 기록·사유 첨부(ADR D-5).
- **E-4 Confidence 게이트**: AI_CONFIDENCE_TOO_LOW는 §18 등급(Human Review Required)과 연동·Human Approval로 승격.
- **E-5 모델 상태**: AI_MODEL_NOT_FOUND/DEPRECATED는 불변 Model Version 저장(§33) 상태 조회로 판정(현행 가변 레지스트리 `Db.php:448-456` 불변강제 신설 후).

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- `Risk.php:81`·`:118`·`:175`(is_deployed 조회·model_version 스탬핑)은 **공급망 fraud 마케팅 도메인** — 버전 조회 패턴만 참고, 오류코드 흡수 금지(GT① §D·ADR D-7).
- `DataPlatform.php:231-346` quality 게이트의 소비자는 마케팅 — DATASET_INVALID 판정 로직 재배선 시 authz feature/dataset 대상으로 신설(흡수 아님).
- ClaudeAI 마케팅 프롬프트(`ClaudeAI.php:648-838`·`:839-955`)의 오류는 authz AI Error Contract 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**AI Error Contract = ABSENT(순신규).** 재활용(재배선): 모델 버전 조회 패턴(`Db.php:448-456`·`Risk.php:149-152`)·DataPlatform quality(`:231-346`)·maker-checker 반려(`Mapping.php:238-294`·`AccessReview.php:177-242`)를 authz AI 오류 판정에 배선. CONFIDENCE_TOO_LOW는 Confidence 엔진 신설(ADR D-4) 후 유효 → 선행의존. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
