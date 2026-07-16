# ADR — Retention, Archival & Data Lifecycle Governance (EPIC 06-A Part 3-3-3-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Retention·Archival·Data Lifecycle 계약 명세 확정. 비파괴 — 코드변경 0). 실 Data Asset Registry·Retention Calculation Engine·Expiry Job·Orphan/Shadow Detector·Reconciliation·CI 가드 구현은 후속 승인 세션(Golden Retention Dataset+Storage Conformance+Legacy Equivalence+verify+배포승인). **근거없는 무기한 보존·회귀검증 없는 대량 Hard Delete·기존 Backup/Restore 제거·법률 기간 자동확정 금지·DSAR/RTBF/Cross-border=Part 3-3-3-3~6.**
- **근거**: [`../segmentation/CANONICAL_RETENTION_SCHEMA.md`](../segmentation/CANONICAL_RETENTION_SCHEMA.md) · [`DOMAIN_STORAGE`](../segmentation/CANONICAL_RETENTION_DOMAIN_STORAGE.md) · [`ENFORCEMENT`](../segmentation/CANONICAL_RETENTION_ENFORCEMENT.md) · 기존 인프라(cron·Dsar·email_suppression 보존·dist.bak 278차·ai_settings) · Part 3-3-3-1 Privacy.

## 결정 (핵심)

1. **기존 Lifecycle 확장(재구현 금지)**: cron cleanup·backup·restore·Dsar 삭제·email_suppression 보존·Db.sqlite fallback 는 **정본 — Lifecycle Governance 로 확장**. 기능/채널/Storage별 독립 Retention Engine 신설 금지(§126). 정식 Data Asset Registry/Retention Policy/Archive/Orphan Detector 는 현행 부재→신설.

2. **무기한 보존 금지·전역 단일기간 금지(§3.1·3.2)**: 기술편의/미래 AI 활용가능성만으로 Personal Data 무기한 보존 금지. `PERMANENT` 일반 Class 금지. Data Category/Purpose/Subject/Jurisdiction/Contract/Relationship/Consent/Suppression/Legal Hold/Activity별 계산. Trigger 불명 시 임의날짜 추정 금지(Manual Review/보수정책).

3. **조기삭제·과도보존 둘 다 결함(§3.9)**: 조기삭제=Customer 기능/계약/환불·분쟁/Audit/Compliance/Model 재현성/Unmerge/Incident 훼손. 과도보존=Privacy/Security/비용. Reconciliation 에서 RETAINED_TOO_LONG·DELETED_TOO_EARLY 둘 다 Critical Defect.

4. **Archive≠삭제 대체·Backup 삭제 무시 금지(§3.3·3.5)**: Archive 는 목적/기간/암호화/무결성/만료후 삭제. 삭제 Subject 가 Backup/Archive Restore 로 재등장 금지 → **Deletion Tombstone·Restore Filter·Deletion Replay·Post-restore Reconciliation**(Part3-3-1 Consent/Part3-3-2 Suppression Recheck 정합).

5. **Cache/Index/Queue/복사본도 Lifecycle 대상·Orphan/Shadow 탐지(§3.6)**: Primary 삭제≠완료 — Cache/Search/Graph/Queue/DLQ/Export/Object Storage/Provider Staging/AI Prompt Log 정리. **dist.bak 누적 FS 100%(278차)=Shadow Copy 재발방지** 명시. Owner/Purpose/Policy 없는 Table/Bucket/File=Orphan/Shadow 분류·제거.

6. **Expiry≠즉시 Hard Delete·Dry Run·멱등(§3.8·79-83)**: Delete/Anonymize/Aggregate/Pseudonymize/Archive/Restrict/Tombstone 중 Data Category별 선택. 대량 Expiry=Dry Run(대상수·Hold 제외·Customer 영향)·Checkpoint·Idempotency·Kill Switch·Evidence. Anonymize=Re-identification Risk 검증(No-PII 정합). Audit 보존≠Full PII(Reference/Hash).

7. **Provider Retention·Runtime Enforcement(§76·96)**: 내부 삭제만으로 전체 Lifecycle 완료 선언 금지(Provider Delete/Reconciliation=SEG-H2/H5 정합). 만료 데이터의 신규 Query/Export/AI Training/Audience/Automation/Provider 재전송 Runtime 차단.

8. **정직·무후퇴·법률**: Retention Registry/Archive Platform/Orphan Detector/Reconciliation=현행 부재→목표계약. 법률 기간 코드 자동확정 금지→LEGAL_REVIEW_REQUIRED. 기존 cron/backup/restore/Db.sqlite fallback 보존(Legacy Equivalence). UNEXPLAINED·LEGACY_DATA_LOSS_RISK·고객영향 LEGACY_PRIVACY_DEFECT→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§126)
신규 Table/Storage/Cache/Queue/Index/Archive/Backup/AI Dataset 생성 전: Data Asset Registry·Data Category·Purpose·Retention Policy Registry 조회 → Retention Class/Trigger·SoT/Replica·Active/Archive/Delete Lifecycle·Legal Hold·Backup/Restore/Deletion Replay·Cache/Index/Queue Cleanup·Provider Retention·Orphan/Shadow 위험·Runtime Expiry Enforcement 정의 · 중복/후퇴·ADR/PM 기록. **기능/채널/Storage별 독립 Retention Engine 중복 생성 금지.**

## 결과
Data Asset Registry·Retention Policy/Class/Trigger·Calculation Engine·Active/Cold/Archive·Legal Hold/Exception·Domain Retention(Customer/Consent/Suppression/Segment/Audience/Event/Metric/AI/Log)·Storage Lifecycle(Cache/Index/Graph/Queue/Backup/Snapshot/Replica/Provider)·Expiry Job/Dry Run·Secure Delete/Anonymize/Aggregate·Orphan/Shadow·Reconciliation/Drift·Runtime Enforcement·Lint/Guard·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_RETENTION_{SCHEMA,DOMAIN_STORAGE,ENFORCEMENT}.md(§118 110여 문서 통합). 다음 **EPIC 06-A Part 3-3-3-3 — DSAR Access, Export, Rectification & Processing Restriction** 입력 준비 완료.
