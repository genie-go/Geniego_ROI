# ADR — Canonical Audience Builder Foundation, Schema & Build Pipeline (EPIC 06-A Part 3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Audience Builder Foundation 계약 명세 확정. 비파괴 — 코드변경 0). 실 스토어/파이프라인/Preview/Snapshot 구현·기존 발송경로 통합은 후속 승인 세션(Golden Dataset+Build Equivalence+verify+배포승인). **외부 Destination 업로드·발송은 본 단계 범위 밖(§3.9).**
- **근거**: [`../segmentation/CANONICAL_AUDIENCE_SCHEMA.md`](../segmentation/CANONICAL_AUDIENCE_SCHEMA.md) · [`BUILD_PIPELINE`](../segmentation/CANONICAL_AUDIENCE_BUILD_PIPELINE.md) · [`GOVERNANCE`](../segmentation/CANONICAL_AUDIENCE_GOVERNANCE.md) · Part 1 인벤토리 · Part 2 Canonical Segment.

## 결정 (핵심)

1. **Segment Membership ≠ Audience Member(§3.1)**: Segment 논리 결과와 실행 후보를 분리. Audience Definition/Version/**Snapshot(불변)**/Candidate/Member/Exclusion 엔티티 신설 — 현행은 이 계층이 **전무**(발송루프 즉석필터, SEG-H4/H5). Snapshot 불변성이 과거 대상 재현·Reconciliation 기준.

2. **기존 자산 확장·보존(§3.10)**: AdAdapters 아웃바운드(Meta/Google/TikTok·해시전용·10k캡·demo→[])는 **Destination(Part 3-3) VALIDATED_LEGACY 로 보존**. refreshSegmentForSend+발송루프는 CONSOLIDATION_REQUIRED(Canonical Build+Snapshot 로 앞단 대체). Identity=EPIC05 재사용(refreshSegmentMembers 의 identity_id 통합, 자체 Identity Resolution 구현 금지 §30). **CRM/광고/Email별 독립 Builder 신설 금지 — 단일 Canonical Builder + 목적 Adapter.**

3. **Purpose 필수·Version 고정(§3.2·§3.3)**: 목적 없는 Audience 금지. "현재 Segment" 모호참조 금지 → segment_version_id/membership_snapshot_id 고정. 정책 버전을 Audience Version·Snapshot 에 핀.

4. **Exclusion·Suppression 우선(§3.5)**: Legal Block > Global Suppression > Deletion > Explicit Exclusion > Channel/Brand Suppression > Identity Block > Eligibility > Inclusion. 현행 Exclusion=email_suppression(email만)·phone DNC 부재(SEG-C4/H3) → Exclusion Source 계약으로 legal/tombstone/phone 확대(실 스토어=P0 구현세션).

5. **Preview=Build 동일 Pipeline(§3.7)**: Preview 가 Count Query, 실 Build 가 다른 조건 사용 금지. 현행 Preview 부재 → 신규. Count 유형(Candidate/Unique Profile/Unique Person/Eligible/Final/Destination-ready) 구분 표기.

6. **멱등·Lock·Fail-closed(§37-40)**: Idempotency Key·Build Lock·Checkpoint(정책변경 후 재사용 금지)·Partial Failure 는 마케팅 실행 Snapshot 에 기본 fail-closed. Queue PII 원문 불포함(해시/참조). Dedup 결정론(§34, DB 반환순서 금지).

7. **Static List Governance 신설(§27-29)**: 현행 Static List 기능 **진짜 부재** → 신설(Malware Scan·Consent Evidence·Tenant Scope·Retention·Audit). Public URL Import·평문 PII 장기보관·Hardcoded ID 금지.

8. **정직·무후퇴**: Audience Snapshot/Preview/Diff/Approval/Removal/Reconciliation=현행 부재→목표계약 명시. AdAdapters 해시전용·audience_mode 배선 보존. Build Equivalence 의 `UNEXPLAINED`/`LEGACY_WRONG_TARGET_RISK` → Production 전환 차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§93)
신규 Audience Builder/Customer List/Static List/Candidate Builder/Dedup Engine/Snapshot Store 생성 전: Canonical Audience Registry·Existing Audience Store·Segment Version·Customer Identity·Inclusion/Exclusion·Consent/Suppression·Static List Governance·Existing Builder/Preview/Count 조회 → 기존 확장 우선 증명 · Snapshot/Version/Expiry·Scope·Wrong-target·Rollback 정의 · 중복/후퇴·ADR/PM 기록. **CRM/광고/Email별 독립 Canonical Audience Builder 중복 생성 금지.**

## 결과
Canonical Audience Builder Foundation·Schema·Build Pipeline·Snapshot 불변성·Static List Governance·Lint/Guard·Golden/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_AUDIENCE_{SCHEMA,BUILD_PIPELINE,GOVERNANCE}.md(§85 70여 문서 통합). 다음 **EPIC 06-A Part 3-2 — Audience Eligibility Engine** 입력 준비 완료. 선행 P0(구현세션)=발송 게이트 표준화(SEG-C1~C4)·Audience 업로드 consent/Removal/Reconciliation(SEG-H1/H2/H5) — 본 Foundation 의 Snapshot·Exclusion·Consent Resolver 계약이 구현 기반.
