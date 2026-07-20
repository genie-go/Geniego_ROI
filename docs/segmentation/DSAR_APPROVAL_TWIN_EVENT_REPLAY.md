# DSAR — Event Replay Engine (Part 3-22 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC 요약)
Event Replay Engine(§6)은 과거 authz 이벤트를 시간축을 따라 **재생하여 트윈 상태를 임의 시점으로 재구성**하는 계약을 정의한다.

- **Replay 5유형**: Historical Replay(과거 구간 재생), Timeline Replay(타임라인 스크럽), User Journey Replay(주체별 여정), Authorization Decision Replay(결정 재현), Incident Replay(사고 재구성).
- **재생 제어(control)**: Speed Control(배속), Pause / Resume(일시정지·재개), Rollback(되감기), Branch(분기 what-if 재생).

계약 원칙: replay 소스는 **순서 보존·불변(append-only) 이벤트 로그**여야 하며, 재생은 운영 평면에 부작용을 일으키지 않는(read-only reconstruction) 격리 실행이어야 한다.

## 2. Substrate 매핑 (현행 코드 → SPEC 요소)
| SPEC 요소 | 현행 substrate | 위치 | 판정 |
|---|---|---|---|
| 불변 이벤트 소스(감사) | SecurityAudit 해시체인 append-only | `SecurityAudit.php:27`·`:59-67` | PARTIAL 소스 |
| 불변 이벤트 소스(auth) | auth_audit_log 시간순 기록 | `UserAuth.php:4165`·`:4217-4220` | PARTIAL 소스 |
| 감사 이벤트 수집·정규화 | collectAuditEvents | `Compliance.php:133-151` | PARTIAL 수집 |
| Replay Engine(5유형) | 없음(grep 0) | — | ABSENT-엔진 |
| Control(Speed/Pause/Resume/Rollback/Branch) | 없음 | — | ABSENT |

replay 소스 계층은 **PARTIAL**로 존재한다: `SecurityAudit.php:27`·`:59-67`의 해시체인은 시간순 append-only이며, `UserAuth.php:4165`·`:4217-4220`의 auth_audit_log 또한 시간순 기록이다. 그러나 이 위에서 임의 시점 상태를 재구성하는 **재생 엔진과 제어 계층은 전무**하다.

## 3. 설계 계약 (신설 시)
- **재생 소스 채택**: Replay Engine은 SecurityAudit 해시체인(`SecurityAudit.php:59-67`)과 auth_audit_log(`UserAuth.php:4217-4220`)를 canonical 시간순 소스로 소비. 해시체인 무결성 검증(verify)을 재생 전 전제로 요구.
- **read-only 재구성**: 모든 replay는 격리된 트윈 상태에만 상태를 쌓고 운영 authz 평면에 write-back 금지(Branch/what-if 포함).
- **Control 계층 순신설**: Speed/Pause/Resume/Rollback/Branch 제어는 순신설. 소스 append-only 특성상 Rollback은 재생 커서 되감기이지 로그 삭제가 아님.
- **신규 엔드포인트 배선**: replay 실행/제어 엔드포인트 신설 시 `/api` 접두·라우트 등록 파일에 `$register` 배선 필수.

## 4. KEEP_SEPARATE (혼동 금지)
- **OIDC anti-replay**(`EnterpriseAuth.php:20`) = 인증 nonce/토큰 **재사용 공격 방어**이며 **event-replay(이벤트 재생) 아님**. 명칭 유사 흡수 금지 — 유일하게 "replay" 어휘가 authz 맥락에 등장하나 의미가 정반대.
- attribution event(`JourneyBuilder.php:330`) = 마케팅 어트리뷰션 이벤트. authz decision replay와 별개 — KEEP_SEPARATE.

## 5. 판정
**ABSENT-엔진.** Replay 5유형·Control 5요소 모두 grep 0. 재생 소스는 PARTIAL로만 존재(SecurityAudit `SecurityAudit.php:27`·`:59-67` 해시체인 append-only·auth_audit_log `UserAuth.php:4165`·`:4217-4220` 시간순). 정규화 선례는 `Compliance.php:133-151`. authz 맥락의 유일한 "replay"는 OIDC anti-replay(`EnterpriseAuth.php:20`)이나 이는 재사용 공격 방어로 event-replay가 아니며, attribution(`JourneyBuilder.php:330`)은 별도 도메인. → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
