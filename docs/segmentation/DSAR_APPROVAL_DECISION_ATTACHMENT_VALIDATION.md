# DSAR — Attachment Validation (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§44 ATTACHMENT_VALIDATION 검증 항목:

1. Tenant 소유권
2. File Registry / Object 존재
3. File Hash
4. MIME / Extension / Size
5. Malware Scan
6. DLP Scan
7. Encryption
8. Classification
9. Access
10. Retention
11. Legal Hold
12. Duplicate / Expired / Quarantined
13. Unsupported
14. Password-protected
15. Executable / Macro / Embedded Script
16. PII / Sensitive Data

★ **Client Filename / MIME 불신** — 클라이언트가 보낸 파일명·MIME는 신뢰하지 않고 실제 바이트로 판정한다.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거 — **일부만 실재**:

- **#4 MIME/Extension/Size = MediaHost만 실재 (CANONICAL, 이미지 4종 전용)**:
  - 허용 MIME 목록: `MediaHost.php:33-38`.
  - **매직바이트 실검증**: `MediaHost.php:88-91` — `getimagesizefromstring`으로 실제 바이트가 이미지인지 확인 → 확장자·클라이언트 MIME **불신**(§44 ★계약 충족).
  - 크기 한도: `MediaHost.php:46,86`(8MB).
- **#3 File Hash = 실재**: `MediaHost.php:93`(SHA-256 내용주소) · 원자적 쓰기 `MediaHost.php:98-104`.
- **#1 Tenant 소유권** = 결정 도메인 첨부 문맥에서는 미결부(MediaHost는 무인증 read `:25`, 첨부 소유권 검증 아님).
- **#5 Malware Scan · #6 DLP Scan = ABSENT** — malware/clamav/virus/dlp/quarantine grep 0. 실행파일/매크로/임베디드 스크립트/암호걸린 파일/PII 스캔(#14·#15·#16) 전부 부재.
- **#2 File Registry 존재 · #7 Encryption · #8 Classification · #10 Retention · #11 Legal Hold · #12 Duplicate/Expired/Quarantined** = 부재(Retention 방증 `DataPlatform.php:300` verified:false).
- **CreativeStore = 무검증 → BLOCKED_GAP**: `CreativeStore::brandAssetUpload`(`:265-275`)는 5MB 캡만·매직바이트/MIME/malware/DLP 검증 전무. `PM/Attachments`(`:25,33-34,67`)는 skeleton(미검증).

## 3. 판정

- **Verdict: PARTIAL**
  - **CANONICAL**: `MediaHost.php:81-91` MIME/매직바이트 실검증(§44 #4 + ★Client MIME 불신) — 이미지 4종 범위 내에서 정본.
  - **ABSENT**: Malware(#5)·DLP(#6)·Encryption(#7)·Classification(#8)·Retention(#10)·Legal Hold(#11)·Executable/Macro(#15)·PII(#16).
  - **BLOCKED_GAP**: `CreativeStore::brandAssetUpload`(`:265-275`) 무검증 업로드 — 결정 첨부로 승격 시 검증 우회 실위험.
- **선행 의존**: §3.5 Content/Document(File Registry·Malware/DLP 엔진 부재)·§42 Attachment Manifest·§43 Attachment Policy(검증이 참조할 정책 부재).
- **cover**: MediaHost MIME/Size/Hash 검증만 = 부분(이미지 4종). 나머지 검증 축 = 0.

## 4. 확장/구현 방향 (설계)

- **확장 기준점 = `MediaHost.php:81-91`** — 매직바이트 실검증·SHA-256·원자적 쓰기는 §44의 정본 패턴이다. 결정 첨부 검증 파이프라인은 이 패턴을 **일반 파일 타입으로 확장**하되, 이미지 전용 로직(`getimagesizefromstring`)을 범용 매직바이트 검증기로 승격.
- **BLOCKED_GAP 차단(실위험)**: `CreativeStore::brandAssetUpload`(`:265-275`)의 무검증 업로드가 결정 액션 첨부 경로로 유입되지 않도록 정책 게이트(§43)로 fail-closed — 무검증 파일은 결정 첨부로 봉인 금지.
- **Malware/DLP는 순신규 Mandatory Control** — §58 High Gap. 검증 통과 전 첨부는 `manifest.malware_scan_status=PENDING`으로 Quarantine, Committed 결정에 결합 금지.
- ★ **Client Filename/MIME 불신 원칙 전역 적용** — CreativeStore가 클라이언트 MIME을 신뢰하는 부분을 MediaHost식 실바이트 판정으로 교정(§58 "Client Filename/MIME" Gap).
- **무후퇴**: MediaHost 이미지 검증(`:81-91`)은 회귀 금지 대상(§68 Function Regression Gate). 확장은 그 위에 얹되 기존 4종 이미지 경로를 훼손하지 않는다.
- 실 구현 = 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
