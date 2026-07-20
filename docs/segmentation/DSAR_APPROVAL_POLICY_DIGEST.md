# DSAR — PDP/PEP Governance: 결정 다이제스트 (APPROVAL_POLICY_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_POLICY_DIGEST(SPEC §16·§24)는 **하나의 결정을 구성하는 4개 원자료를 하나의 무결성 다이제스트로 봉인**하는 엔티티다. SPEC §24가 명시한 입력은 4종이다.

| 입력 | SPEC 근거 | 의미 |
|---|---|---|
| Request | §24·§3 | 접근 요청 원본 |
| Decision | §24·§9 | 산출 결정 |
| Snapshot | §24·§22 | 결정 시점 불변 스냅샷(APPROVAL_POLICY_SNAPSHOT) |
| Evidence | §24·§23 | 결정 도출 추적(APPROVAL_POLICY_EVIDENCE) |

Digest는 4입력을 결합해 결정 단위의 **tamper-evident 봉인 해시**를 만든다 — Snapshot·Evidence 변조 시 Digest 불일치로 검출.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Digest 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| 무결성 해시체인(봉인 기반) | **PARTIAL** | SecurityAudit 해시체인 append-only+verify(`SecurityAudit.php:12-53`·`:56-68`) — tamper-evident digest 기반 재활용 (GT① §G, GT② §2·§3-6) |
| Request 입력 | **ABSENT** | 요청 원본 결정단위 저장 부재(APPROVAL_POLICY_SNAPSHOT §2 참조·GT② §2) |
| Decision 입력 | **PARTIAL** | Decision Types 실집행(`UserAuth.php:929-964`·`:1128`)이나 통합 결정값 미봉인 (GT① §F) |
| Snapshot 입력 | **PARTIAL** | Snapshot substrate = SecurityAudit/auth_audit_log 문자열 detail(`UserAuth.php:4174`) — 결정 스냅샷 전용 아님 (GT① §G) |
| Evidence 입력 | **PARTIAL** | Evidence substrate = SecurityAudit(`SecurityAudit.php:12-68`)·rule/scope trace 미기록 (GT① §G, GT② §2) |
| 4입력 결합 Digest | **ABSENT** | Request+Decision+Snapshot+Evidence를 결정단위로 결합·봉인하는 authz Digest 생성기 부재 (GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **입력 완결성**: Digest는 {Request, Decision, Snapshot, Evidence} 4입력 전부를 결합(SPEC §24). 어느 하나 결측이면 Digest 무효.
- **불변버전·무결성**: Digest는 §30 Immutable Decision Snapshot·Bundle/Package Integrity 제약 하에 SecurityAudit 해시체인(`SecurityAudit.php:12-53`)의 append-only 봉인 위에 신설(ADR D-5). verify(`:56-68`)로 사후 검증.
- **연쇄 무결성**: Snapshot(APPROVAL_POLICY_SNAPSHOT)·Evidence(APPROVAL_POLICY_EVIDENCE)가 각각 불변이어야 Digest가 유효 — 세 엔티티는 무결성 체인으로 결합.
- **테넌트 격리**: §30 Tenant Isolation — Digest는 `X-Tenant-Id`(`index.php:619`) 경계 내. 교차 테넌트 봉인 금지.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- 마케팅/ops의 무결성 캐시·정산 대사(`Connectors.php:902` ROAS reconcil·`routes.php:655` PgSettlement·`Wms.php:2160`·`KrChannel.php:419`)는 결정 대사이지 authz Digest 아님(GT② §5 C-3). 흡수 금지.
- `attribution_model_cache`(마케팅)·`ModelMonitor.php:220-335`(ML)도 authz Digest 아님(GT② §C-3·C-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(SecurityAudit 봉인 재활용)**. 무결성 해시체인 기반은 **재활용**(`SecurityAudit.php:12-68`)이나 Request/Decision/Snapshot/Evidence 4입력 결합 Digest 생성기는 **ABSENT**(순신규). Snapshot·Evidence 입력 자체가 PARTIAL이므로 Digest도 그 확장에 의존.
- **재활용**: `SecurityAudit.php:12-53`(append-only)·`:56-68`(verify) — Snapshot·Evidence DSAR과 동일 무결성 기반 공유.
- **선행 의존**: Digest는 APPROVAL_POLICY_SNAPSHOT·APPROVAL_POLICY_EVIDENCE 확장 완료 + 중앙 PDP(`TeamPermissions.php:393-421` 승격) 배선 후 성립 — **BLOCKED_PREREQUISITE**. 코드 변경 0·NOT_CERTIFIED.
