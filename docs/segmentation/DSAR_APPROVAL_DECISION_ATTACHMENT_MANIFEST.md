# DSAR — Attachment Manifest (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§42 ATTACHMENT_MANIFEST 필수 필드:

1. `manifest_id`
2. `tenant_id`
3. `decision_command_id` / `decision_record_id`
4. `action_type`
5. `attachment_count`
6. `file_registry_ids` / `document_registry_ids`
7. `total_size`
8. `manifest_hash`
9. `malware_scan_status`
10. `dlp_status`
11. `classification_status`
12. `retention_policy`
13. `legal_hold_status`
14. `created_at`
15. `immutable_hash`
16. `status`
17. `evidence`

핵심 계약: 결정 액션 1건에 결부된 첨부의 **집합을 단일 불변 레코드로 봉인**한다 — 파일 개수·총량·각 파일의 Registry 참조·전체 매니페스트 해시·malware/DLP/classification 상태·보존·Legal Hold를 하나의 서명된 단위로 고정한다. 첨부는 매니페스트를 통해서만 결정 레코드에 결합된다(개별 파일 직결 금지).

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Attachment Manifest 개념 = ABSENT.** 결정 액션에 결부된 첨부의 집합을 봉인하는 불변 레코드가 없다. Manifest/Classification/PII/Retention/Legal Hold/Immutable Archive 전부 부재.
- 파일 저장 자산은 **개별·산발**로만 존재: `MediaHost.php:81-91`(이미지 4종 전용·매니페스트 아님)·`CreativeStore::brandAssetUpload`(`:265-275`·무검증)·`PM/Attachments`(`:25,33-34,67`·skeleton).
- 이 자산들은 **결정 액션(APPROVE/REJECT/RETURN…)과 결부되지 않는다** — 어느 결정에 어떤 첨부가 묶였는지 봉인하는 단위가 없다.
- Retention 미검증 상태의 방증: `DataPlatform.php:300`(verified:false).
- 첨부의 malware/DLP/classification 상태를 담을 필드도 없다(§44 판정과 동형 — Malware/DLP ABSENT).

## 3. 판정

- **Verdict: ABSENT**
- **선행 의존**: §3.1 Decision Core(불변 Record/Slot/Commit 부재 — in-place UPDATE `Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`) 및 §3.5 Content/Document(범용 File/Document Registry 부재). 매니페스트는 "불변 결정 레코드"와 "파일 Registry"를 모두 참조하므로 두 선행이 없으면 봉인 대상 자체가 없다 → **BLOCKED_PREREQUISITE**.
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Attachment Manifest는 **순신규**다. Decision Core(불변 Record)와 File/Document Registry 선행 신설 후에만 결부 가능 — 그 전에는 봉인할 불변 레코드도, 참조할 File Registry도 없다.
- 재사용할 실존 자산: `MediaHost.php:98-104`의 **원자적 쓰기·SHA-256 내용주소**(`:93` `hash('sha256')`)는 개별 파일의 무결성 해시 산출 패턴으로 참조 가능하나, MediaHost는 이미지 4종·무인증 read(`:25`) 전용이므로 **결정 첨부의 Manifest로 전용 금지**(KEEP_SEPARATE).
- **Mandatory Control**: 매니페스트 해시(`manifest_hash`)와 `immutable_hash`는 봉인 후 수정 불가 — Committed 결정의 첨부 집합을 사후 교체하는 경로를 원천 차단(§58 "Record 수정" 금지와 동형). 정정은 새 Manifest Record.
- **무후퇴**: 기존 MediaHost/CreativeStore 파일 저장 경로를 대체·삭제하지 않는다. Manifest는 그 위에 얹히는 상위 결합 레이어다.
- 실 구현 = 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
