# ADR — Decision Actions Governance (EPIC 06-A-03-02-02)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 6군 신설 후 별도 승인세션)
- **차수**: 289차 13회차 (2026-07-18)
- **스펙**: [`SPEC_06A_03_02_02_DECISION_ACTIONS_VERBATIM`](../segmentation/SPEC_06A_03_02_02_DECISION_ACTIONS_VERBATIM.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION.md)
- **선행**: [`ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE`](ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE.md)(06-A-03-02-01) · [`ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION`](ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION.md)(06-A-03-01) · [`ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE`](ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE.md)(06-A-02)

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-02는 Decision Processing Core 위에서 실제 승인 Action(APPROVE/REJECT/RETURN/REQUEST_CHANGES/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER/ABSTAIN)의 의미·조건·상태효과·사유·의견·첨부·대상단계·재제출 규칙을 요구한다. §3은 6개 선행군(Decision Core·Sequential·Assignment·Authority/Delegation·Content/Document·Identity/Security)을 전제한다.

능력 기반 전수조사(ⓑ·2 에이전트·코드 정독): **범용 Decision Action 프레임워크 부재.** APPROVE/REJECT(이진)만 5도메인 산발. RETURN 등 7 액션 ABSENT. Reason=자유텍스트·Attachment 보안검증(Malware/DLP) 전면 부재.

## 2. 결정 (Decision)

### D-1. Canonical Decision Action 도메인을 **신설**하되 실존 정본/패턴을 확장(Golden Rule)

| 실존 | §63 태그 | 확장 결정 |
|---|---|---|
| `Alerting::decideAction/executeAction`(결정↔집행 2단계) | **CANONICAL** | Action Effect(결정→집행) 분리의 정본 후보(`Alerting.php:572-655`)·선언적 Effect Mapping으로 일반화. |
| `Mapping::approve/apply`(Maker-Checker 다중승인) | **VALIDATED_LEGACY** | 자기승인 차단·정족수(`:238-331`)를 Action Eligibility/SoD로 승격. |
| **`MediaHost` MIME/매직바이트 검증** | **CANONICAL(파일검증 정본)** | Attachment Validation의 유일 실검증(`:81-91`)·이미지 4종→범용 문서/첨부로 **확장**(무인증 read 한계 보완). |
| `SecurityAudit::verify`·`Dsar` ANONYMIZE·`omni_outbox`·Tenant Guard | **재사용 substrate** | Evidence/Immutable Archive·Comment Redaction·Outbox·격리 토대. |
| `AdminGrowth::approvalDecide`·`Catalog::approveQueue`·`AgencyPortal` | **CONSOLIDATION_REQUIRED / KEEP_SEPARATE** | 이진 status 승인은 Canonical Action으로 흡수·도메인 큐는 별개. |

### D-2. **BLOCKED_GAP** — `CreativeStore::brandAssetUpload` 파일 무검증 (★실 위험)

`brandAssetUpload`(`:265-275`)가 5MB 캡만 두고 data_url을 MIME/매직바이트/malware 검증 없이 직저장 → 악성/실행 파일 업로드 창. Attachment Validation은 `MediaHost` 검증 경로로 통합하고 이 무검증 업로드를 흡수해야 한다. **별도 수정세션 후보**(라이브 재증명).

### D-3. **구현 BLOCKED_PREREQUISITE** — 선행 6군 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Decision Core · §3.2 Sequential · §3.3 Assignment · §3.4 Authority/Delegation | **ABSENT** |
| §3.5 Content/Document | **MIXED**(MediaHost 이미지검증 PRESENT·Malware/DLP/범용 Registry ABSENT) |
| §3.6 Identity/Security | **PRESENT**(Tenant Guard·SecurityAudit verify) |

→ Action이 얹힐 **Decision Record/Slot**(§3.1)·**Return 대상 Step**(§3.2)·**Case Version**(Resubmit)·**Attachment 보안검증**(§3.5 Malware/DLP)이 부재 → **§70 per-entity 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직판정. 이번 차수=설계 명세(코드 0).

### D-4. 필수 도메인 분리 (§5·구현 시 강제)

Action Type≠Outcome · Action≠Transition · Reason(taxonomy)≠Comment(텍스트)≠Attachment(파일) · RETURN≠REJECT · REQUEST_CHANGES≠RETURN · CANCEL≠WITHDRAW · ACKNOWLEDGE≠APPROVE. Decision Action Engine은 Sequential Cursor 직접변경 금지(Reference Event만). Committed Decision Record 수정 금지(새 Action+Record).

### D-5. Mandatory Control 고객설정 비활성 불가(§5.11)

Tenant Isolation·Actor/Action Eligibility·Return Target Validation·Controlled Action Reason Requirement·Immutable Record·Attachment Security Validation·Sequential Effect Validation·Duplicate Action Guard·Snapshot·Audit·Reconciliation.

## 3. ★실 위험 (별도 수정세션 후보)

1. **CreativeStore 파일 무검증**(BLOCKED_GAP·D-2).
2. **Malware/DLP 스캔 전면 부재** — 첨부 액션 증거 악성코드 검증 없음.
3. **REJECT 사유 taxonomy 부재**(AdminGrowth는 사유 미입력) — 거절 근거 감사 불가.
4. **Return≠Reject·Cancel≠Withdraw 미구분**(액션 자체 부재).
5. **민감 Comment 노출 통제 부재**(visibility 없음).

## 4. 대안 (Considered)

- **A. 지금 Action 도메인 구현** — 기각. 선행 6군 중 5군 ABSENT(D-3)·Decision Record/Slot 없이 Action Effect 얹을 대상 없음. RP-002 위반.
- **B. 기존 approve/reject를 Action으로 개칭** — 기각. 불변 Record·Reason taxonomy·Attachment 검증 없이 이름만 바꾸면 가짜 녹색.
- **C. 설계 명세만(코드 0)+실존 정본 확장계획+선행 전제 명문화** — **채택**. 06-A 계열 일관.

## 5. 귀결 (Consequences)

- (+) Alerting decide/execute·Mapping Maker-Checker·**MediaHost 파일검증**·SecurityAudit·Dsar redaction의 정본 지위·확장점 확정.
- (+) 선행 6군 전제·실 위험 5건(특히 CreativeStore 무검증·Malware/DLP 부재) 문서화.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: 선행 6군 실구현 → Decision Action 실 엔진 → EPIC 06-A-03-02-03 Decision Integrity & Security Governance.

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 Action 도메인 금지 · 무후퇴 · "결론의 근거도 재실증"(코드 정독) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002.
