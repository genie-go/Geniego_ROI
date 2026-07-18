# DSAR — Decision Actions: 기존 구현 전수조사 (ⓑ)

> EPIC 06-A-03-02-02 Decision Actions Governance · 289차 13회차 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 읽기 전용 · 코드 변경 0.
> 방식: grep 전수 + 지목 파일 직접 정독(2 에이전트 병렬).

## 0. 결론 (Verdict up front)

**범용 Decision Action 프레임워크 부재.** APPROVE/REJECT(이진)만 5개 도메인에 산발 구현. RETURN·REQUEST_CHANGES·CANCEL·WITHDRAW·RESUBMIT·ACKNOWLEDGE·ABSTAIN·(결정)DEFER = **전부 ABSENT**. Reason=자유텍스트(taxonomy 부재)·Comment=note(visibility 전무)·Attachment=MediaHost 이미지 MIME 검증만·**Malware/DLP 리포 전역 no hits**.

## 1. 선행 6군 재검증 (§3)

| 군 | 판정 | 근거 |
|---|---|---|
| §3.1 Decision Core | **ABSENT** | `approval_decision` 0. in-place UPDATE 3핸들러(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`)·불변 Record/Slot/Commit/Idempotency/Lock/Snapshot/Outbox 부재 |
| §3.2 Sequential | **ABSENT** | `sequential_*/approval_stage/step` 0 → ★Return Target(단계복귀) 선행 부재 |
| §3.3 Assignment | **ABSENT** | `orderhub_claims`(`OrderHub.php:93,530`)=CS 반품/취소/교환 클레임 오탐·`PM/Assignees`=별 도메인·work-item claim/lease 없음 |
| §3.4 Authority/Delegation | **ABSENT** | `authority_resolution/delegation_resolution` 0·`index.php` 정적 RBAC만 |
| §3.5 Content/Document | **MIXED** | MediaHost/Dsar/SecurityAudit 실재·Malware/DLP/범용 Registry 부재(§4 상세) |
| §3.6 Identity/Security | **PRESENT** | Tenant Guard(`index.php:404-420`·`Alerting.php:580-582` IDOR)·`SecurityAudit::verify():56,64`(append-only 해시체인) |

## 2. 액션 실존

- **APPROVE=PRESENT(5+ 도메인)**: `AdminGrowth::approvalDecide`(admin_growth_approval·`:1289-1344`)·`Mapping::approve/apply`(Maker-Checker 다중승인·approvals_json·`:238-331`)·`Alerting::decideAction/executeAction`(action_request 2단계·`:572-655`)·`Catalog::approveQueue`(`:2383-2407`)·`AgencyPortal::approveAgency`(`:365-384`)+stub(budget/recon/FeedTemplate `routes.php:752,1868,1943-1998`).
- **REJECT=PARTIAL**: 이진 파생만(`Alerting.php:593` approve?approved:rejected·`AdminGrowth.php:1321` 화이트리스트)·**scope/부분거절 없음**·★AdminGrowth 거절은 **사유조차 안 받음**(`:1319-1331`).
- **RETURN/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER/ABSTAIN=승인도메인 실존 0**: withdraw=GDPR 동의철회·cancel=구독/결제 취소(`routes.php:979,1198`)·defer=메시지 STO(JourneyBuilder/Omnichannel)·recall=CustomerAI 지표. **결정 액션으로선 no hits.**

## 3. Reason / Comment

- **Reason=ABSENT**: `reason_code/rejection_reason` 0. 자유텍스트만(`ReturnsPortal.php:36` reason TEXT·`:324` NULLIF 원문 그룹핑·Mapping note). 정규화 taxonomy 없음.
- **Comment=PARTIAL**: `note` 단일 자유텍스트(Mapping/ReturnsPortal/Dsar)·**internal/external visibility·classification·PII 태깅·redaction 전무**.

## 4. ★Attachment/파일 검증 (§3.5)

- **Malware/DLP=ABSENT**: `malware/clamav/virus/dlp/quarantine` backend/src 전역 **0 hits**.
- **MIME 검증=MediaHost만 PRESENT**: `MediaHost.php:81-91`(data URI 파싱→ALLOWED 화이트리스트 jpg/png/gif/webp `:33-38`→`getimagesizefromstring` 매직바이트 재검증 `:88-91`)·8MB 캡(`:46,86`)·SHA-256 내용주소·원자적 쓰기(`:98-104`)·nosniff(`:231`)·GC(`:168`). **한계**: 이미지 4종 전용·무인증 공개 read(`:25`).
- **CreativeStore=무검증(BLOCKED_GAP)**: `brandAssetUpload`(`:265-275`) **5MB 캡만**(`:271`)·data_url MIME/매직바이트 미검증 직저장·type 클라이언트값 20자 절단.
- **PM/Attachments=명시 skeleton**: 서명URL placeholder(`:33-34` "storage backend 별도 트랙")·MIME 저장하나 미검증(`:67`)·100MB 캡(`:25`).
- **Attachment Manifest/Data Classification/PII/Retention(`DataPlatform.php:300` verified:false stub)/Legal Hold/Immutable Archive=전부 ABSENT.** 문서 redaction=DSAR PII 전용(`Dsar.php:89-97 ANONYMIZE·:765 applyAnon`).

## 5. Return Target / Change Request / Action 분리
- Return Target·Return Loop·Change Request Item = ABSENT. `mapping_change_request`는 매핑 제안(proposal)이지 반려 수정요청 항목 아님(`Mapping.php:209`).
- **Action Definition→Effect Mapping→Outcome 체계 ABSENT**. 결정=직접 `UPDATE SET status`. 단 **결정↔집행 2단계 분리**는 2도메인 실재(Mapping approve→apply `:287,327`·Alerting decide→execute `:593,601-655`·선언적 Effect Mapping 아님·workflow 전이).

## 6. §63 잠정 태그

| 자산 | §63 태그 | 근거 |
|---|---|---|
| `Alerting::decideAction/executeAction`(2단계) | **CANONICAL** | 결정↔집행 분리·실집행·IDOR 가드·결정액션 엔진 정본 후보(`Alerting.php:572-655`) |
| `Mapping::approve/apply`(Maker-Checker) | **VALIDATED_LEGACY** | 다중승인·자기승인차단·정족수(289차 G-01 강화·`:238-331`) |
| `AdminGrowth::approvalDecide` | **CONSOLIDATION_REQUIRED** | 이진 status UPDATE·사유/코멘트 없음(`:1289-1344`) |
| `Catalog::approveQueue`·`AgencyPortal::approveAgency` | **KEEP_SEPARATE** | 도메인 특화 큐/위임 승인 |
| **`MediaHost` MIME/매직바이트 검증** | **CANONICAL(파일검증 정본)** | 유일 실 매직바이트 검증(`:81-91`)·문서/첨부용 확장 대상 |
| **`CreativeStore::brandAssetUpload`** | **BLOCKED_GAP** | MIME/malware 무검증(`:265-275`)·MediaHost 경로로 통합 필요·★실 보안결함 |
| `Dsar` ANONYMIZE·`SecurityAudit::verify`·`omni_outbox`·Tenant Guard | **재사용 substrate** | Redaction 패턴·Evidence/Immutable Archive 토대·Outbox 패턴·격리 |

## 7. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)
1. **`CreativeStore::brandAssetUpload` 파일 무검증**(`:265-275`)=악성/실행 파일 업로드 창(BLOCKED_GAP·라이브 재증명 권장).
2. **Malware/DLP 스캔 전면 부재** — 첨부기반 액션 증거에 악성코드 검증 없음.
3. **REJECT 사유 taxonomy 부재**(AdminGrowth는 사유조차 없음) — 거절 근거 감사 불가.
4. **Return≠Reject·Cancel≠Withdraw 미구분** — 반려/취소 의미 혼용 위험(현재는 액션 자체가 부재).
5. **민감 Comment 노출 통제 부재**(visibility 없음).

## 8. 06-A-03-02-02 착수 판정
- **실·재사용(확장·재생성 금지)**: Alerting decide→execute(CANONICAL)·Mapping Maker-Checker(VALIDATED_LEGACY)·**MediaHost 파일검증(CANONICAL·첨부로 확장)**·SecurityAudit(Evidence)·Dsar ANONYMIZE(Redaction)·omni_outbox(Outbox)·Tenant Guard.
- **진짜 부재(순신규)**: Action Definition/Version/Policy/Capability/Effect/Outcome·RETURN/REQUEST_CHANGES/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER/ABSTAIN·Reason taxonomy·Comment visibility·Attachment Manifest/Malware/DLP·Change Request·Return Target·Resubmission Package·Action Conflict/Precedence/Snapshot/Reconciliation.
- **선행 6군 중 5군(Decision Core/Sequential/Assignment/Authority/Delegation) ABSENT + Content/Document 대부분 부재** → Action이 얹힐 Decision Record/Slot·Return 대상 Step·Case Version·Attachment 보안검증이 없어 **BLOCKED_PREREQUISITE**. 실 엔진=선행 신설 후 별도 승인세션(RP-002).

정본 결정=[[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]]. per-entity 판정=§70 DSAR 세트(ⓒ).
