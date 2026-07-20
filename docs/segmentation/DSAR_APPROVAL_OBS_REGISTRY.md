# DSAR — Authorization Observability & Forensics: 관측성 레지스트리 (APPROVAL_OBSERVABILITY_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBSERVABILITY_REGISTRY`는 Part 3-14 Authorization Observability & Forensics 플랫폼의 **최상위 레지스트리 엔티티**로, 관측 대상(Trace·Event·Timeline·Replay·Digital Twin·Evidence·Case·Custody 등 SPEC §2의 23개 Canonical Entity)을 등록·색인·조회하는 인덱스 계층이다.

- SPEC §1(구현 목표 1번 "Authorization Observability Registry")이 제1 구축 대상으로 명시.
- SPEC §2가 등록 대상 23개 Canonical Entity(`APPROVAL_AUTH_EVENT` ~ `APPROVAL_OBSERVABILITY_DRIFT`)를 열거 — 본 레지스트리가 그 카탈로그를 소유.
- SPEC §34(Index)가 색인축을 규정: Trace ID·Correlation ID·Session·Subject·Resource·Decision·Timeline·Case.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Observability Registry(엔티티 카탈로그·색인) | **ABSENT(순신규)** | GT② §1 `trace/correlation/forensic` authz 매치 0 · GT② §2 "Policy/Permission/Session/Resource Trace + Trace Analytics + Forensic Case = ABSENT(grep 0)" |
| 등록 substrate 앵커(Immutable Event Store) | **PRESENT** | `SecurityAudit.php:14-33`(append-only)·`:56-68`(verify) — GT① §2.A |
| 감사 3종(레지스트리 소스 후보) | **PARTIAL** | auth_audit_log(`UserAuth.php:4174-4197`)·menu_audit_log(`AdminMenu.php:169-212`)·access_review_item(`AccessReview.php:62-81`) — GT① §2.B·C·D |
| 3소스 통합 집계(레지스트리 조회 재사용) | **PRESENT** | `Compliance.php:143-190`(collectAuditEvents 3소스·테넌트 fail-closed `:176`) — GT① §2.E |
| Index(Trace/Correlation/Session/Subject/Resource/Decision/Timeline/Case) | **ABSENT** | GT② §2 append-only 증거 로그뿐·색인축 부재 |

레지스트리는 순수 그린필드가 아니라, SecurityAudit 해시체인을 앵커로 등록 대상을 **참조**하는 인덱스 계층으로 신설한다(ADR D-1·흡수 아님).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **등록 축**(SPEC §34): `trace_id`·`correlation_id`·`session`·`subject`·`resource`·`decision`·`timeline`·`case`를 색인 키로 보유.
- **불변/무결성**(SPEC §33): Immutable Event·Immutable Evidence·Hash Chain Integrity·Snapshot Integrity·Tenant Isolation·Time-order Validation을 DB 제약으로 적용. 앵커는 `SecurityAudit.php:56-68` verify 패턴(hash_equals+prev 연속성) 확산(ADR D-2).
- **테넌트 격리**: `Compliance.php:176`(fail-closed 테넌트 스코프) 재사용(ADR D-7). 조회는 테넌트 경계 밖 유출 금지.
- **API**(SPEC §32): Query Timeline·Query Trace·Query Metrics·Verify Integrity의 진입 인덱스 역할. Verify Integrity는 `AdminGrowth.php:1429`(verify admin 노출) 선례 확장.
- **상태**: NOT_CERTIFIED — 등록 대상 23 엔티티 대부분이 ABSENT(§2)이므로 레지스트리는 계약만 확정, 실 등록 로직은 선행 인증 후.

## 4. KEEP_SEPARATE (흡수 금지)

- **Walmart correlation_id**: `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(`WM_QOS.CORRELATION_ID` 외부 API 헤더) — authz correlation 아님. 레지스트리 색인축 `correlation_id`와 동명이인. 등록 금지(GT② §5 B-1).
- **마케팅 trace/decision**: `AttributionEngine.php:1522`·`:1546`·`:1553`(percentile 신뢰구간)·`Decisioning.php:12`·`:36`(ingestAdInsights) — GT② §5 B-2.
- **인프라·ML·데이터 관측**: `SystemMetrics.php:1-60`·`ModelMonitor.php`·`DataPlatform.php` — GT② §5 B-3. 인프라 헬스≠authz 관측.
- **ops audit_log**: `Compliance.php:176-187`(운영 액션·collectAuditEvents가 테넌트 스코프에서 명시 배제 `:176`) — GT② §5 B-4.

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 레지스트리 자체는 **ABSENT(순신규)**. 등록 substrate 앵커(SecurityAudit 해시체인)만 PRESENT·감사 3종/SIEM 집계는 재활용(참조·확장).
- **재활용/ABSENT**: 앵커=`SecurityAudit.php:14-68`·조회=`Compliance.php:143-190`·verify 확산=`SecurityAudit.php:56-68`. 색인축·엔티티 카탈로그는 순신규.
- **선행 의존**: Part 1~3-13 인증 완료 후 실 구현(ADR §4). SPEC §2의 23 Canonical Entity가 실존해야 레지스트리가 등록 대상을 가짐.
