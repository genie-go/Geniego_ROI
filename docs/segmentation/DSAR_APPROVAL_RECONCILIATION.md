# DSAR — Approval Reconciliation (§43·비교 대상 19·필드 14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q21 "UI·API·ERP·Provider·Internal Approval 상태가 일치하는가") | 현행 | 분류 |
|---|---|---|
| **승인 도메인 Reconciliation** | **부재**(grep 0). 타 도메인 선례(`Mapping` 매핑 정규화 · 285차 `consolidateOrphanStock` WMS 재고 병합)는 **승인과 무관** | **NOT_APPLICABLE(부재→신설)** |
| 🔴 **드리프트 실측 (a) — 표시≠실제** | 백엔드가 `required_approvals => 2`를 **리터럴로** 내려보내나(`Handlers/Alerting.php:562`), **`decideAction`은 첫 결정 1건으로 즉시 `approved`**(`:589-591`) — **정족수 2가 집행되지 않음**. 프론트는 그 값을 state에 담기만 하고(`frontend/src/pages/Approvals.jsx:576`) **렌더 사용처 0**(파일 내 유일 출현) | **★MIGRATION_REQUIRED**(UI_API_MISMATCH **이미 실현**) |
| 🔴 **드리프트 실측 (b) — 팬텀 승인 라우트** | 핸들러 클래스 **부재** → 템플릿/501 폴백(`routes.php:1819-1828`)으로 흘러가는 승인 엔드포인트: `:1868` `/v384/budget/requests/{id}/approve` · `:1943,1953,1967,1998,2059` `/v399~403/recon/reports/{id}/approve` — **API는 응답하나 구현 없음** | **★MIGRATION_REQUIRED**(가짜 표면) |
| 승인 상태 **원천 다중화** | `action_request`(`Db.php:592-600`) · `mapping_change_request`(`:623-636`) · `admin_growth_approval`(`AdminGrowth.php:142-149`) · `catalog_writeback_job.status='pending_approval'`(`Catalog.php:2341-2364`) — **4계통 분산·상호 대조 없음** | **CONSOLIDATION_REQUIRED** |
| **Provider·ERP 승인 상태** 대조 | **부재**(grep 0) — 외부 시스템 승인 상태를 읽어오는 경로 없음 | **NOT_APPLICABLE** |

> **★이 도메인은 "장차 드리프트가 생길 수 있다"가 아니다 — 드리프트가 이미 두 건 실측된다.** (a)는 **화면이 약속한 정족수(2)를 백엔드가 지키지 않는** 사례이고, (b)는 **엔드포인트가 존재하는 척하는** 사례다. Reconciliation의 필요성은 가설이 아니라 **현행 관측 결과**다.

## 1. Reconciliation = **여러 원천의 승인 상태를 대조해 불일치를 표면화**

**비교 대상 19 · 필드 14** — 스펙 §43 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `19`/`14`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 비교대상/필드 축 커버리지 주장 불가**.

영속된 요구(§0 Q21·§61·§62 항목 39·40)에서 확정 가능한 구조 요구:
- Reconciliation은 **탐지이지 교정이 아니다** — 불일치를 **자동으로 맞추면** 어느 쪽이 진실인지 잃는다. 산출은 **Mismatch 레코드**이며 교정은 별도 결정.
- 비교는 **Canonical Approval을 SSOT로** 삼는다(§4.1) — UI 표시값·Provider 응답을 SSOT로 승격 금지.
- 드리프트 (a)류 재발 방지는 **Static Lint 축**(§46)의 일이다 — "백엔드가 내려보내지만 프론트가 렌더하지 않는 계약 필드"는 **코드로 탐지 가능**하다.

## 2. 규칙

- **드리프트 (a)(b)를 본 블록에서 수정하지 않는다** — 실 수정은 **별도 승인 세션**(Golden Rule + verify + 배포 승인). 본 문서의 산출은 **근거 고정**이다.
- **팬텀 라우트를 "구현된 것"으로 세지 않는다**(283차 "코드 존재 ≠ 구현 완료") — §62 항목 43 집계 시 501 폴백 경로는 **Existing Implementation 아님**.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Reconciliation 엔진이 없는 동안 대시보드에 "정합 OK"를 표시하지 않는다(가짜녹색 · 288차 systemic 교훈).
- 본 문서 **코드변경 0**.
