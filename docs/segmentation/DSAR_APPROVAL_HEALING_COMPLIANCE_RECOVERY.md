# DSAR — Compliance Recovery Engine (Part 3-20 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §13 — Compliance Recovery Engine)

Compliance Recovery Engine은 인가 거버넌스의 **컴플라이언스 태세(compliance posture)** 가 이탈했을 때, 감사 준비도(audit readiness)를 다시 확보하도록 5종 결함을 탐지→복구하는 엔진이다. 데이터를 위조하지 않고, 결손된 절차·증거·매핑을 **정상 절차로 재수행**하도록 유도한다.

| 복구 대상 | 정의 | 복구 계약 |
|-----------|------|-----------|
| Missing Evidence | 통제 요구 증거(로그/승인/리뷰) 부재 | 원천 재수집·미확보 시 gap 티켓·증거 위조 금지 |
| Expired Review | 접근 검토(access review) 유효기한 경과 | 재검토(re-certification) 워크플로우 트리거 |
| Failed Assessment | readiness 평가가 미달(fail) 상태 고착 | 미달 항목 remediation 계획·재평가 |
| Broken Control Mapping | 통제↔증거/정책 매핑 단절 | 매핑 SoT 대비 재정합·dangling 제거 |
| Audit Readiness | 종합 감사 준비도 저하 | 결손 집계·READY 복원 경로 산출 |

핵심 원칙: **복구는 절차 재수행이지 증거 생성이 아니다**. Missing Evidence는 원천에서 재수집하며, 재수집 불가 시 위조 대신 gap을 명시적으로 기록한다. 위험 복구는 승인 게이트를 통과한다(Fail-closed).

## 2. Substrate 매핑

| SPEC 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| compliance recovery 엔진 | 없음 (grep 0) | **ABSENT** |
| Readiness 평가 기반(참조) | Compliance readiness 산출(`Compliance.php:53`·`:120`)·DSAR 경로(`Compliance.php:50`·`:124`) | 재사용(평가 입력·gap 판정) |
| Review 주기·증거 표면(참조) | AccessReview 스냅샷/리뷰(`AccessReview.php:141-171`·`:180-242`·재인증 `AccessReview.php:225-233`) | 재사용(Expired Review 재검토) |
| 증거 무결성(참조) | SecurityAudit 증거 append(`SecurityAudit.php:14-68`)·verify(`SecurityAudit.php:56-68`) | 재사용(evidence 앵커) |

## 3. 설계 계약

- Compliance Recovery Engine은 **순신설**. Detector(결손 탐지)–Recovery Plan(절차 재수행 계획)–Executor(트리거)–Audit 4단으로 분리하며, Executor는 승인 필요 등급을 §16 승인 게이트로 라우팅한다.
- **Missing Evidence 복구=재수집**: 원천 로그/승인/리뷰를 재조회해 채운다. 재수집 실패는 gap 레코드로 남기고 READY로 위장하지 않는다(증거 위조 절대 금지).
- **Expired Review 복구**는 AccessReview 재인증 흐름(`AccessReview.php:225-233`)을 트리거로 재사용하고, Failed Assessment는 Compliance readiness(`Compliance.php:120`) 미달 항목을 remediation 대상으로 삼는다.
- 모든 복구 결정·근거는 `SecurityAudit.php:14-68` 체인에 기록하고, 감사 재현은 `SecurityAudit.php:56-68` verify로 검증한다.

## 4. KEEP_SEPARATE (흡수 금지)

- **DSAR/컴플라이언스 데이터 응답** `Compliance.php:50`·`:124`는 개인정보 주체 요청 처리로, 그 자체는 authz recovery 집행이 아니라 **입력 표면**이다. 복구 엔진이 DSAR 처리 로직을 삼키지 않는다.
- **정산/재고 계층** `PgSettlement.php:215`·`Wms.php:2160`는 컴플라이언스 증거원과 무관한 도메인. 별개 유지.

## 5. 판정

**ABSENT** — compliance recovery 도메인은 grep 0으로 전무하다. Missing Evidence/Expired Review/Failed Assessment/Broken Control Mapping/Audit Readiness 복구는 모두 **순신설**이며, 평가 기반(`Compliance.php:53`·`:120`)·리뷰 재인증(`AccessReview.php:141-171`·`:225-233`)·증거 무결성(`SecurityAudit.php:14-68`)만 재사용한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §16 승인 게이트·통제 매핑 SoT 부재).
