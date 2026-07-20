# DSAR — Authorization Observability & Forensics: 관측성 스냅샷 (APPROVAL_OBSERVABILITY_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBSERVABILITY_SNAPSHOT`(SPEC §2·§25)은 특정 인가 결정 사건을 사후 재현 가능한 형태로 **불변 저장**하는 관측성 스냅샷 엔티티다. SPEC §25는 스냅샷이 다음 5축을 저장하도록 규정한다.

| 축 | SPEC 근거 | 의미 |
|---|---|---|
| Timeline | §25·§6(Request→Context→PDP→PEP→Decision→Enforcement→Audit→Response) | 결정 타임라인 재구성 |
| Decision | §25·§3(Decision·Policy Version·Effective Permission Version) | 허용/거부 결정 본체 |
| Context | §25·§11(Device/Network/IP/Region/MFA/Trust Score) | 런타임 결정 컨텍스트 |
| Policy | §25·§12(Evaluated/Applied/Denied/Skipped Rule·Decision Reason) | 정책 평가 스냅샷 |
| Replay Result | §25·§8·§24(Read-only Simulation 결과) | 재현 시뮬레이션 결과 |

SPEC §33은 Snapshot Integrity·Tenant Isolation·Time-order Validation을 DB 제약으로 요구한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 스냅샷 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| Timeline(Request→…→Response) | **ABSENT** | Correlation Engine/Decision Timeline 부재. auth_audit_log는 flat append(`UserAuth.php:4190`)·연결키 없음(GT② §2) |
| Decision(결정 본체) | **PARTIAL** | 감사행에 action/role 기록(`UserAuth.php:4159-4168`·`:4165` detail 평문)이나 Policy/Permission Version 컬럼 부재(GT② §2) |
| Context(런타임) | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251`) ip/ua/last_seen만·인가 결정 컨텍스트 스냅샷 없음(GT① §2E·GT② §2) |
| Policy(평가 스냅샷) | **ABSENT** | 현행 `TeamPermissions.php:236`·`routes.php:1605`는 현재 effective 상태만·평가 trace 없음(GT② §2) |
| Replay Result | **ABSENT** | Decision Replay/Digital Twin(time-travel) 부재(GT② §2·ADR §D-3) |
| 불변 저장 앵커 | **PRESENT** | `SecurityAudit.php:14-68`(append-only+verify)=유일 tamper-evident substrate(GT① §2A) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/Digest 무결성/테넌트격리)

- **필드(§25)**: `snapshot_id` · `tenant`(§33 격리) · `trace_id`/`correlation_id`(§3) · `timeline_json`(§6 8단계) · `decision`+`policy_version`+`effective_permission_version`(§3) · `context_json`(§11) · `policy_trace_json`(§12) · `replay_result_json`(§8·§24) · `taken_at`(UTC·§3).
- **불변성**: 스냅샷은 Immutable Event Store(§18 Append Only/Immutable/Versioned) 위에 저장. UPDATE/DELETE 경로 금지 — `SecurityAudit`(`SecurityAudit.php:14-33`) append-only 패턴 승격(ADR §D-1).
- **무결성**: 스냅샷 자체는 Evidence(§26)로 해시·체인 연결되어 APPROVAL_OBSERVABILITY_EVIDENCE가 무결성 보증. 재계산 검증은 `SecurityAudit.php:56-68`(verify broken_at) 패턴 확산(ADR §D-2).
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용(ADR §D-7). Cross-tenant 스냅샷 조회 차단.
- **Time-order(§33)**: taken_at 시계열 순서 검증·과거 시점 재구성은 Digital Twin(§7)·Replay(§8) read-only로만.

## 4. KEEP_SEPARATE (마케팅 drift 흡수금지)

- **Walmart correlation_id**(`ChannelSync.php:1705`·`:1709`·`:2874`) = 외부 Marketplace API 헤더(`WM_QOS.CORRELATION_ID`), authz 스냅샷 correlation 아님(GT② §5 B-1).
- **마케팅 attribution touch/percentile**(`AttributionEngine.php:1522`·`:1546`·`:1553`) = 부트스트랩 신뢰구간·멀티터치 trace, 인가 결정 스냅샷 아님(GT② §5 B-2).
- **인프라 SystemMetrics**(`SystemMetrics.php:1-60`) = 모듈 헬스 스냅샷·비authz(GT② §5 B-3). 인가 결정 컨텍스트로 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(Timeline/Policy/Replay Result) · PARTIAL(Decision/Context) · 불변앵커 PRESENT(SecurityAudit).** 스냅샷 엔티티 본체는 순신규.
- **재활용(흡수 아님·확장/참조)**: `SecurityAudit.php:14-68`→불변 저장 앵커 승격 · `recordSessionMeta`(`UserAuth.php:4243-4251`)→결정 컨텍스트 스냅샷 확장 · `UserAuth.php:4165` detail 평문 → §3 필드 확장.
- **선행 의존**: Decision Timeline(§6)·Policy Trace(§12)·Replay(§8) 엔진 부재로 스냅샷 5축 완성 불가 → Part 1~3-13 인증 + Timeline/Replay 신설 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.** 마케팅/인프라 스냅샷과 병행·무후퇴.
