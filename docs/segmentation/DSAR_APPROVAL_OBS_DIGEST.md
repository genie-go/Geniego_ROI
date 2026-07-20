# DSAR — Authorization Observability & Forensics: 관측성 다이제스트 (APPROVAL_OBSERVABILITY_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBSERVABILITY_DIGEST`(SPEC §2·§27)는 하나의 인가 사건에 대한 관측 산출물들을 **단일 무결성 요약**으로 집약하는 다이제스트 엔티티다. SPEC §27은 다이제스트가 다음 5입력을 집약하도록 규정한다.

| 입력 | SPEC 근거 | 의미 |
|---|---|---|
| Trace | §27·§4(Distributed Authorization Trace·OTel) | 분산추적 요약 |
| Timeline | §27·§6(Request→…→Response) | 결정 타임라인 요약 |
| Replay | §27·§8(Read-only Simulation) | 재현 결과 요약 |
| Evidence | §27·§26(Hash/Signature/Chain Position) | 증거 요약 |
| Snapshot | §27·§25(Timeline/Decision/Context/Policy/Replay Result) | 스냅샷 요약 |

다이제스트는 Forensic Investigation(§16)·Export Evidence(§32)의 단일 검증 단위다. §33 Hash Chain Integrity·Tenant Isolation을 승계한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 다이제스트 입력 | 판정 | 근거(파일:라인) |
|---|---|---|
| Trace(분산추적) | **ABSENT** | OTel/trace_id/span_id 코드 0·composer 의존성 0(GT② §2). 분산추적 순신규 |
| Timeline | **ABSENT** | Decision Timeline 연결키 부재·flat append(`UserAuth.php:4190`)(GT② §2) |
| Replay | **ABSENT** | Decision Replay/Digital Twin 부재(GT② §2·ADR §D-3) |
| Evidence | **PRESENT(부분)** | `SecurityAudit.php:25-27`(해시체인)=증거 무결성 앵커·통합 Evidence Chain은 순신규(GT② §2) |
| Snapshot | **ABSENT** | 결정 스냅샷 substrate 없음(APPROVAL_OBSERVABILITY_SNAPSHOT DSAR 참조) |
| 집약·조회 substrate | **PRESENT** | `Compliance.php:143-190`(collectAuditEvents 3소스 통합·`:148-187`·`:176` fail-closed)=로그 집약 재사용(GT① §2E) |
| 무결성 검증 | **PRESENT** | `SecurityAudit.php:56-68`(verify broken_at)=다이제스트 검증 패턴 재사용(GT① §2A) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/Digest 무결성/테넌트격리)

- **필드(§27)**: `digest_id` · `tenant`(§33 격리) · `correlation_id`(§3·5입력 연결키) · `trace_ref`(§4) · `timeline_ref`(§6) · `replay_ref`(§8) · `evidence_ref`(§26 hash) · `snapshot_ref`(§25) · `digest_hash`(집약 sha256·§33) · `built_at`(UTC·§3).
- **Digest 무결성**: 5입력 참조를 sha256로 집약, 개별 입력 변조 시 digest_hash 불일치 → verify(`SecurityAudit.php:56-68` 패턴) 탐지(ADR §D-2). 다이제스트는 흡수 아닌 **참조**로 각 산출물 연결(AccessReview `:225` 선례·ADR §D-1).
- **불변성**: Immutable Event Store(§18) 위 append-only — `SecurityAudit.php:14-33` 패턴 승계(ADR §D-1).
- **집약 재사용**: Log Aggregation(§21)은 `Compliance::collectAuditEvents`(`:143-190`·3소스)·`forwardEvent`(`:430-461`) 재사용·확장(대체 금지·ADR §D-5).
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용·Cross-tenant digest 조회 차단(ADR §D-7).

## 4. KEEP_SEPARATE (마케팅 drift 흡수금지)

- **Walmart correlation_id**(`ChannelSync.php:2874`·`:2878`) = 외부 API 헤더, digest correlation 키 아님(GT② §5 B-1).
- **마케팅 attribution/decision**(`Decisioning.php:12`·`:36` ingestAdInsights의 "decision") = 광고 인사이트, authz 결정 다이제스트 아님(GT② §5 B-2).
- **인프라 SystemMetrics**(`SystemMetrics.php:1-60`) = 모듈 latency/uptime 인프라 헬스, authz digest 아님(GT② §5 B-3).
- **ops audit_log**(`Compliance.php:176-187`·`:177`) = collectAuditEvents가 통합하나 테넌트 스코프에서 명시 배제(`:141`·`:176`), authz forensics 범위 밖(GT② §5 B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(Trace/Timeline/Replay/Snapshot 입력) · PRESENT(부분: Evidence 앵커·집약 substrate).** 다이제스트 엔티티 본체는 순신규.
- **재활용(흡수 아님·확장/참조)**: `Compliance.php:143-190`(집약)→다이제스트 입력 수집 · `SecurityAudit.php:25-27`·`:56-68`(해시체인+verify)→digest 무결성 검증.
- **선행 의존**: 5입력 중 4입력(Trace/Timeline/Replay/Snapshot)이 부재 → 상위 엔티티 신설 후에야 다이제스트 완성 가능. Part 1~3-13 인증 + Trace/Timeline/Replay/Snapshot 신설 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.** 마케팅/인프라 집계와 병행·무후퇴.
