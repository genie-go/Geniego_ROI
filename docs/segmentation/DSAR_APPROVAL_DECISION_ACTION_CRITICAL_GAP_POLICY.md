# DSAR — Action Critical Gap Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§58 `ACTION_CRITICAL_GAP_POLICY` — High/Critical 차단 목록 (원문 전사):

1. **Action Version 없음** — 액션이 불변 버전에 고정되지 않음(당시 규칙 재현 불가).
2. **Action·Outcome 혼용** — Action Type ↔ Outcome 1:1 하드코딩(§14 Versioned Mapping 위반).
3. **Return·Reject 혼용** — 반려(재작업 복귀)와 거절(종결)을 같은 상태로 처리.
4. **Cancel·Withdraw 혼용** — 관리적 취소와 요청자 회수 미구분(§28 경계 위반).
5. **Withdraw·Request Changes·Return 혼용** — 회수/변경요청/복귀 의미 융합.
6. **Reason 누락** — 거절/반려/취소에 정규화 사유(taxonomy) 미부착.
7. **Comment 누락** — 결정 근거 코멘트 미기록.
8. **Attachment 누락** — 필수 증빙 미검증 통과.
9. **Malware/DLP 없음** — 첨부에 악성코드/데이터유출 스캔 부재.
10. **Invalid/Cross-Case/Forward Return** — 무효 대상·타 Case·전방(미도래 단계) 복귀.
11. **Return Loop / Max 초과** — 순환 반려·최대 반려횟수 미차단.
12. **Change Item 없음** — REQUEST_CHANGES에 변경항목 ≥1 미강제.
13. **Resubmit 미해결 / Version 누락** — 미해결 Change Item 잔존·Case Version 미증가 재제출.
14. **Cancel 권한 / Withdraw Actor** — 권한 없는 취소·비소유자 회수.
15. **Irreversible 이후** — 확정 Settlement/Payment/Contract 이후 취소·회수.
16. **APPROVE+REJECT** — 상호배타 액션 동시 커밋(§49 위반).
17. **Terminal 중복** — 동일 Slot 다중 종결 액션.
18. **Effect/Assignment/Claim·Lease/Sequential Effect 누락** — 결정 후 부수효과 미적용(부분 집행).
19. **Record 수정** — Committed Decision Record in-place 변경.
20. **UI-only** — 서버 검증 없는 화면단 액션.
21. **Client Filename/MIME** — 클라이언트 신고값 신뢰(서버 매직바이트 미검증).
22. **Comment Visibility** — visibility 정책 없이 민감 코멘트 저장.
23. **민감 노출** — 내부 전용 코멘트/사유의 요청자 자동노출.
24. **Snapshot/Audit 누락** — 액션 시점 스냅샷·감사이벤트 미생성.
25. **Mandatory Control 제거** — 필수 통제(Reason/Malware/Tenant Guard 등) 우회.
26. **중복 Entity** — 동일 Action/Effect/Outcome 재구현(§64).

## 2. 기존 구현 대조 (Gap 전사 — 대부분 미방지)

리포지토리는 위 26개 Critical Gap 중 **대부분을 방지하지 못한다** (정직 판정 — 능력 기반):

| Gap | 방지 여부 | 근거(허용목록) |
|---|---|---|
| Action Version 없음 | **미방지** | 액션이 status 문자열에 융합·불변 버전 부재 |
| Action·Outcome 혼용 | **미방지** | 직접 `UPDATE SET status`·Versioned Mapping 부재 |
| Return·Reject 혼용 | **미방지** | RETURN 액션 자체 ABSENT → 반려를 거절로만 표현 |
| Cancel·Withdraw 혼용 | **미방지** | 둘 다 승인도메인 ABSENT |
| Reason 누락 | **미방지** | `reason_code` 0·자유텍스트(`ReturnsPortal.php:36,324`)·★AdminGrowth 거절 사유 미수취(`AdminGrowth.php:1319-1331`) |
| Comment 누락 | **부분** | `note` 자유텍스트만·visibility/classification 전무 |
| **Malware/DLP 없음** | **미방지(BLOCKED_GAP)** | `malware/clamav/virus/dlp/quarantine` 전역 0 hits |
| Client Filename/MIME | **부분방지** | **MediaHost만** 매직바이트 재검증(`MediaHost.php:88-91`)·나머지 미검증 |
| **CreativeStore 무검증** | **미방지(BLOCKED_GAP)** | `brandAssetUpload`(`:265-275`) 5MB 캡만(`:271`)·MIME/매직바이트 미검증 직저장 |
| Effect/부수효과 누락 | **미방지** | Alerting decide↔execute 비원자·무아웃박스(`Alerting.php:601-655`) 부분집행 위험 |
| Record 수정 | **미방지** | in-place UPDATE(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`) |
| Comment Visibility / 민감 노출 | **미방지** | visibility enum 부재 |
| Snapshot/Audit 누락 | **부분** | SecurityAudit 해시체인(`:56,64`) 실재하나 액션 스냅샷 미결합 |
| APPROVE+REJECT / Terminal 중복 | **미방지** | Compatibility/Conflict 검증(§49/§50) ABSENT |
| Return Loop / Cross-Case / Forward | **N/A(선행부재)** | RETURN·Return Target·Case 계보 선행 ABSENT |

## 3. 판정

- Verdict: **BLOCKED_GAP** (정책 전사됨 · 대부분 Gap 미방지 · 2건은 실 보안결함)
- 선행 의존: §3.1 Decision Core(불변 Record/Snapshot)·§3.2 Sequential(Return Target)·§3.5 Content/Document(Malware/DLP) 부재 → 다수 Gap은 **BLOCKED_PREREQUISITE**로만 방지 가능.
- cover: **0** (범용 Gap 방지 정책 부재) · 실효 통제는 MediaHost MIME 검증(부분)·SecurityAudit 해시체인(부분)뿐.

## 4. 확장/구현 방향 (설계)

- **BLOCKED_GAP 2건은 최우선 실 위험**으로 명시:
  1. **CreativeStore `brandAssetUpload` 무검증**(`CreativeStore.php:265-275`) — 악성/실행 파일 업로드 창. MediaHost 매직바이트 검증 경로(§64 CANONICAL)로 통합해 해소.
  2. **Malware/DLP 전면 부재** — 첨부기반 액션 증거에 스캔 부재. Attachment Validation(§44) 필수통제로 신설.
- Gap 방지 정책은 순신규 — 26개 Critical Gap을 Static Lint(§59)·Runtime Guards(§60)·Error Contract(§61)로 강제. 각 Gap은 대응 Error 코드(§61)로 매핑돼 무음 통과 불가.
- Golden Rule(Extend): `AdminGrowth::approvalDecide:1321` 화이트리스트를 Reason 필수·Version 강제로 확장. `Alerting::decideAction:594` else 무음 폴백 제거(미지원 액션 오분류=Gap #2).
- 무후퇴: 기존 실효 통제(MediaHost 매직바이트·SecurityAudit 해시체인·Tenant Guard `index.php:404-420`)는 Gap 방지 substrate로 보존(§68).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
