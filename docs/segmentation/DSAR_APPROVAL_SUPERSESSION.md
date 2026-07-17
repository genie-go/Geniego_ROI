# DSAR — Approval Supersession (§39·필드 **14**·Type 9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §39**
> 🔴 **REQ 집계 불일치**: REQ §7은 필드 **13**으로 고정하나 **원문 실측 14**. **원문이 정본** — 제목·본문을 14로 정정한다. Type 9는 일치.

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q19 "기존 승인 요청이 새 Version으로 대체되었는가") | 현행 | 분류 |
|---|---|---|
| **승인 도메인** Supersession | **부재**(승인 경로 grep 0) | **NOT_APPLICABLE(부재→신설)** |
| **★인접 도메인 supersede 선례** | `catalog_writeback_job.status='superseded'` `Handlers/Catalog.php:1188` — 신규 잡 등록 시 기존 미완료 잡을 **삭제하지 않고 superseded로 마감**(`:394,588`) · 결과 판정에서 제외(`:1871-1873`) | **LEGACY_ADAPTER**(잡 도메인 · **승인 아님**) |
| 그 선례의 교훈(주석 실측) | `Catalog.php:1187` — 과거에 **옛 잡을 지워버리던 회귀**가 있었고, 지금은 **보존+마감**으로 교정됨 | **VALIDATED_LEGACY**(무후퇴 패턴) |
| `action_request` / `mapping_change_request` | 대체 링크 컬럼(`superseded_by` 등) **없음**(`Db.php:592-600` · `:623-636`) | **MIGRATION_REQUIRED** |
| 승인 후 **원본 변경 감지**(§4.5 재승인 검토 트리거) | **부재**(grep 0) — Resource Snapshot·Critical Field 축 자체가 없음 | **NOT_APPLICABLE** |

> **선례 인용 한계 명시**: `catalog_writeback_job`은 **업무 리소스**이지 Approval Request가 아니다(§4.1). 재사용하는 것은 **"대체는 삭제가 아니라 마감+링크"라는 패턴**뿐이며, 이 테이블을 Approval로 승격하는 것이 **아니다**.

## 1. Supersession = **새 Request/Version이 옛 것의 효력을 종료시키는 링크**

### 1.1 필수 필드 — **원문 전사 14** (§39)

`APPROVAL_SUPERSESSION`

| # | 필드(원문) | 현행 대조 | 분류 |
|---|---|---|---|
| 1 | approval_supersession_id | 부재(grep 0) | NOT_APPLICABLE |
| 2 | predecessor request | 부재 — 승인 테이블에 대체 링크 컬럼 없음(`Db.php:592-600` · `:623-636`) | NOT_APPLICABLE |
| 3 | predecessor case | 부재 — Case 축 자체가 없음(§4.2) | NOT_APPLICABLE |
| 4 | successor request | 부재 | NOT_APPLICABLE |
| 5 | successor case | 부재 | NOT_APPLICABLE |
| 6 | supersession type | 부재 — 아래 Type 9 열거형 미존재 | NOT_APPLICABLE |
| 7 | reason | 부재(승인 도메인) | NOT_APPLICABLE |
| 8 | carried decisions | 부재 — 승인 이전(carry) 개념 grep 0 | NOT_APPLICABLE |
| 9 | invalidated decisions | 부재 — Decision 테이블 자체가 없음(현행은 `UPDATE SET status=?` 덮어쓰기) | NOT_APPLICABLE |
| 10 | carried evidence | 부재 — Evidence 축 부재([Evidence 문서](DSAR_APPROVAL_EVIDENCE.md) §0) | NOT_APPLICABLE |
| 11 | new resource version | 부재 — Resource Version 축 부재(§4.4 미충족) | NOT_APPLICABLE |
| 12 | effective_at | 부재 | NOT_APPLICABLE |
| 13 | status | 인접 선례만 — `catalog_writeback_job.status='superseded'`(`Catalog.php:1188`)는 **잡 상태**이지 Supersession 레코드 상태 아님 | LEGACY_ADAPTER(패턴만) |
| 14 | evidence | 부재 | NOT_APPLICABLE |

🔴 **필드 14/14 전부 `NOT_APPLICABLE`(부재→신설)** — 커버리지 0/14. 있다고 가정하고 배선 금지.

### 1.2 Supersession Type — **원문 전사 9** (§39)

| # | Type(원문) | 현행 대조 |
|---|---|---|
| 1 | NEW_VERSION | 부재(grep 0) — Version 축 자체 부재 |
| 2 | MATERIAL_CHANGE | 부재 — Critical Field(§31) 판정 축 부재 |
| 3 | CORRECTION | 부재 |
| 4 | CONSOLIDATION | 부재 |
| 5 | SPLIT | 부재 |
| 6 | POLICY_REEVALUATION | 부재 — Policy Version(§33) 부재 |
| 7 | MIGRATION | 부재 |
| 8 | EMERGENCY_REPLACEMENT | 부재 |
| 9 | OTHER | 부재 |

🔴 **Type 9/9 전부 부재** — 열거형 미존재. `catalog_writeback_job`의 `superseded`는 **단일 사유 미분류 상태값**이므로 위 9종 중 어느 것에도 대응시키지 않는다(축 혼합 금지).

### 1.3 원문 규칙 (§39 말미 · 전사)

> **Material Change가 있으면 기존 Approval Decision을 자동 이전하지 않는다.**

영속된 요구(§0 Q19·§4.4·§4.5·§4.8·§4.9)에서 확정 가능한 구조 요구:
- Supersession은 **방향성 링크**다 — `superseded`(옛) → `superseding`(새) 양방향 추적 가능해야 §0 Q19에 답할 수 있다.
- 옛 요청은 **보존된다**(§4.9 Append-only · `Catalog.php:1188` 패턴) — 삭제·덮어쓰기 금지.
- 옛 요청의 **Snapshot(§30)은 옛 것 그대로 남는다**(§4.4) — 대체됐다고 과거 승인 근거를 새 값으로 갱신하면 재현 불가.

## 2. 규칙

- 🔴 **Material Change 시 기존 Decision을 새 Version으로 자동 이전하지 않는다.** 승인은 **그때 그 내용**에 대한 것이므로(§4.4), 금액·통화·Action·Scope 같은 Critical Field(§31)가 바뀐 새 Version에 옛 승인을 물려주면 **아무도 승인한 적 없는 내용이 승인된 상태**가 된다 — §4.5(원본 변경 시 재승인 검토)·§0 Q23(승인 범위 초과 실행 금지) 정면 위배.
  → Material Change ⇒ **새 Version은 미승인 상태로 시작**하고, 옛 요청은 superseded로 **마감**한다.
- **Supersession ≠ Reopen**(§4.8) — 정체성이 갈라지면 Supersession, 이어지면 Reopen(§38).
- **`catalog_writeback_job`을 Approval Case/Request로 승격 금지**(§4.1 Resource 동일시 금지) — 차용하는 것은 패턴뿐.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
