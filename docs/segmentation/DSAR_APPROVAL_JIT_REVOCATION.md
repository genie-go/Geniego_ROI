# DSAR — JIT Access Governance: 권한 회수 (APPROVAL_JIT_REVOCATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_JIT_REVOCATION은 상승 grant를 **회수**하는 폐루프의 종결 단계다. SPEC §14(Auto Revocation) 조건: End Time 도달·Session 종료·Risk 상승·Policy 위반·Approval 철회·Device 변경·Network 변경. SPEC §15(Early Revocation) 수동 회수 주체: Security Officer·Business Owner·Compliance Officer·Incident Commander. Auto Revocation ≤ 30초(SPEC §35). Zero Standing Privilege(ADR §D-3)의 핵심 — 만료·위반 시 특권이 즉시 소멸해야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) | JIT 매핑 |
|---|---|---|---|
| 만료 세션 배제 런타임 게이트 `expires_at > ?` | PARTIAL | `UserAuth.php:304`(GT① E) | TTL Enforcement(세션축·lazy) |
| lazy purge(로그인 시 만료 DELETE) | PARTIAL | `UserAuth.php:989`(GT① E) | 만료 정리(lazy) |
| 계정 비활성 즉시 회수(`DELETE FROM user_session`) | PARTIAL | `UserAdmin.php:344`(GT① E) | 즉시 revoke(세션축) |
| api_key revoke `is_active=0` | PARTIAL | `Keys.php:135`(GT① E) | 자격증명 회수 |
| 구독 만료 강등(plan→free) | PARTIAL | `UserAuth.php:141`(GT① A·ADR §2.1) | 만료 회수(구독축) |
| AccessReview revoke=`is_active=0` 재사용(신규 파괴경로 없음) | PRESENT | `AccessReview.php:210-214`(GT① 4-E·ADR §2.1) | Revocation semantics 선례 |
| **능동 만료회수 cron 워커** | **ABSENT** | GT② B-9 — `backend/bin/`=`alerts_cron`·`optimize_cron`·`oauth_refresh_cron` 3종만·권한/세션 능동회수 워커 무매치 | 순신규 |
| **권한축 Auto-expiry revocation engine** | **ABSENT** | GT② §2 — 권한 만료 회수 엔진 0(만료회수는 세션/구독/api_key 별개축뿐) | 순신규 |
| Early Revocation 주체(Security/Compliance Officer·Incident Commander) | **ABSENT** | GT② §2·B-9 — elevation 수동회수 경로 0 | 순신규 |

> **정직 경계**: 현행 회수는 전부 **요청시점 lazy 게이트 + 개별축 is_active=0/DELETE**(`UserAuth.php:304,:989`·`UserAdmin.php:344`·`Keys.php:135`·`:141`)이며 **권한(grant)축 능동 회수 엔진은 부재**(GT② B-9). SPEC §14가 요구하는 ≤30초 능동 Auto-Revocation(cron/워커)은 순신규. 회수 시맨틱은 AccessReview 선례(`AccessReview.php:210-214` is_active=0 재사용)를 계승하되 **신규 파괴 경로 신설 금지**.

## 3. 설계 계약 (필드·상태·제약)

- **Auto Revocation 트리거**(SPEC §14): End Time·Session 종료·Risk 상승·Policy 위반·Approval 철회·Device/Network 변경. Monitor(§13)·Runtime Guard(§28) 신호와 결합.
- **Early Revocation**(SPEC §15): 4개 주체의 수동 즉시 회수. 회수 결정은 Immutable·SecurityAudit 증거 기록.
- **재활용(Extend)**: is_active=0 회수 시맨틱(`AccessReview.php:210-214`)·즉시 세션 삭제(`UserAdmin.php:344`)·lazy 만료(`UserAuth.php:989`)·구독 강등(`UserAuth.php:141`)을 **대체 아닌 확장**으로 grant축에 결합. 신규 cron 워커는 기존 3종 크론 옆에 추가(GT② B-9)하되 lazy 게이트 병행 유지(무후퇴, ADR §4).
- **불변·격리**: 회수 이벤트는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`) 기록·테넌트 격리(SPEC §33). 성능 Auto Revocation ≤ 30초(§35).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| 세션 만료/유휴 로그아웃 | `UserAuth.php:304,:280,:206`(GT② B-4) | 세션 수명 회수 — grant 회수 아님 |
| api_key expires/rotate | `Keys.php:135,:141`(GT② B-5) | 자격증명 회전 — elevation 회수 아님 |
| 광고 킬스위치(pause-all) | `AdAdapters.php:22,:36`·`AutoCampaign.php:447`(GT② B-7) | 광고 집행차단 — 권한 회수 아님 |

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 코드 변경 0. 능동 만료회수 cron·권한축 Auto-expiry engine·Early Revocation 주체는 **ABSENT(순신규)**. is_active=0/DELETE 회수 시맨틱·lazy 만료·구독 강등은 **재활용(Extend)**.
- **재활용/ABSENT 분리**: 재활용=`AccessReview.php:210-214`·`UserAdmin.php:344`·`UserAuth.php:304,:989,:141`·`Keys.php:135`. ABSENT=권한축 능동회수 엔진·cron 워커·Early Revocation 경로(GT② §2·B-9).
- **선행 의존**: Part 1~3-8 인증 후 실 구현. Grant Ledger(TTL 컬럼 신설)·Session·Monitor 확정 후 회수 대상을 앵커. cron 워커는 기존 lazy 게이트와 병행(무후퇴).
