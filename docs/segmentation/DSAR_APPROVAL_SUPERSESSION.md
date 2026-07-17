# DSAR — Approval Supersession (§39·필드 13·Type 9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

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

**필드 13 · Supersession Type 9** — 스펙 §39 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `13`/`9`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드/Type 축 커버리지 주장 불가**.

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
