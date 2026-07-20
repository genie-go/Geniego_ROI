# DSAR — APPROVAL_TWIN_DIGEST (Part 3-22 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20)

`APPROVAL_TWIN_DIGEST`는 권한 승인 트윈의 상태·예측·증거·분석을 **단일 요약 다이제스트로 압축한 결정론적 파생 레코드**다. 트윈이 방대한 스냅샷·증거를 매번 완전 재계산하지 않고, 무결성 검증·빠른 조회·상위 리포팅에 쓸 수 있는 고정 길이 요약을 제공한다. 계약 입력:

- `twin_state` — 현재 트윈 상태(§18 substrate).
- `snapshot` — 봉인된 스냅샷 참조(§18).
- `prediction` — 예측 결과(§21 분석 입력).
- `evidence` — 재생·검증 증거(§19).
- `analytics` — 집계 분석 지표(§21).

다이제스트는 위 다섯 입력의 결정론적 해시 요약이며, 입력 불변 시 동일 다이제스트를 산출(재현성)해야 한다.

## 2. Substrate 매핑

| 계약 입력 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Digest 산출기 | 없음(트윈 다이제스트 부재) | — | ABSENT |
| 해시 요약 참고 패턴 | SecurityAudit 다이제스트/해시 산출부 | `SecurityAudit.php:48-52` | 참고만(패턴 참조) |
| twin_state 입력 | ABSENT(§18) | — | ABSENT |
| snapshot 입력 | ABSENT(§18) | — | ABSENT |
| prediction 입력 | ABSENT(§21) | — | ABSENT |
| evidence 입력 | PARTIAL(§19 substrate) | — | 상위 참조 |
| analytics 입력 | ABSENT(§21) | — | ABSENT |

grep 결과 트윈 다이제스트 산출기는 **전무(ABSENT)**하다. 유일한 참고는 SecurityAudit의 해시 요약 산출 패턴(`SecurityAudit.php:48-52`)이며, 이는 **참고만** 할 뿐(체인 무결성용 다이제스트) twin digest 계약을 충족하지 않는다 — 흡수·재사용이 아니라 산출 패턴의 선례로만 인용한다.

## 3. 설계 계약

1. **Digest는 순신설**한다 — twin_state·snapshot·prediction·evidence·analytics 다섯 입력을 결정론적으로 해시 요약하는 산출기를 신규 설계한다.
2. `SecurityAudit.php:48-52`의 해시 요약 산출은 **패턴 참고**로만 인용(동일 함수 재사용 아님·중복 다이제스트 엔진 신설 금지 원칙에 따라 트윈 도메인 전용 산출기를 1개만 둔다).
3. 다이제스트는 §18 snapshot·§19 evidence의 무결성 체인 다이제스트와 **정렬**되어 상호 대조 가능해야 한다.
4. 입력 5종 중 4종(twin_state·snapshot·prediction·analytics)이 ABSENT이므로 digest 자체가 **BLOCKED_PREREQUISITE**.

## 4. KEEP_SEPARATE

- SecurityAudit 체인 다이제스트(`SecurityAudit.php:48-52`)는 감사 로그 무결성용으로, twin digest(트윈 상태 요약)와 목적이 상이 — 통합 금지, 산출 패턴 참고만.

## 5. 판정

**ABSENT**(digest 없음). SecurityAudit 해시 요약(`SecurityAudit.php:48-52`)은 산출 패턴 **참고만**이며 흡수 대상 아님. 입력 5종 대부분(twin_state·snapshot·prediction·analytics) ABSENT으로 다이제스트는 순신설·**BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
