# DSAR — RBAC Analytics & Governance Dashboard: 내보내기 (APPROVAL_ANALYTICS_EXPORT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_EXPORT`(SPEC §2 Canonical Entity)는 RBAC 거버넌스 대시보드/KPI/스냅샷 산출물을 외부 포맷·채널로 **내보내는 계약**이다. SPEC §26(Export)은 지원 포맷을 **CSV·Excel·PDF·JSON·REST API** 5종으로 규정한다. §39 API는 "Export 실행"을 최소 API로, §42 성능은 "Export 1M Rows ≤ 60초"를 요구한다. 내보내기 소스는 §27 Snapshot·§28 Evidence·§20 KPI이며, 감사 무결성(§40 Immutable Snapshot·Digest Validation)을 보존해야 한다. 본 엔티티는 **authz 거버넌스 데이터셋 전용** 이며 마케팅 데이터셋 export와 분리된다(§4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 포맷/기능 | 판정 | 근거(파일:라인) |
|---|---|---|
| Export 엔진 코어 | **PARTIAL(재사용)** | `DataExport.php:24`(클래스)·`:266`(runDestination)·`:383`(pushDataset)·`:607`(httpSend) — HTTP/Sheets/BigQuery/Snowflake/S3 목적지(GT① §G) |
| JSON / NDJSON | **PRESENT(재사용)** | `DataExport.php` 현 엔진이 **NDJSON/JSON만** 산출(GT① §G·GT② §3·ADR D-3) |
| REST API 전송 | **PARTIAL(재사용)** | `DataExport.php:607`(httpSend HTTP 전송) · SSRF `:625` fail-closed |
| 스케줄/증분/암호화 | **PARTIAL(재사용)** | `DataExport.php:646`(runDue frequency)·`:93`(암호화)·커서페이징(GT① §G) |
| CSV 포맷 | **ABSENT(신규)** | 현 엔진 NDJSON/JSON만 — CSV 미지원(GT① §G·GT② §3·ADR D-3·Consequences) |
| Excel 포맷 | **ABSENT(신규)** | 동일 — 미지원(ADR 44행 "CSV/Excel/PDF는 신규") |
| PDF 포맷 | **ABSENT(신규)** | 동일 — 미지원(ADR D-3·Consequences "CSV/Excel/PDF export 신규") |
| authz 데이터셋 계층 | **ABSENT(신규)** | 현 데이터셋은 마케팅(§4) — authz 엔티티로 교체 필요(ADR D-3) |
| 무결성 증거 첨부 | **PARTIAL(재사용)** | `SecurityAudit.php:14`·`:56-68`(hash_chain·verify) 재활용(ADR D-4·§40) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **Export 레코드**: export_id · tenant_id(격리 필수) · dataset_ref(authz 엔티티 §2) · format(csv/excel/pdf/json/rest §26) · snapshot_ref(§27) · evidence_ref(§28 KPI Formula·Analytics Version) · digest_hash(§40) · requested_by · status.
- **엔진 재사용**: `DataExport.php:24`/`:266`/`:607` 엔진을 **재사용(Extend)** 하고 **데이터셋만 authz 엔티티로 교체**(ADR D-3). NDJSON/JSON/REST는 기존 경로 활용.
- **신규 렌더러**: CSV/Excel/PDF 3종은 신규 포맷 렌더러 필요(현 엔진 미지원 — GT① §G). §42 "1M Rows ≤ 60초" 스트리밍/청크 산출.
- **보안 제약**: REST/HTTP 전송은 `DataExport.php:625` SSRF fail-closed 유지, `:93` 암호화 유지. Cross-Tenant Query·Data Leakage 차단(SPEC §35·ADR D-6) — 내보내기는 요청자 테넌트 스코프 밖 authz 데이터 유출 금지.
- **무결성**: 내보낸 스냅샷은 `SecurityAudit.php:14`/`:56-68` 해시체인으로 Digest Validation(§40·ADR D-4), Immutable Snapshot 보존.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- `DataExport.php` 엔진의 **데이터셋 계층은 마케팅 도메인**(GT① §G "데이터셋 계층은 KEEP_SEPARATE"). `Reports.php:27`/`:141`/`:336` DataExport DATASETS(orders/ad_metrics/attribution/kpi_summary)·`Reports.php:35` VIZ_TYPES는 **흡수·개명 절대 금지**(GT② §B-5·§4).
- authz Export는 `acl_permission`/`access_review_item`/`security_audit_log`/`api_key`/`auth_audit_log`(GT① §F·§G 7번)를 소스로 하며 `performance_metrics`/`channel_orders`/`attribution_*` 흡수 금지(ADR D-2).
- 재사용은 **엔진 substrate(전송·SSRF·암호화·frequency)에 한정**, marketing metric/dataset 계층 미흡수(ADR D-2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PARTIAL-substrate(DataExport 엔진·JSON/NDJSON/REST/SSRF/암호화 재사용) / ABSENT-governance(CSV·Excel·PDF 렌더러·authz 데이터셋 계층 순신규).
- **재활용(Extend, 대체 아님)**: `DataExport.php:24`/`:266`/`:383`/`:607`/`:625`/`:646`/`:93`(엔진·전송·SSRF·frequency·암호화) · `SecurityAudit.php:14`/`:56-68`(무결성 증거).
- **선행의존**: BLOCKED_PREREQUISITE — Export 소스인 §27 Snapshot·§28 Evidence·§20 KPI가 실 구현(Part 1~3-10 인증)된 후 산출 가능(ADR D-7·Consequences). CSV/Excel/PDF는 신규 비용. 코드 변경 0·NOT_CERTIFIED.
