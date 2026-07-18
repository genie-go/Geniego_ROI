# DSAR — Approval Case Version (§14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §14** — 원문 나열 실측 **16 필드**.

## 0. 현행 실측 (file:line)

**★Version 개념 전면 부재(승인 측·grep 0).** 현행 4개 승인 테이블 어디에도 version/revision 컬럼이 없다.

| 현행 | 실측 | 분류 |
|---|---|---|
| `action_request` | `Db.php:592-600` — version 컬럼 **없음**. `UPDATE ... SET approvals_json=?, status=?`(`Alerting.php:594`) **제자리 덮어쓰기** | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `mapping_change_request` | `Db.php:623-636` — version 컬럼 **없음**. `UPDATE`(`Mapping.php:288`) 제자리 갱신 | **NOT_APPLICABLE** |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — version 컬럼 **없음** | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2355` — 상태만 갱신 | **NOT_APPLICABLE** |
| `FeedTemplate` | `FeedTemplate.php:248-285` — `draft/submitted/approved/published` 상태는 있으나 **버전 스냅샷 아님**(전이 후 이전 내용 복원 불가) | **MIGRATION_REQUIRED** |
| APPROVAL_CASE_VERSION | grep 0 | **NOT_APPLICABLE(부재 → 신설)** |

> **§4.4/§4.5 위배 실측**: 승인 후 원본이 바뀌어도 **승인 당시 상태를 되짚을 수단이 없다**. `approvals_json` 은 승인자 목록일 뿐 **내용 스냅샷이 아니다**.

## 1. 스펙 §14 `APPROVAL_CASE_VERSION` 필수 필드 전사 — 원문 실측 **16개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §14**

> 🔴 **REQ 집계 15 ↔ 원문 실측 16 — 원문이 정본.**
> REQ `§7` 표의 *"§14 Approval Case Version 필드 = **15**"* 는 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 16).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**
>
> 🔴 **본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다.** 초판은 REQ 개수 15 에 맞춘 **항목명 날조**였고 —
> `case_version_id`·`tenant_id`·`version_no`·`status_at_version`·`content_hash`·`snapshot_json`·`item_count_at_version`·`total_amount_at_version`·`currency_at_version`·`superseded_by_version_no`·`created_by` 는 **원문 §14 에 존재하지 않는다**.

**원문 §14 말미 지시**: *"Case 진행 중 Workflow·Policy가 변경되더라도 기존 Case가 어떤 Version으로 처리되었는지 보존한다."*
**§0 실측: Version 개념 전면 부재(승인 측·grep 0)** → **16 필드 전부 부재**가 §0 정합 판정이다.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_case_version_id` | **부재** — §0 "APPROVAL_CASE_VERSION grep 0" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_case_id` | **부재(FK)** — §0 Case 자체 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `version_number` | **부재** — §0 "현행 4개 승인 테이블 어디에도 version/revision 컬럼이 없다" · **NOT_APPLICABLE(신설)** |
| 4 | `previous_version_id` | **부재** — §0 동일(version 축 전무) · **NOT_APPLICABLE(신설)** |
| 5 | `workflow version` | **부재** — §0-DOMAIN 실측: Workflow 엔진 **backend/src grep 0** · **NOT_APPLICABLE(신설 · `5-3-2` 범위)** |
| 6 | `policy version` | **부재** — `policy_version` grep 0 · **NOT_APPLICABLE(신설)** |
| 7 | `request version` | **부재** — §0 Request 측 version 컬럼 **없음**(`action_request` Db.php:592-600 · `mapping_change_request` Db.php:623-636) · **NOT_APPLICABLE(신설)** |
| 8 | `participant snapshot` | **부재** — §0 "`approvals_json` 은 승인자 목록일 뿐 **내용 스냅샷이 아니다**" · **MIGRATION_REQUIRED** |
| 9 | `resource snapshot` | **부재** — §0 "§4.4/§4.5 위배 실측: 승인 후 원본이 바뀌어도 **승인 당시 상태를 되짚을 수단이 없다**" · **NOT_APPLICABLE(신설)** |
| 10 | `context snapshot` | **부재** — §0 동일(스냅샷 축 전무) · **NOT_APPLICABLE(신설)** |
| 11 | `effective_from` | **부재** — §0 version/이력 축 전무 · **NOT_APPLICABLE(신설)** |
| 12 | `effective_to` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 13 | `immutable_hash` | **부재** — ※쓰기 체인 선례 = `menu_audit_log.hash_chain`(AdminMenu.php:123-131 · 🔴 `verify()` 0 → tamper-evident 아님; 검증형 = `SecurityAudit::verify()`) · **승인 도메인 아님** |
| 14 | `created_at` | **부재(Version 행)** — ※Request 행 `created_at` 은 존재(Db.php:599,635) |
| 15 | `status` | **부재(Version 행)** — ※`FeedTemplate`(FeedTemplate.php:248-285)은 상태는 있으나 **버전 스냅샷 아님**(전이 후 이전 내용 복원 불가) · **MIGRATION_REQUIRED** |
| 16 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 16 = **존재 0** + **부재 15** + **판정 유보 1**(16).

### 1-1. §0 위배 실측과의 정합

§0 은 현행 4테이블 전부가 **제자리 덮어쓰기**임을 기록한다 — `UPDATE ... SET approvals_json=?, status=?`(Alerting.php:594) · `UPDATE`(Mapping.php:288).
원문 필드 **3 `version_number`** · **4 `previous_version_id`** · **11/12 `effective_from`/`effective_to`** 가 정확히 그 공백이며, **8~10 snapshot 3축**이 §4.4 재현성의 전제다.

⇒ 원문 §14 전 16 필드 부재 판정은 §0 *"Version 개념 전면 부재"* 와 **정합**(모순 0).

## 2. 규칙

**Append-only**(§4.9) — Version 행은 **UPDATE·DELETE 금지**. 현행의 제자리 덮어쓰기(`Alerting.php:594`·`Mapping.php:288`)를 **Version 생성으로 대체**하되, 기존 컬럼은 **보존**(비파괴·Golden Rule = Extend). Critical Field 변경 시 재승인 검토(§4.5) 판정 정본 = `DSAR_APPROVAL_CRITICAL_FIELD_CHANGE_POLICY.md`(§31). `snapshot_json`은 **Case 메타 스냅샷**이고 원본 업무 데이터 스냅샷은 `DSAR_APPROVAL_RESOURCE_SNAPSHOT.md`(§30) — **혼동·중복 신설 금지**. **코드변경 0**.
