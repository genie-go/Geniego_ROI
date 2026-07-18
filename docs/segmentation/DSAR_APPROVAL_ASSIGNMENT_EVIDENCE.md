# DSAR — Evidence (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§63 EVIDENCE 필드(원문 전사):

1. `evidence_id`
2. `tenant_id`
3. `work_item_id`
4. `assignment_id`
5. 전체 Snapshot 참조 묶음: `version` · `resolution` · `policy` · `strategy` · `queue` · `candidate` · `assignee` · `authority` · `delegation` · `org` · `legal entity` · `geography` · `resource` · `action` · `amount` · `currency` · `capacity` · `workload` · `availability` · `skill` · `affinity` · `claim` · `lease` · `lock` · `reassignment` · `transfer` · `fallback` · `snapshot` · `reconciliation`
6. `effective_at`
7. `recorded_at`
8. `immutable_hash`
9. `lineage`
10. `audit reference`

### 1.1 저장 금지 목록 (§63 원문)

1. `Password`
2. `Token`
3. `Credential`
4. `Calendar Body`
5. `Email Body`
6. 의료(Medical) 데이터
7. 불필요 PII
8. Security Secret

## 2. 기존 구현 대조

§GROUND_TRUTH 기준: Approval Assignment Evidence 레코드/테이블은 **ABSENT**. Evidence 는 §54 Snapshot·§56 Reconciliation·§14 Assignment History 를 lineage 로 묶어 immutable_hash 로 봉인하는 엔티티인데, 이 선행 엔티티가 모두 부재하므로 Evidence 조립 자체가 불가하다.

재사용 가능 substrate:
- `SecurityAudit.php:56-68` `verify()` — 실재하는 감사 체인 검증 로직. immutable_hash·lineage 봉인의 정본 검증 substrate 로 재사용 가능(엔진 난립 금지 원칙상 신규 해시 체인 신설 대신 확장 대상).
- `catalog_writeback_job` `approvalCreate` SSOT(`Catalog.php:2301-2319`) — 승인 생성 이벤트가 남기는 최소 흔적. 다만 §63 전 필드(authority/delegation/lease/lock/snapshot lineage) 없이 job 상태만 기록 → Evidence 계약 미충족.

저장금지 목록 준수 현황: 인접 자산에 password/token/email body 저장 관행은 확인 대상 아님(본 엔티티 부재). 신설 시 §63 금지목록을 Static Lint(§59) 게이트로 강제해야 함.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: **BLOCKED_PREREQUISITE** — Evidence 는 Snapshot(§54)·Resolution(§18)·Assignment History(§14) lineage 를 요구하는데 이들이 모두 부재. 상위로는 축1~축4 부재에 연쇄 종속.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_assignment_evidence` 테이블. immutable_hash·lineage 봉인 검증은 **`SecurityAudit.php:56-68` verify() 확장 재사용**(신규 tamper-evident 엔진 신설 금지).
- Mandatory Control: §63 저장금지목록(Password/Token/Credential/Calendar·Email Body/Medical/불필요 PII/Security Secret)을 쓰기 경로 Static Lint 로 차단. Evidence 는 append-only·과거 재작성 금지(§58).
- 무후퇴: `catalog_writeback_job` 승인 이벤트 흔적은 유지하고, Evidence 는 그 위에 lineage 를 얹는 상위 레코드로 병행. Snapshot(§54) 신설 전에는 Evidence 를 실제 봉인할 데이터가 없으므로 스키마 예약에 그친다.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
