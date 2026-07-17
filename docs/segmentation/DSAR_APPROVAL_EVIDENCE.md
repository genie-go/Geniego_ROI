# DSAR — Approval Evidence (§50·필드 35·저장 금지 7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q20 "승인 결정의 근거와 Evidence를 재현할 수 있는가") | 현행 | 분류 |
|---|---|---|
| **APPROVAL_EVIDENCE** 엔티티 | **부재**(grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 현행 승인 감사 저장소 | `audit_log` `Db.php:540-546` — `id, actor, action, details_json, created_at` | **MIGRATION_REQUIRED**(아래 결함 2건) |
| 🔴 그 한계 ① **tenant_id 없음** | `Db.php:540-546` 실측 — 승인 감사가 **테넌트 격리 밖**에 쌓인다. 테넌트별 증거 조회·DSAR 응답·격리 감사 **원리적 불가** | **MIGRATION_REQUIRED** |
| 🔴 그 한계 ② **해시체인 없음** | 같은 스키마 실측 — **tamper-evident 아님**. 증거가 사후 수정돼도 **탐지 불가** → §0 Q20 "재현 가능"을 만족 못 함 | **MIGRATION_REQUIRED** |
| **★해시체인 선례** | `menu_audit_log.hash_chain CHAR(64)` `Handlers/AdminMenu.php:123-131`(+ 생성 `:166-206`) — **저장소 내 유일**한 tamper-evident 감사(N-152-A) | **★VALIDATED_LEGACY**(재사용 근거·패턴 승격) |
| Snapshot 기반 재현 | Resource Snapshot(§30)·Context Snapshot(§32) **전부 부재**(grep 0) — 승인 당시 데이터가 보존되지 않아 **재현 불가**(§4.4 미충족) | **NOT_APPLICABLE** |
| 첨부·문서 증거 | 승인 도메인 attachment **부재**(grep 0) | **NOT_APPLICABLE** |

> **부재가 아니라 미확산**: 저장소는 이미 **해시체인을 한 곳에서 구현**했다(`AdminMenu.php:123-131`). Evidence 무결성은 **신설이 아니라 그 패턴의 승인 도메인 확장**이다(Golden Rule = Extend).

## 1. Evidence = **결정을 사후에 재현하기 위한 불변 근거 묶음**

**필드 35 · 저장 금지 7종** — 스펙 §50 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `35`/`7`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드 축 커버리지 주장 불가**.

**단, 저장 금지 축은 저장소 원칙에서 독립적으로 확정된다**(스펙 원문 대조는 별도):

| 저장 금지 대상 | 저장소 근거 |
|---|---|
| Password / 인증 비밀 | 평문 저장 금지 원칙 |
| Access Token · Refresh Token | 동상 |
| Credential Secret(API Key 등) | `channel_credential` **AES-256-GCM**(267차) · `Handlers/ChannelCreds.php` 마스킹 — **증거에 복호 원문 복제 금지** |
| Bank Account 원문 | 금융 식별자 원문 금지 |
| 불필요 PII | 저장소 원칙 = **집계 전용**(v418.1 decisioning 설계 의도) |

→ 증거에는 **원문이 아니라 참조·마스킹·해시**를 담는다. `ChannelCreds` 마스킹 패턴을 재사용한다.

영속된 요구(§0 Q20·§4.4·§4.9)에서 확정 가능한 구조 요구:
- Evidence는 **Append-only·불변**이다(§4.9) — 수정은 새 레코드이지 덮어쓰기가 아니다.
- Evidence는 **Tenant 스코프 필수** — `audit_log`의 tenant 결함을 **복제하지 않는다**.
- Evidence는 **Snapshot(§30·§32)을 참조**한다 — Snapshot 없이 Evidence만 쌓으면 "무엇에 대한 승인이었는지"가 빠져 재현 불가.

## 2. 규칙

- **`menu_audit_log.hash_chain` 패턴을 승인 Evidence로 승격**한다 — 별도 무결성 모델 신설 **금지**(Golden Rule).
- **`audit_log`를 그대로 Evidence 저장소로 쓰지 않는다** — tenant 부재 + 해시체인 부재 **2결함**을 승인 도메인에 상속시키면 §0 Q20을 원리적으로 못 채운다. 단 **기존 `audit_log` 호출부 제거 금지**(무후퇴 · 확장이지 대체 아님).
- **자격증명·PII 원문 저장 절대 금지** — 증거 수집을 이유로 복호 원문을 복제하면 267차 암호화가 **무력화**된다.
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
