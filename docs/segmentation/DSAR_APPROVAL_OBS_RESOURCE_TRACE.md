# DSAR — Authorization Observability & Forensics: 리소스 추적 (APPROVAL_RESOURCE_TRACE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_RESOURCE_TRACE`(SPEC §2·§15, "Resource Trace")는 인가 결정이 대상으로 삼은 **리소스·자산을 6종으로 기록**한다. SPEC §15 규정:

| SPEC §15 대상 | 의미 |
|---|---|
| Resource | 보호 리소스 일반 |
| Dataset | 데이터셋(테넌트 데이터 경계) |
| Document | 문서/증거 객체 |
| API | API 엔드포인트 |
| Workflow | 워크플로 |
| Transaction | 트랜잭션 |

목적은 SPEC §0의 "왜 이 요청이 허용/거부되었는가"를 **어떤 리소스에 대한 결정이었는지**와 함께 재현하는 것이다(Distributed Trace §4의 REST/GraphQL/gRPC/Workflow 계층 연계).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §15 대상 | 판정 | 근거(GT 인용) |
|---|---|---|
| Resource/API 액션 감사(평문) | **PARTIAL** | 감사행 detail 평문 TEXT(`UserAuth.php:4165`)·flat append(`:4190`)=리소스별 구조화 trace 아님(GT① §B) |
| Dataset/Document/Workflow/Transaction **구조화 리소스 trace** | **ABSENT** | 구조화 resource trace grep 0(GT② §2 "Resource Trace = ABSENT"). 리소스 축 이벤트 스토어 부재 |
| 증거 문서(Document) 참조 패턴 | **PRESENT(참조 선례)** | `access_review_item`(`AccessReview.php:62-81`·`:177-242`)·justification 필수(`:192-194`)=증거 보존 선례(흡수 아닌 참조, GT① §D) |
| 무결성 앵커(재활용) | **PRESENT** | `SecurityAudit.php:14-68`(append-only+verify). 리소스 증거를 이 위에 참조(`AccessReview.php:225` 선례) |
| 로그 집계(리소스 이벤트 통합) | **PRESENT** | `Compliance.php:143-190`(collectAuditEvents 3소스 통합·테넌트 fail-closed) 재사용 가능(GT① §E) |

★핵심 격차: 리소스 접근은 **감사행 action 평문**으로만 남고(`UserAuth.php:4165`·`:4190`), Dataset/Document/Workflow/Transaction을 리소스 축으로 구조화·상관하는 trace가 없다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(SPEC §3 + §15): Event/Correlation/Trace/Span ID·Resource·Action·Decision·`resource_type`(resource/dataset/document/api/workflow/transaction)·`resource_id`·Policy Version·Runtime Context Version.
- **분산 추적**: REST/GraphQL/gRPC/Workflow/Batch 계층(SPEC §4)에서 동일 Trace ID로 리소스 접근을 상관. OpenTelemetry 호환.
- **불변성·무결성**: Immutable Event Store(SPEC §18)에 append·`SecurityAudit` 해시체인(`SecurityAudit.php:25-27`)에 참조·`verify`(`:56-68`) 적용.
- **Chain of Custody 연계**: Document/Dataset 증거의 생성·접근·복사·export를 불변 기록(SPEC §10). ★현행 custody 단절(`auditExport` 자기 미기록·`Compliance.php:265-300`)이 신설 근거(수정 아님·재플래그 금지, ADR D-4).
- **테넌트 격리**: Dataset 경계는 fail-closed(`Compliance.php:176`) 재사용. Cross-tenant 리소스 trace 금지.
- **오류 계약**(SPEC §30): `TRACE_NOT_FOUND`·`FORENSIC_ACCESS_DENIED`.

## 4. KEEP_SEPARATE (마케팅 trace·외부헤더 흡수금지)

- **Walmart correlation_id(★오인 최다)** — `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(`WM_QOS.CORRELATION_ID`)은 Walmart Marketplace 외부 API 요청 헤더이지 authz 리소스 correlation 아님(GT② §5 B-1). 절대 흡수 금지.
- **인프라 리소스 지표** — `SystemMetrics.php:1-60`은 인프라 헬스(GT② §5 B-3), authz 리소스 trace 아님. KEEP_SEPARATE.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(감사행 action 평문·증거참조 선례) / ABSENT(Dataset/Document/Workflow/Transaction 구조화 resource trace)**. 리소스 축 이벤트 스토어 순신규.
- **재활용(흡수 아님·참조/확장)**: `SecurityAudit.php:14-68`(앵커·verify)·`AccessReview.php:62-81`·`:177-242`·`:225`(증거참조 선례)·`Compliance.php:143-190`(집계 재사용)·`Compliance.php:176`(격리)·감사행 확장(`UserAuth.php:4165`).
- **선행 의존**: BLOCKED_PREREQUISITE — PDP(3-12) 리소스 결정이 관측 대상(ADR D-6, 재구현 금지). Chain of Custody(§10) 신설로 custody 단절 해소(ADR D-4). 실 엔진은 Part 1~3-13 인증 후 RP-track. 코드 변경 0 · NOT_CERTIFIED.

---
### file:line 인용 목록 (전체)
`UserAuth.php:4165` · `UserAuth.php:4190` · `AccessReview.php:62-81` · `AccessReview.php:177-242` · `AccessReview.php:192-194` · `AccessReview.php:225` · `SecurityAudit.php:14-68` · `SecurityAudit.php:25-27` · `SecurityAudit.php:56-68` · `Compliance.php:143-190` · `Compliance.php:176` · `Compliance.php:265-300` · `ChannelSync.php:1705` · `ChannelSync.php:1709` · `ChannelSync.php:2874` · `ChannelSync.php:2878` · `ChannelSync.php:3467` · `ChannelSync.php:3471` · `SystemMetrics.php:1-60`
