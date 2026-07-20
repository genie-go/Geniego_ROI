# DSAR — JIT Access Governance: Elevation 다이제스트 (APPROVAL_JIT_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_DIGEST`(SPEC §27)는 elevation 1건의 전체 사실을 **단일 무결성 요약(digest)** 으로 봉인한다. 입력: Request · Approval · Runtime · Snapshot · Evidence · Version(SPEC §27). DB 제약으로 **Digest Validation**(SPEC §33)을 강제한다 — 즉 Request/Approval/Snapshot/Evidence를 합성해 봉인 해시를 만들고, 사후 어느 구성요소도 변조되지 않았음을 단일 검증점으로 보장한다. Snapshot(§25)·Evidence(§26)의 상위 봉인이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §27 다이제스트 입력 | 판정 | 근거(GT 파일:라인) |
|---|---|---|
| Request(요청 원장) | **ABSENT** | GT②§2: JIT Request Registry grep 0 |
| Approval(권한상승 결재) | **ABSENT(권한축)** | GT②§2: 권한상승 결재 경로 0. 마케팅 maker-checker(`Alerting.php:598`)는 KEEP_SEPARATE |
| Runtime | **ABSENT** | GT②§2: Runtime Monitoring 부재 |
| Snapshot | **ABSENT** | GT②§2: session-entitlement 투영 부재(→ APPROVAL_JIT_SNAPSHOT) |
| Evidence(증거) | **PARTIAL(재활용)** | SecurityAudit 불변 체인 `SecurityAudit.php:12-53`·`verify` `:56-68`(GT①§4-F, 무결성 substrate) |
| Version(불변 버전) | **PARTIAL(재활용 원리)** | 승인 Immutable Version(SPEC §7)·해시체인 prev_hash→hash(`SecurityAudit.php:12-53`) 원리 재활용 |

★함정 준수: SecurityAudit 해시체인은 **액션 로그의 무결성 원리**로만 재활용한다. elevation Digest(Request+Approval+Snapshot 합성 봉인) 자체는 ABSENT — 입력 5축 중 4축(Request/Approval/Runtime/Snapshot)이 순신규이므로 Digest도 순신규.

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 입력 | Request·Approval·Runtime·Snapshot·Evidence·Version(SPEC §27) |
| 무결성 | Digest Validation 제약(SPEC §33) — 봉인 해시 검증. 변조 탐지 시 실패 |
| 재활용 원리 | SecurityAudit append-only 해시체인(`SecurityAudit.php:12-53`)의 prev_hash→hash·`verify`(`:56-68`) 무결성 패턴 확장(ADR D-2) |
| 불변 버전 | 승인 결정 Immutable Version(SPEC §7)·Extension도 새 Version(SPEC §16)을 Digest에 결합 |
| 테넌트 격리 | Tenant Isolation·Immutable Approval(SPEC §33) |
| 의존성 | Snapshot(§25)·Evidence(§26)·Request/Approval 확정 후에만 산출 가능(파생물) |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| `menu_audit_log` 체인 | GT② B-8(`AdminMenu.php:98`) | 메뉴 감사 해시체인(장식·verify 별도) — elevation digest 아님 |
| SecurityAudit 로그 체인 | GT①§4-F(`SecurityAudit.php:12-53`) | 액션 로그 무결성 — 무결성 원리만 재활용, elevation 합성 봉인 아님(★함정) |
| `mapping_change_request` | GT② B-1(`Db.php:623-636`) | 매핑 거버넌스 정족수 승인 — digest 아님 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규)**. 입력 5축 중 Request·Approval·Runtime·Snapshot 4축이 grep 0(GT②§2)이므로 이를 합성하는 Digest도 순신규.
- **재활용 축(원리 한정)**: SecurityAudit 해시체인 무결성 패턴(`SecurityAudit.php:12-53`+`verify` `:56-68`)·Immutable Version 원리(SPEC §7). 봉인 대상 데이터는 순신규.
- **선행 의존**: Snapshot·Evidence·Request·Approval 확정 후에만 산출(BLOCKED_PREREQUISITE, ADR §4). Part 1~3-8 인증 선행.
- 코드 변경 0 · Extend-only(ADR D-2) · 무후퇴.
