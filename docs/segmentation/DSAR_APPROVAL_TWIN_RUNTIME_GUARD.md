# DSAR — Authorization Digital Twin Runtime Guard (Part 3-22 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Digital Twin Runtime Guard는 권한 시스템의 **런타임 미러(shadow twin)** 위에서 이뤄지는 위험 행위를 진입 시점(Policy Enforcement Point, PEP)에 차단하는 write-time 게이트다. 본 §25가 규정하는 6종 차단 계약:

- **Twin Write Attempt** — twin 상태를 임의로 조작하려는 쓰기를 차단(twin은 read-derived, 사용자 직접 write 금지).
- **Production Mutation** — twin 경로에서 발생한 어떤 연산도 운영(production) 실체를 변경하지 못하도록 절대 차단(★운영 무영향 불변).
- **Unauthorized Replay** — 권한 없는 주체의 이벤트 리플레이 실행 차단.
- **Scenario Injection** — 검증되지 않은 시나리오 정의의 주입 차단.
- **Prediction Tampering** — 예측 산출물/베이스라인의 사후 위·변조 차단.
- **Cross-Tenant Replay** — 테넌트 경계를 넘는 리플레이/미러 접근 차단.

## 2. Substrate 매핑 (기존 기반 · 재사용 대상)
| 차단 계약 | 재사용 substrate | 현행 근거 | 성격 |
|---|---|---|---|
| Twin Write Attempt | write-PEP `guardTeamWrite` | `UserAuth.php:1167` (게이트), `:1179-1181`(role 평가), `:1182`(403 deny) | write-time enforce 존재 |
| Production Mutation | demo/read-only 격리 관례 | demo bypass `UserAuth.php:1173` · demo readonly `ChannelSync.php:5872`(KEEP_SEPARATE) | 무영향 관례 |
| Unauthorized Replay | RBAC role 판정 | `UserAuth.php:1179-1181`, 거부 `:1188` | 주체 인가 |
| Scenario Injection | (전용 검증기 부재) | — | ABSENT |
| Prediction Tampering | append-only 해시체인 verify | `SecurityAudit.php:56-67`(verify), `:27`(append) | 변조탐지 substrate |
| Cross-Tenant Replay | env 기반 테넌트/DB 격리 | `Db.php:81-84`, 연결 파싱 `:63-87` | 격리 baseline |

## 3. 설계 계약 (본 DSAR가 규정)
- **PEP 위치**: twin 쓰기·리플레이·시나리오·예측 mutation 진입 직전. 형태는 `guardTeamWrite`(`UserAuth.php:1167`) write-PEP 패턴을 그대로 확장 — 신규 엔진 난립 금지, 기존 write-guard 위에 twin 스코프를 얹는다.
- **Production Mutation 절대 차단**: twin 연산은 read-derived 스냅샷·격리 스토어에만 쓴다. 운영 테이블 write 경로와 물리 분리(env 격리 `Db.php:81-84` 준수). 어떤 twin 명령도 운영 side-effect 0.
- **Prediction Tampering**: 예측/베이스라인 산출물은 SecurityAudit append-only 해시체인(`SecurityAudit.php:56-67`)에 봉인, verify 실패 시 twin 무효화.
- **Unauthorized/Cross-Tenant Replay**: 주체 role(`UserAuth.php:1179-1181`)+테넌트 env 격리(`Db.php:81-84`) 이중 게이트. 불일치 시 403(`UserAuth.php:1182`).
- **Fail-closed**: substrate 미해석·confidence 미달 시 차단이 기본. demo는 bypass(`UserAuth.php:1173`) 관례 유지하되 운영 write는 무조건 실체 게이트.

## 4. 판정
**ABSENT — greenfield (grep 0).** Twin Runtime Guard 전용 코드는 부재. 6종 차단 중 실 substrate가 있는 것은 Twin Write Attempt(`UserAuth.php:1167`·`:1182` 403), Prediction Tampering(`SecurityAudit.php:56-67`), Cross-Tenant Replay(`Db.php:81-84`)의 baseline 뿐이며, Scenario Injection 전용 검증은 완전 부재. Production Mutation 절대 차단은 설계 불변조건으로 신설. **순신설 · 코드 변경 0 · NOT_CERTIFIED.**
