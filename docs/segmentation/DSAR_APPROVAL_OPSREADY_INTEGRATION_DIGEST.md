# DSAR — Approval Ops-Ready Integration Digest (Part 3-25 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20)

`APPROVAL_INTEGRATION_DIGEST`는 §18 Snapshot·§19 Evidence·§21 Analytics를 **단일 요약 지문(digest)으로 축약·봉인**하여 통합 승인 결정의 최종 참조 아티팩트를 만드는 레코드다. Digest는 입력 아티팩트들의 해시를 결합한 결정 지문으로서, 승인 게이트가 "이 지문 하나로 전체 통합 준비를 대표"하도록 한다. 입력:

- **Integration** — 통합 실행 결과 지문.
- **Snapshot** (§18) — 봉인된 운영 준비 스냅샷 ID/해시.
- **Evidence** (§19) — 증거 묶음의 결합 해시.
- **Analytics** (§21) — 운영 준비 지표 요약.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | 상태 |
|---|---|---|
| Digest 결합 지문 레코드 | 없음 (grep 0) | **ABSENT** — greenfield |
| 해시 결합/봉인 참고 | `SecurityAudit.php:35-45`(해시 산출 로직) | 참고만 |
| Snapshot 입력 | §18 (ABSENT) | 선행 부재 |
| Evidence 입력 | §19 (PARTIAL) | 선행 부재 |

Digest 자료구조는 코드베이스에 존재하지 않는다(ABSENT). 유일한 인접 참고는 `SecurityAudit.php:35-45`의 해시 산출 방식이며, 이는 감사 체인용 해시일 뿐 integration digest 결합 로직이 아니다(참고만·치환 금지).

## 3. 설계 계약

1. **결합 결정성**: Digest는 Snapshot·Evidence·Analytics의 개별 해시를 정해진 순서로 결합한 결정론적 지문. 해시 산출 방식은 `SecurityAudit.php:35-45`를 **참고 규약**으로 정렬한다(동일 알고리즘 계열로 일관).
2. **선행 의존**: Digest는 §18·§19·§21이 모두 봉인/집계된 후에만 생성 가능. 선행 ABSENT/PARTIAL 상태에서는 BLOCKED_PREREQUISITE.
3. **대표성**: 승인 게이트는 Digest 단일 값으로 통합 준비 전체를 인증하되, 입력 어느 하나라도 verify 실패 시 Digest 미생성(fail-closed).
4. **불변**: 생성된 Digest는 수정 불가·재계산 시 동일 값 재현 가능해야 한다.

## 4. KEEP_SEPARATE

- `SecurityAudit.php:35-45`의 해시 로직은 감사 체인 무결성 원용도를 유지한다. Digest는 이를 **알고리즘 참고**로만 원용하고 감사 해시 저장소를 digest 저장소로 겸용하지 않는다.

## 5. 판정

**ABSENT** (digest 없음). Snapshot/Evidence/Analytics 입력을 결합하는 digest 자료구조는 순신설이며, `SecurityAudit.php:35-45` 해시 산출은 참고 규약으로만 원용한다. 선행(§18·§19·§21) 미완으로 BLOCKED_PREREQUISITE. 코드 변경 0 · NOT_CERTIFIED.
