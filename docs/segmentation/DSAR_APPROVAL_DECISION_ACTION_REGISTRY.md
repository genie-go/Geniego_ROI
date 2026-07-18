# DSAR — Approval Decision Action Registry (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 ACTION_REGISTRY 필수 필드 (원문 전사):
- `registry_id` · `tenant_id` · `registry_code` · `name`
- `approval domain`
- `supported actions` · `custom action support`
- `reason registry reference` · `comment policy reference` · `attachment policy reference` · `return target policy reference`
- `change request support` · `resubmission support` · `outcome mapping support`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

의미: Action Registry는 테넌트·승인도메인 단위로 어떤 Decision Action이 지원되는지, 그리고 그에 결합되는 Reason/Comment/Attachment/Return-Target 정책·Change Request/Resubmission/Outcome Mapping 지원 여부를 **데이터로 선언**하는 최상위 등록소다. Definition(§8)의 상위 소속 컨테이너이자 Version(§9)·Policy(§10) 참조의 루트다.

## 2. 기존 구현 대조

- **승인 도메인 단위 Action 등록소(정본 데이터 선언)는 부재** — `registry_id`/`registry_code`/`supported actions`/`active_version`을 데이터로 선언하는 구조체 전무. 액션은 핸들러 코드에 개별 하드코딩돼 있고 등록소로 열거·조회되지 않는다.
- 실존 액션 실행부(코드 기반, 등록소 아님):
  - `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1289-1344`) — in-place status UPDATE.
  - `Mapping::approve/apply`(`Handlers/Mapping.php:238-331`) — Maker-Checker·approvals_json.
  - `Alerting::decideAction/executeAction`(`Handlers/Alerting.php:572-655`).
  - `Catalog::approveQueue`(`Handlers/Catalog.php:2383-2407`).
  - `AgencyPortal::approveAgency`(`Handlers/AgencyPortal.php:365-384`).
  - stub(`routes.php:752,1868,1943-1998`).
- 이들은 각기 다른 도메인에 흩어진 개별 액션일 뿐, 공통 Registry로 `supported actions`·`custom action support`·정책 참조를 선언하지 않는다.
- `reason registry reference`·`comment policy reference`·`attachment policy reference`·`return target policy reference`·`outcome mapping support` → **no hits**(Reason=자유텍스트 `ReturnsPortal.php:36,324`·Comment=note만·Return Target 정책 부재).
- `active_version`/`valid_from`/`valid_to`(등록소 버전·유효기간) → **no hits**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: 없음(Registry는 선행 6군의 상위 루트) — 다만 하위 Definition(§8)·Version(§9)·Policy(§10)가 본 Registry에 종속되므로 이들 전체가 연쇄 부재.
- cover: **0** (등록소 데이터 선언 전무 · 액션은 5개 도메인 핸들러에 분산 하드코딩).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_registry` 등록소 — 테넌트·승인도메인 단위로 `supported actions`(§CONTRACTS ACTION_TYPE 11종)와 Reason/Comment/Attachment/Return-Target 정책 참조를 데이터로 선언. Golden Rule=Extend: 기존 5개 도메인의 흩어진 액션 실행부를 삭제하지 않고 등록소가 그 상위에서 지원목록·정책참조를 표준화(무후퇴).
- 재사용 후보: `Alerting::decideAction/executeAction`(`Alerting.php:572-655`)=CANONICAL 실행 골격 · `Mapping approve/apply`(`Mapping.php:238-331`)=VALIDATED_LEGACY Maker-Checker · `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`)=CONSOLIDATION_REQUIRED(등록소로 흡수) · `Catalog::approveQueue`·`AgencyPortal::approveAgency`=KEEP_SEPARATE(도메인 특화 유지, 등록소 참조만 추가).
- Mandatory Control: `active_version`·`valid_from/to`를 강제해 액션 지원목록 변경을 버전화(§9 연동) — 등록소 없이 핸들러 하드코딩만 있으면 액션 추가/제거가 감사불가.
- 실위험: 현재 5개 도메인이 서로 다른 status 문자열로 승인을 융합하므로 등록소 부재 = **중복 Entity**(§58) 상태. 등록소 신설 시 도메인별 `registry_code`로 격리하되 supported actions·정책 참조는 단일 표준으로 통합.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
