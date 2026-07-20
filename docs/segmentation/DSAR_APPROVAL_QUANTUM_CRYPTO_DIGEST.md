# DSAR — Approval Crypto Digest (Part 3-23 §19)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19)

`APPROVAL_CRYPTO_DIGEST`는 여러 crypto artifact를 하나의 결정적(deterministic) 요약 다이제스트로 축약하는 계약이다. Inventory·Snapshot(§17)·Evidence(§18)·Analytics(§20)를 입력으로 받아 단일 고정 길이 digest를 산출해, 상위 승인·비교·감사가 개별 원본을 재순회하지 않고 digest 하나로 상태 동일성을 판정하게 한다.

| 입력 | 계약 내용 |
|------|-----------|
| Inventory | 알고리즘·키 자산 카탈로그 |
| Snapshot (§17) | as-of 시점 crypto 상태 봉인 |
| Evidence (§18) | migration/compliance/risk 증거 이력 |
| Analytics (§20) | PQC coverage·readiness 지표 집계 |

산출물 계약: `digest_value`(결정적 해시), `input_refs[]`(4개 입력 포인터), `computed_ts`, `digest_algo`. 동일 입력→동일 digest(순수 함수). digest는 그 자체로 원본이 아니라 원본들의 fingerprint다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| 결정적 요약 산출 | 없음 (crypto digest 부재) | ABSENT |
| 해시 산출 관례 참고 | SHA-256 payload 해시 관례 (`SecurityAudit.php:43-53`) | 참고만 |
| 입력 원본(Snapshot/Evidence/Analytics) | §17/§18 PARTIAL·§20 ABSENT | 미충족 |

crypto digest는 grep 0 — greenfield ABSENT. `SecurityAudit.php:43-53`은 해시 산출·검증 관례의 **참고**일 뿐이며 digest 생성기가 아니다(체인 verify ≠ multi-artifact digest). digest는 4개 입력이 선행 확정돼야 의미를 가지므로, §17 PARTIAL·§18 PARTIAL·§20 ABSENT 상태에서는 입력이 미비하다.

## 3. 설계 계약

1. **순수·결정적**: digest는 입력만의 함수 — 부수효과 0, 동일 입력 동일 출력. `Crypto.php`·`SecurityAudit.php` 상태를 읽거나 바꾸지 않는다.
2. **입력 포인터만 보유**: digest는 원본을 복제하지 않고 `input_refs[]`로 참조 — Snapshot/Evidence는 각자의 immutable 체인에 이미 봉인되어 있다.
3. **해시 관례 일치**: digest_algo는 프로젝트 표준 SHA-256(`SecurityAudit.php:43-53` 관례) 정렬 — 단, verify 체인에 append하지 않는 독립 산출물.
4. **선행 의존**: §17·§18·§20 확정 전에는 부분 digest(입력 결여 표기)만 가능. 순신설.

## 4. KEEP_SEPARATE

- ML 모델 digest/서명(`ModelMonitor.php:18-19`)은 crypto digest와 별개 — 흡수 금지.
- 정산 요약(`PgSettlement.php`·`Wms.php:2160`)은 재무 다이제스트로 분리.

## 5. 판정

**ABSENT** — crypto digest 부재(grep 0), 순신설. `SecurityAudit.php:43-53` 해시 관례는 참고만이며 재사용 substrate 아님. 4개 입력(§17/§18/§20)이 선행이므로 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
