# DSAR — Action Duplicate Implementation Audit (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§64 `ACTION_DUPLICATE_IMPLEMENTATION_AUDIT` — 착수 전 동일 Action/Effect/Outcome/Mapping 중복 구현 실존 열거(중복 신설 금지·기존 확장). 감사 대상: **in-place UPDATE 승인 5도메인 · REJECT 이진 · Reason 자유텍스트 · Comment note · Attachment(MediaHost 이미지 / CreativeStore 무검증)**.

## 2. 기존 구현 대조 — 실존 열거 (능력 기반)

### 2.1 in-place UPDATE 승인 5도메인 (동일 관심사 산발 구현)

| 도메인 | 근거(허용목록) | §63 태그 |
|---|---|---|
| `AdminGrowth::approvalDecide` | `:1289-1344`(in-place `UPDATE`·이진 status·사유 미수취 `:1319-1331`) | **CONSOLIDATION_REQUIRED** |
| `Mapping::approve/apply` | `:238-331`(Maker-Checker 다중승인·approvals_json·자기승인 차단·approve→apply `:287,327`) | **VALIDATED_LEGACY** |
| `Alerting::decideAction/executeAction` | `:572-655`(action_request 2단계 결정↔집행·IDOR 가드 `:580-582`·`:594,653`) | **CANONICAL**(결정↔집행 분리 정본) |
| `Catalog::approveQueue` | `:2383-2407`(status='queued' 승인 큐) | **KEEP_SEPARATE** |
| `AgencyPortal::approveAgency` | `:365-384`(대행사 위임 승인) | **KEEP_SEPARATE** |
| (+stub) budget/recon/FeedTemplate | `routes.php:752,1868,1943-1998` | 미배선 stub |

→ 공통 관심사(결정 커밋)를 **5개 테이블/핸들러에 중복** 구현. Effect Mapping 없이 각자 `UPDATE SET status`.

### 2.2 REJECT — 이진 파생 중복
- `Alerting.php:593`(approve?approved:rejected)·`AdminGrowth.php:1321`(화이트리스트). scope/부분거절 없이 각자 이진 분기 재구현.

### 2.3 Reason — 자유텍스트 중복
- `ReturnsPortal.php:36,324`(reason TEXT·NULLIF 원문 그룹핑)·Mapping note. 정규화 taxonomy 없이 각자 자유텍스트.

### 2.4 Comment — note 중복
- Mapping/ReturnsPortal/Dsar 각자 `note` 단일 자유텍스트. visibility/classification/PII 태깅 없이 중복.

### 2.5 Attachment — 파일 검증 분기
| 자산 | 근거 | §63 태그 |
|---|---|---|
| **`MediaHost` MIME/매직바이트** | `:81-91`(ALLOWED `:33-38`·매직바이트 `:88-91`·8MB `:46,86`·SHA-256·원자쓰기 `:98-104`·nosniff `:231`) | **CANONICAL**(파일검증 정본) |
| **`CreativeStore::brandAssetUpload`** | `:265-275`(5MB 캡만 `:271`·MIME/매직바이트/malware 미검증 직저장) | **BLOCKED_GAP**(실 보안결함) |
| `PM/Attachments` | `:25,33-34,67`(서명URL placeholder·MIME 미검증 저장) | skeleton |

### 2.6 결정↔집행 Mapping
- 선언적 Effect Mapping 부재. 2단계 분리는 **Mapping approve→apply**(`:287,327`)·**Alerting decide→execute**(`:601-655`) 2도메인에만 실재(workflow 전이·선언적 아님).

## 3. 판정

- Verdict: **CONSOLIDATION_REQUIRED** (동일 관심사 다중 중복 실존 — 신설 금지·기존 통합)
  - CANONICAL: Alerting decide/execute(결정↔집행)·MediaHost(파일검증).
  - VALIDATED_LEGACY: Mapping Maker-Checker.
  - KEEP_SEPARATE: Catalog approveQueue·AgencyPortal(도메인 특화).
  - **BLOCKED_GAP: CreativeStore 무검증**(MediaHost 경로로 통합 필요).
- 선행 의존: 통합 정본(Action Definition→Effect Mapping)이 §3 부재 → 통합의 상위 골격은 BLOCKED_PREREQUISITE.
- cover: 결정 커밋 로직 5도메인 실존·**단일 Effect Mapping 정본 = 0**.

## 4. 확장/구현 방향 (설계)

- **중복 신설 절대 금지**(레지스트리): 착수 전 grep 전수 완료 — 위 5도메인/파일검증 2분기가 정본 후보.
- 통합 정본: **Alerting decide/execute(CANONICAL)**를 범용 결정↔집행 엔진으로 확장, **AdminGrowth(CONSOLIDATION_REQUIRED)**를 이 경로로 흡수(사유/코멘트/버전 결여 해소).
- **파일 검증 단일화**: `MediaHost` 매직바이트 검증(CANONICAL)을 문서/실행파일까지 확장 + `CreativeStore::brandAssetUpload`를 MediaHost 경로로 통합(BLOCKED_GAP 제거) + Malware/DLP 신설.
- 재사용 substrate: `SecurityAudit::verify`(Evidence)·`Dsar` ANONYMIZE(Redaction)·omni_outbox(Outbox)·Tenant Guard(`index.php:404-420`).
- 무후퇴: 통합은 기존 도메인 승인 동작을 회귀 없이 Adapter 뒤로 흡수(§68).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_ACTION_FUNCTION_REGRESSION_GATE]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
