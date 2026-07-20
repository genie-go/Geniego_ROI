# DSAR — Authorization Digital Twin Event (Part 3-22 §2·§6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC §2·§6)

**APPROVAL_TWIN_EVENT**는 트윈 상태를 재구성·전진시키는 **replay event 스트림**의 계약이다. 각 event는 원본 authz 표면에서 발생한 인가 결정(role/scope 부여·승인·위임·정책 평가)의 시간순·무결성 보장 기록으로, 트윈은 이 스트림을 재생(replay)하여 As-Of 상태를 결정론적으로 도출한다. Event는 상태의 유일 진실 소스이며 스트림 자체는 불변이다.

Event 필수 속성:

| 속성 | 의미 |
|------|------|
| Event ID | 스트림 내 유일·순서 보장 식별자 |
| Sequence | 시간순 offset(재생 순서의 SSOT) |
| Authz Delta | 결정 변화(부여/회수/승인/위임/정책 평가) |
| Integrity Link | 이전 event 대비 무결성 연결(해시체인) |
| Source | 원본 event 소스 계보 |

## 2. 실존 substrate 매핑

| 요소 | 상태 | 근거 |
|------|------|------|
| replay event 스트림(트윈 전용) | **ABSENT**(replay 엔진) | grep 0 — 트윈 replay·As-Of 재생 엔진 전무 |
| SecurityAudit 해시체인 | PRESENT(소스) | `backend/src/SecurityAudit.php:27` · `:56-67` |
| auth_audit_log 시간순 event | PRESENT(소스) | `backend/src/Handlers/UserAuth.php:4165` · `:4166` |
| collectAuditEvents UNION(소스 통합) | PRESENT(소스) | `backend/src/Handlers/Compliance.php:133-151` |
| 메시지 브로커(스트림 backbone) | **ABSENT** | `backend/composer.json:5-13` |

★**PARTIAL-소스 판정**: replay event로 확장 가능한 실존 소스가 있다. SecurityAudit 해시체인(`SecurityAudit.php:27`·`:56-67`)은 무결성 연결(Integrity Link) 소스, auth_audit_log(`UserAuth.php:4165`·`:4166`)는 시간순 event 소스, collectAuditEvents UNION(`Compliance.php:133-151`)은 소스 통합 지점을 제공한다. 이들을 replay event 스트림으로 **확장**하되, As-Of 재생 엔진 자체는 순신설이다.

## 3. 설계 계약(규칙)

- (R1) Event 스트림은 append-only·불변. Sequence는 시간순 SSOT, 재정렬 금지.
- (R2) 트윈 replay는 동일 스트림 입력 → 동일 상태(결정론) 보장.
- (R3) Integrity Link(해시체인 `SecurityAudit.php:56-67`) 검증 실패 event는 스트림 신뢰 경계에서 격리.
- (R4) 소스 통합은 collectAuditEvents UNION(`Compliance.php:133-151`) 패턴 재사용 — 중복 event 파이프라인 신설 금지.

## 4. KEEP_SEPARATE

- **attribution pixel_events**(`backend/src/Handlers/JourneyBuilder.php:330`) — 마케팅 여정 이벤트로 authz replay와 도메인 분리. 트윈 event 스트림에 혼입 금지.
- **OIDC anti-replay**(`backend/src/Handlers/EnterpriseAuth.php:20`) — 유일 authz "replay"이나 이는 nonce 재사용 **방어**(anti-replay)이지 상태 재생(state replay)이 아니다. 트윈 event replay와 개념 분리.

## 5. 판정

**NOT_CERTIFIED · PARTIAL-소스.** replay event 소스(SecurityAudit `SecurityAudit.php:27`·`:56-67`·auth_audit_log `UserAuth.php:4165`·`:4166`·UNION `Compliance.php:133-151`)는 실존하나, As-Of replay 엔진은 순신설이다. 스트림 backbone(브로커) 부재(`composer.json:5-13`) → BLOCKED_PREREQUISITE. pixel_events·OIDC anti-replay는 KEEP_SEPARATE. 코드 변경 0.
