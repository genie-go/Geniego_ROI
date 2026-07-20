# DSAR — Approval Global Context (Part 3-16 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC)

**APPROVAL_GLOBAL_CONTEXT**는 인가 결정에 필요한 **횡단 컨텍스트**(Policy·Identity·Trust·Risk·Compliance)를 다수의 authz 노드가 **일관되게 공유**하도록 노드간 동기화하는 계약이다.

| Context 노드 | 계약 요지 |
|--------------|-----------|
| Policy Context | 현재 유효 정책 version·scope가 모든 PDP에 동일 관측. |
| Identity Context | 주체(user/tenant/service) 신원·역할·세션 상태의 노드간 일관성. |
| Trust Context | 데이터/신호 신뢰도(V3 Trust) 상태의 공유. |
| Risk Context | 실시간 위험 신호(이상행위·속도)의 노드간 전파. |
| Compliance Context | 규제/동의/보존 정책 상태의 일관 관측. |

라이브 authz는 단일 프로세스이므로 "노드간 context 동기화"가 존재하지 않는다. 현행은 **요청 단위 in-process 컨텍스트 주입**이다: 미들웨어가 세션/키를 검증하고(`backend/public/index.php:99-122`) 세션→tenant 권위를 요청 attribute로 주입한다(`index.php:423-461`). 이 컨텍스트는 요청 수명주기 안에서만 유효하며 노드간 공유·복제·동기화가 없다.

## 2. 실존 substrate 매핑

| Context 노드 | 상태 | 근거(허용목록) |
|--------------|------|----------------|
| Policy Context (노드간) | ABSENT | 정책 version 공유 채널 grep 0 |
| Identity Context (요청단위) | PARTIAL | `index.php:99-122`(인증)·`index.php:423-461`(세션→tenant 권위 주입) |
| Trust Context (노드간) | ABSENT | authz 노드간 trust 전파 없음 |
| Risk Context (노드간) | ABSENT | 노드간 위험신호 동기화 없음 |
| Compliance Context (노드간) | ABSENT | 노드간 compliance 상태 공유 없음 |
| 멀티테넌트 격리 substrate | PRESENT | `index.php:614-619`(유일 실 substrate) |

**유일 실 substrate 서술** — 노드간 동기화가 아닌 요청 단위 격리 substrate로서 `index.php:614-619`의 멀티테넌트 격리가 유일하게 실재한다. Identity Context는 요청 처리 중 `index.php:423-461`에서 세션을 해석해 tenant 권위를 부여하는 형태로만 PARTIAL 존재하며, 이는 프로세스 내 지역 컨텍스트이지 글로벌(노드간) context가 아니다.

## 3. 설계 계약(규칙)

- **R-11.1** 각 Context 노드는 자체 version/timestamp를 가지며 노드간 전파 시 stale 판정이 가능해야 한다.
- **R-11.2** Identity Context는 현행 `index.php:423-461`의 요청단위 tenant 권위 주입을 **의미적 원천(source semantics)**으로 삼되, 글로벌 배포 계층은 그 위에 순신설한다(기존 주입 경로 대체 금지).
- **R-11.3** Trust/Risk/Compliance Context는 인가 결정을 **약화하는 방향**으로만 신설 신호를 소비한다(fail-closed·기존 허용을 넓히지 않음).
- **R-11.4** Context 전파 변경은 `SecurityAudit`(`backend/src/SecurityAudit.php:4-33`) append-only 로그로 관측 가능해야 한다.

## 4. KEEP_SEPARATE

- 커머스/데이터 도메인의 상태 동기화(`ChannelSync.php:12-25`·`DataExport.php:11`)는 authz context 동기화가 아니다 — Context 노드 PRESENT 근거로 흡수 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_GLOBAL_CONTEXT의 노드간 동기화는 전부 ABSENT. 현행은 요청단위 in-process 주입(`index.php:99-122`·`index.php:423-461`)이며 유일 실 substrate는 멀티테넌트 격리(`index.php:614-619`)뿐. 다중 authz 노드 부재로 순신설 대상.
