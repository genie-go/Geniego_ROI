# DSAR — Attachment Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§43 ATTACHMENT_POLICY 필수 필드:

1. `action_type`
2. `required`
3. `minimum_count` / `maximum_count`
4. `maximum_total_size`
5. `allowed_MIME_types`
6. `prohibited_extensions`
7. `malware_scan_required`
8. `dlp_scan_required`
9. `encryption_required`
10. `data_classification`
11. `retention_period`
12. `legal_hold_support`
13. `external_sharing_policy`
14. `download_policy`
15. `preview_policy`
16. `redaction_policy`
17. `immutable_archive_policy`

핵심 계약: 어떤 결정 액션이 **어떤 첨부를 요구/허용/금지**하는지를 **정책(데이터)** 으로 선언한다 — 필수 여부·개수/총량 한도·허용 MIME·금지 확장자·malware/DLP/암호화 요구·데이터 분류·보존기간·Legal Hold·외부공유/다운로드/미리보기/redaction/불변 아카이브 정책. 정책은 액션 타입별로 versioned.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Attachment Policy 개념 = ABSENT.** 액션 타입별로 첨부 요구·한도·검증 요구를 선언하는 정책 축이 없다. 존재하는 것은 **산발적으로 하드코딩된 크기 캡뿐**이다:
  - `MediaHost.php:46,86` — 장당 **8MB** 상한(`MAX_BYTES`), 허용 MIME 4종 하드코딩(`:33-38`).
  - `CreativeStore::brandAssetUpload`(`:265-275`) — **5MB 캡만**·그 외 무검증.
- 이 캡들은 **정책이 아니라 각 핸들러에 박힌 상수**다 — 액션 타입(APPROVE/REJECT/RETURN…)과 무관하고, 테넌트별·도메인별로 바꿀 수 없으며, versioned도 아니다.
- `required`/`minimum_count`/`prohibited_extensions`/`malware_scan_required`/`dlp_scan_required`/`encryption_required`/`data_classification`/`retention_period`/`legal_hold_support`/`redaction`/`immutable_archive` = **전부 부재**(Malware/DLP grep 0 · Retention `DataPlatform.php:300` verified:false).
- redaction은 DSAR PII 경로에만 국소 존재(`Dsar.php:89-97,765`) — 첨부 정책이 아니다.

## 3. 판정

- **Verdict: ABSENT** (산발 하드코딩 캡만 — 정책 축 부재)
- **선행 의존**: §3.5 Content/Document(범용 파일 정책 레이어 부재) 및 Action Definition/Version(§8/§9 — 정책이 결부될 액션 타입 정의 부재). 액션별 정책이므로 액션 정의 없이는 결부 대상이 없다.
- **cover: 0** (MediaHost 8MB·CreativeStore 5MB 캡은 정책의 선례가 아니라 이관 대상 부채)

## 4. 확장/구현 방향 (설계)

- Attachment Policy는 **순신규 정책 축**이다. 현행 하드코딩 캡(`MediaHost.php:46`·CreativeStore 5MB)은 정책 값의 **선례가 아니라 부채** — 정책화 시 이 상수들은 정책 레코드의 초기값으로 흡수하되 코드 상수를 SoT로 삼지 않는다.
- **Mandatory Control 승격**: `malware_scan_required`·`dlp_scan_required`는 정책에서 액션별로 기본 참(특히 외부 제출·요청자 첨부)으로 세운다 — 현행 무검증 업로드(CreativeStore `:265-275`)가 결정 첨부로 승격되지 않도록 정책 게이트로 차단(§58 "Malware/DLP 없음" High Gap).
- **allowed_MIME_types / prohibited_extensions**는 `MediaHost.php:33-38`의 허용목록 패턴을 참조하되, 이미지 4종 고정이 아니라 정책 데이터로 확장.
- **무후퇴**: 기존 MediaHost·CreativeStore 저장 경로를 대체하지 않는다. Policy는 결정 액션 첨부에 대한 상위 게이트로만 작동.
- 실 구현 = 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
