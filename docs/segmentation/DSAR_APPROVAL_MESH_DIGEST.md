# DSAR — Approval Mesh Digest (Part 3-24 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20)

`APPROVAL_MESH_DIGEST`는 메시의 여러 관측 원천을 하나의 요약 다이제스트로 축약한 파생 산출물이다. 입력·출력 계약:

- **입력**: Mesh(현재 위상) · Snapshot(§18 불변 위상 스냅샷) · Evidence(§19 sync/consensus 증거) · Analytics(§21 집계 지표).
- **출력**: 위 4원천을 결합한 단일 요약 digest — mesh 전반의 건전성·정책 정합·최근 변동을 한 레코드로 압축한다.

digest는 원천 데이터를 대체하지 않으며, 감사·대시보드 소비를 위한 축약 뷰다.

## 2. Substrate 매핑

| SPEC 요구 | 기존 substrate | 상태 | 근거 |
|---|---|---|---|
| Mesh digest 산출 객체 | 없음 (grep 0) | ABSENT-greenfield | 코드/스키마 부재 |
| 입력 Snapshot(§18) | 부재(순신설 대상) | ABSENT | 본 파트 §18 DSAR |
| 입력 Evidence(§19) | SecurityAudit 확장 예정 | PARTIAL(간접) | §19 DSAR |
| 입력 Analytics(§21) | 부재(순신설 대상) | ABSENT | 본 파트 §21 DSAR |
| digest 무결성 참고 | SecurityAudit | 참고만 | `SecurityAudit.php:51` |

## 3. 설계 계약

- Digest 산출기와 그 저장 스키마는 mesh 도메인에 부재하므로 **순신설**한다. 4개 입력원(Mesh/Snapshot/Evidence/Analytics)이 모두 본 파트에서 신설되는 만큼, digest는 그 상위에 얹히는 최종 파생 계층이다.
- digest 자체의 무결성이 필요할 경우 `SecurityAudit.php:51`을 **참고**한다. 단 digest는 파생 요약이므로 원천(Snapshot/Evidence)의 불변 봉인이 1차 신뢰원이며, digest 봉인은 선택적 보강이다.
- digest는 입력 부재 시 생성 불가(BLOCKED_PREREQUISITE) — Snapshot·Evidence·Analytics 계층이 실재해야만 의미 있는 산출이 가능하다.

## 4. KEEP_SEPARATE

- ML 모델 관측(`ModelMonitor.php:18-19`)·정산(`PgSettlement.php`)은 mesh digest 입력이 아님 — 편입 금지.
- digest는 authorization mesh 요약에 한정하며, 타 도메인 요약과 통합하지 않는다.

## 5. 판정

**ABSENT-greenfield**. Mesh digest 산출기·스키마는 grep 0으로 부재(순신설). 무결성은 `SecurityAudit.php:51` 참고만이며 필수 확장 대상이 아니다. 입력 4원천이 모두 신설 대상이므로 최종 파생 계층. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(입력원 부재).
