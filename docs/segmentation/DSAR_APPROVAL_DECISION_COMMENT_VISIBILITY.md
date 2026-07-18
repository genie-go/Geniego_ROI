# DSAR — Approval Decision Comment Visibility (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§40 COMMENT_VISIBILITY enum (원문 전사):
`INTERNAL_RESTRICTED` / `APPROVAL_PARTICIPANTS` / `REQUESTER_VISIBLE` / `SUBMITTER_VISIBLE` / `RESOURCE_OWNER_VISIBLE` / `AUDITOR_ONLY` / `LEGAL_ONLY` / `COMPLIANCE_ONLY` / `SYSTEM_ONLY` / `CUSTOM`.

★ 민감 내부 Comment를 요청자에게 자동 노출 금지.

## 2. 기존 구현 대조

- 코멘트 가시성 구분(내부/외부/참여자/감사자/법무/컴플라이언스 스코프)을 선언·강제하는 자산 → **no hits**.
- 실존 코멘트(Mapping note·`AdminGrowth.php:1330` 부수 텍스트)는 **가시성 축이 전무** — internal/external 구분 없이 저장되며, 조회 주체별 필터 없음.
- `AUDITOR_ONLY`/`LEGAL_ONLY`/`COMPLIANCE_ONLY` 스코프 → 부재. 감사 접근은 SecurityAudit 체인(`Handlers/SecurityAudit.php:56,64`)에 존재하나 이는 감사 로그 검증이지 코멘트 가시성 게이트가 아님.
- 테넌트 격리(`index.php:404-420`)는 실재하나 이는 테넌트 경계이지 테넌트 **내부** 역할별 코멘트 가시성이 아님.
- 결과: 결정 코멘트에 민감 내용을 적으면 요청자/제출자에게 무제한 노출될 수 있는 상태(§58 민감노출 리스크).

## 3. 판정

- Verdict: **ABSENT** (internal/external 구분 없음)
- 선행 의존: §39 Comment(PARTIAL — Visibility는 Comment의 필드 도메인) · §3.6 Identity/Security(PRESENT — 역할·주체 해석 기반은 존재) · §3.4 Authority/Delegation(ABSENT — 역할별 스코프 세분화 선행 부재) → 부분 선행 존재하나 코멘트 결합은 BLOCKED_PREREQUISITE.
- cover: **0** (10종 enum 중 실존 0).

## 4. 확장/구현 방향 (설계)

- 순신규: 10종 VISIBILITY를 §39 Comment의 `visibility` 제약 enum으로 선언. 코멘트 조회 API가 `visibility` × 조회 주체 역할을 매칭해 필터링.
- 재사용 기반: §3.6 Identity(Tenant Guard `index.php:404-420` · `Alerting.php:580-582`)의 주체·역할 해석을 가시성 게이트 입력으로 확장(신규 인증 엔진 X). 단, 역할 세분화(AUDITOR/LEGAL/COMPLIANCE)는 §3.4 Authority(ABSENT) 축 구축 후 완성.
- ★핵심 불변식: 기본값 = `INTERNAL_RESTRICTED`(안전측 기본). `REQUESTER_VISIBLE`/`SUBMITTER_VISIBLE`은 명시 승격만 허용 — 민감 내부 코멘트가 요청자에게 **자동** 노출되는 것 금지(§40 ★).
- `LEGAL_ONLY`/`COMPLIANCE_ONLY`는 §41 Comment Policy의 `legal privilege classification`과 결합 — 법적 특권 코멘트의 노출 경계 통제.
- 초기 최소 구현: `INTERNAL_RESTRICTED`/`APPROVAL_PARTICIPANTS`/`REQUESTER_VISIBLE` 3종만으로 가장 위험한 자동노출 우선 차단, 나머지는 Authority 축 완성 후 점증.
- 실위험: 가시성 없이 코멘트를 단일 텍스트로 저장·조회하면 내부 심사 의견(거절 근거·리스크 판단)이 외부 주체에 노출 — §58 Critical Gap(Comment Visibility·민감노출).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
