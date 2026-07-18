# DSAR — Approval Decision Action Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 ACTION_POLICY 필수 필드 (원문 전사):
- `policy_id` · `tenant_id` · `code` · `name`
- `action type`
- `actor policy` · `source state policy` · `reason policy` · `comment policy` · `attachment policy` · `target policy`
- `assignment effect policy` · `claim effect policy` · `lease effect policy` · `sequential effect policy` · `case effect policy` · `workflow effect policy`
- `requester task policy` · `resubmission policy` · `idempotency policy` · `conflict policy` · `snapshot policy` · `audit policy`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

의미: Action Policy는 특정 action type에 대해 어떤 actor·source state·reason·comment·attachment·target 조건과 어떤 effect(assignment/claim/lease/sequential/case/workflow) 처리·idempotency·conflict·snapshot·audit 규율이 적용되는지를 테넌트 단위로 선언한다. Definition(§8)이 참조하고 Capability(§11)·Eligibility(§12) 판정의 규칙 소스다.

## 2. 기존 구현 대조

- **action type별 정책 선언(데이터) 부재** — `policy_id`·`code`·`action type`·각 effect policy를 데이터로 선언하는 구조 전무. 정책은 핸들러 조건문에 하드코딩.
- `actor policy` → 정적 RBAC role 게이트만(`index.php:404-420` Tenant Guard · `Alerting.php:580-582`), action type별 actor 정책 부재.
- `reason policy` → **ABSENT**(reason_code/rejection_reason 0 · 자유텍스트 `ReturnsPortal.php:36,324`). `comment policy` → **PARTIAL**(note만 · visibility/classification/PII/redaction 전무). `attachment policy` → **PARTIAL**(MIME 검증은 `MediaHost.php:81-91`/`:33-38`/`:88-91`만 · Malware/DLP/classification/retention/legal hold 전무).
- `assignment/claim/lease/sequential/case/workflow effect policy` → **no hits**(§3.3 Assignment ABSENT · Effect Mapping §13 ABSENT · 직접 status UPDATE).
- `idempotency policy` → **PARTIAL**(§51 idempotency key 체계 부재 · 핸들러별 임시 중복방지만). `conflict policy` → **PARTIAL**(§50 conflict 등록소 부재). `snapshot policy` → **PARTIAL**(§52 스냅샷 부재). `audit policy` → 감사 인접자산 실재(`SecurityAudit::verify():56,64`)이나 action policy 결합 부재.
- `active_version`/`valid_from`/`valid_to` → **no hits**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Action Registry(§7)·Definition(§8) ABSENT — 정책의 소속·참조 대상 부재. Effect(§13)·Sequential Effect(§47)·Conflict(§50)·Idempotency(§51)·Snapshot(§52) 전부 ABSENT이므로 각 effect/idempotency/conflict/snapshot policy 필드는 규율 대상 없음.
- cover: **0** (정책 데이터 선언 전무 · reason/comment/attachment는 PARTIAL 인접자산만 · effect policy 계열은 완전 부재).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_policy` — action type별로 actor/source-state/reason/comment/attachment/target 조건과 effect·idempotency·conflict·snapshot·audit 규율을 데이터로 선언. Definition(§8)이 이를 참조.
- 확장 기반: `MediaHost.php:81-91`(MIME·매직바이트·8MB·SHA-256·원자쓰기·nosniff)=CANONICAL을 attachment policy의 검증 정본으로 재사용 · `SecurityAudit::verify():56,64`를 audit policy 무결성 검증에 재사용(엔진 난립 금지).
- Mandatory Control(무후퇴·실위험): reason policy ABSENT + comment PARTIAL이 REJECT 사유 미입력(`AdminGrowth.php:1319-1331`)을 방치 — Action Policy 신설 시 REJECT의 `reason policy=required`를 강제해야 함(§17 Reason 필수). attachment policy의 Malware/DLP required는 현재 `CreativeStore::brandAssetUpload`(`:265-275`) 무검증 업로드(BLOCKED_GAP)를 정책으로 차단.
- 선행 축 부재 필드(assignment/claim/lease/sequential effect policy)는 해당 EPIC 완료 전 `status=DRAFT`로 보류하되, 즉시 강제 가능한 reason/comment/attachment/idempotency policy는 선착수.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
