# DSAR — 운영 승인 (APPROVAL_OPERATIONAL_SIGNOFF) (Part 3-25 §2·§19)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§19 Operational Sign-off)
**운영 승인(Operational Sign-off)**은 릴리스 후보를 운영 환경에 최종 반영하기 직전, 권한 있는 승인자가 maker-checker 분리 하에 명시적 결재를 남기는 행위다. 계약:
- **직무분리(maker≠checker)**: 요청 주체와 승인 주체는 동일인일 수 없다.
- **정당화(justification)**: 승인은 사유 텍스트를 필수 첨부하며, 근거 없는 승인은 거부.
- **불변 증거**: 결재 사실(주체·시각·사유)은 append-only 증거로 봉인.
- **범위**: 개별 오퍼레이션 승인 substrate를 릴리스/운영 sign-off 계층으로 확장.

## 2. Substrate 매핑
| 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| maker-checker 결재 흐름 | `Mapping.php:238-291`,`:287` · `Alerting.php:601-656`,`:642-650` | PARTIAL |
| 승인 정당화(justification) | `AccessReview.php:177-243`,`:193` | PARTIAL |
| 결재 증거 봉인 | `AccessReview.php:220-238` · `SecurityAudit.php:60-64` | PARTIAL |
| 릴리스/운영 sign-off 계층 | (전용 계층 grep 0) | ABSENT |

## 3. 설계 계약
1. **직무분리 강제**: `Mapping.php:238-291`(승인 요청/처리 이원화)·`Alerting.php:601-656`의 checker 경로(`:642-650`)를 운영 sign-off 결재 게이트로 승격. maker 식별자와 checker 식별자 동일 시 거부.
2. **정당화 필수화**: `AccessReview.php:177-243`의 justification 요구(`:193`)를 sign-off 필수 필드로 채택 — 사유 공란 승인 불가.
3. **증거 앵커**: 결재 이벤트는 `AccessReview.php:220-238` 증거 기록 및 `SecurityAudit.php:60-64` append-only 체인에 이중 봉인.
4. **확장 원칙**: 기존 승인 substrate를 재구현하지 않고 운영/릴리스 도메인으로 어댑트(무후퇴).

## 4. 판정
**PARTIAL** — maker-checker(`Mapping.php:238-291`·`:287`, `Alerting.php:642-650`), justification(`AccessReview.php:177-243`·`:193`), 증거 봉인(`AccessReview.php:220-238`)이 개별 오퍼레이션 승인 substrate로 실재한다. 그러나 이를 릴리스/운영 sign-off 단일 계층으로 통합하는 오케스트레이션은 부재 — 확장 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
