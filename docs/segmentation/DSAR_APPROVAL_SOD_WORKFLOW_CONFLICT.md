# DSAR — Runtime SoD Enforcement: 워크플로 충돌 (APPROVAL_SOD_WORKFLOW_CONFLICT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_WORKFLOW_CONFLICT`(SPEC §2·§11)는 **동일 워크플로 흐름 내 여러 단계(Step)를 동일인이 겸하는지**를 검사하는 SoD 하위 엔티티다. SPEC §11 검사 대상:

- 동일 Workflow
- 동일 Instance
- 동일 Approval Chain
- 동일 Document

Workflow Step vs Workflow Step(§3) 상충을 대상으로, 하나의 결재 체인/문서 인스턴스 안에서 상충 단계(예: 기안↔검토↔최종승인)를 같은 사용자가 연쇄 수행하는지를 Runtime(§6 결재 처리)에서 평가한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 상태 | 근거(파일:라인) |
|---|---|---|
| Workflow Conflict Engine (Step vs Step) | **ABSENT** | grep 0 (GT② §2 Transaction/Workflow SoD ABSENT/부분) |
| 승인 체인 정족수·dedup (인접 substrate) | PRESENT | `Mapping.php:287` 정족수·`:278-283` dedup(동일 actor 재승인 409) — 단일 체인 4-eyes 무결성 (GT① §A) |
| approved-only 집행 | VACUOUS | `Alerting.php:684-688` `status!=='approved'` execute 409 있으나 maker 부재·생산자 0(GT① §B) |
| 승인 문서 스키마 | PRESENT | `Db.php:632-634` `mapping_change_request`(required_approvals) (GT① §A) |

판정: Workflow Step 상충평가 **ABSENT(그린필드)**. Mapping 정족수/dedup은 단일 approval chain의 **dual-control 무결성**이지, "동일 워크플로 내 상충 단계 겸직" 판정이 아니다(인접 substrate).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `workflow_id`·`instance_id`·`approval_chain_id`·`document_id`(§11)·`left_step`·`right_step`·`conflict_type`(§3)·`severity`(§15)·`resolution_strategy`(§16).
- **평가 계약**: 하나의 Instance/Approval Chain/Document 범위 안에서 각 Step actor 이력을 조회, 상충 Step을 동일 actor가 수행하면 §33 `SOD_POLICY_VIOLATION` 반환. Mapping dedup(`:278-283`)·정족수(`:287`)를 체인 무결성 선례로 재활용(ADR D-3).
- **제약**: Immutable Rule(§36)·Tenant Isolation. Temporal SoD(§7 동일 approval cycle) 연동. Conflict Snapshot(§23)에 활성 워크플로 상태 저장.
- **증거**: SecurityAudit 체인(`SecurityAudit.php:14-33`) 기록.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **단일승인 게이트 (결재분리 아님)** — `Catalog.php:2383-2407`(approveQueue)=단일 admin 승인·maker 미기록. 워크플로 SoD 아님(GT② §B-5).
- **AdminGrowth PARTIAL** — `AdminGrowth.php:1294`·`:1313-1331` 단일 admin=approved·정족수 없음→SoD 미성립(GT① §G).
- **menu_audit_log 체인** — `AdminMenu.php:123-140`·`:200`·`:216`·migration `20260526_168_102_create_menu_audit_log.sql:6-24` = 메뉴 거버넌스 append-only 체인이지 워크플로 충돌 증거 아님(GT② §B-7).
- **Maker-Checker = dual-control ≠ SoD** — `Mapping.php` 정족수는 "2인 필요"지 "상충 단계 겸직 차단"이 아님(GT② §B-2).
- **Alerting VACUOUS** — approved-only(`Alerting.php:684-688`)는 maker 부재로 무효, 기존 확정·재플래그 아님(GT② §5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 0.** Workflow Conflict Engine·Step vs Step 상충평가 = **순신규(ABSENT·grep 0)**. 재활용(Extend) = Mapping 정족수/dedup(`:287`·`:278-283`)을 체인 무결성 선례로(개명 금지)·SecurityAudit 증거(`:14-33`). 선행의존: Conflict Snapshot(§23)·Temporal SoD(§7)·Conflict Matrix 신설 + Part 1~3-9 인증 후 실 구현(BLOCKED_PREREQUISITE). 무후퇴: 정족수·dedup 통제 유지·병행.
