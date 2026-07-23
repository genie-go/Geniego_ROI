# GeniegoROI Claude Code Implementation Specification

# CCIS Part052 — Enterprise Identity Governance Administration (IGA), PAM & Zero Trust Security Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise IGA·PAM·Zero Trust Security 표준을 수립한다.

> ★**성격(★Part030/040 중복 — 접근제어 substrate 강함·형식 IGA/PAM 솔루션 부재)**: 본 Part 는 **CCIS
> Part030(IAM/SSO)·Part040(SecOps)와 중복**되며 그 판정을 승계한다(★**Part030 이 형식 PAM 부재 이미 판정**).
> 보안은 이 저장소가 **은행급**을 지향하는 **강한 영역**이나, **접근제어 컨트롤·access certification** 이
> 강하고 **형식 IGA/PAM 제품(SailPoint/CyberArk)**은 없다. 명세가 다루는 **형식 IGA 플랫폼·PAM(privileged
> account/privilege elevation/session recording)·Password Vault·JIT Access(권한 승격)·형식 SoD 매트릭스·
> Continuous Authentication·Device Trust·FIDO2·Identity Analytics**는 **부재/부분**한다(grep 0). ★**강한 축**:
> **`AccessReview`**(v424·**휴면/만료 접근 검토=Access Certification**·회수 api_key `is_active=0`·**증거
> 필수**·fail-secure admin·`SecurityAudit`)·**RBAC+Scope**(viewer<connector<analyst<admin·**Least Privilege·
> JEA 유사**)·**MFA(TOTP)**(AES 봉투·정책 off/admin/all)·**세션 hash-only 게이트**(289차후속)·
> **`SecurityAudit`**(불변 감사)·**writeGuard 서버전역**·**high-value 게이트**(₩5M↑ 무승인 차단)·**Zero Trust
> 컨트롤**(verify explicitly·`Ssrf`·**위조불가 auth_tenant**·raw 헤더 불신)·**SoD 부분**(`action_request`
> maker-checker) 는 실재한다. Part001 §4 에 따라 실측 → IGA/PAM/Vault/Session Recording 부재증명 →
> AccessReview+RBAC+MFA+Zero Trust 성문화했다. ★정본=**Part030(IAM)·Part040(SecOps)** 승계·**SecurityAudit
> 재오염 금지**·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 IGA/접근제어 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| IGA Architecture | Source→IGA→PAM→Policy→App | **부분** — `index.php` 미들웨어(AuthN/RBAC)→`AccessReview`. 형식 IGA/PAM 플랫폼 아님 |
| Identity Lifecycle | Provision/Update/Suspend/Deprovision | ★**부분 준수** — SCIM 프로비저닝(`EnterpriseAuth`·Part030)·`is_active`·`Dsar`(deprovision). 형식 lifecycle 상태머신 부분 |
| Identity Governance | Repository/Access Request/Approval | **부분** — `app_user`·`api_key`·`action_request`(승인). 형식 IGA 정책 부분 |
| PAM | Privileged Account/Elevation/Approval | **부재(Part030 판정)** — 형식 PAM 없음. admin role+MFA+`AccessReview`+`SecurityAudit`가 특권 통제 |
| Zero Trust Architecture | Identity/Device/Context Verify | ★**부분 준수** — verify explicitly(위조불가 `auth_tenant`·세션 hash-only·`Ssrf`)·정책 평가(RBAC). Device Verify 부재 |
| JIT Access | Temporary/Expiration/Auto Revoke | **부분(대응물)** — `api_key` expires_at·`AccessReview` 회수. **권한 승격 JIT 부재**(승격 개념 없음) |
| JEA | Limited/Task-Based/Scope/Time | ★**대응물** — RBAC+**Scope**(write:*/write:ingest/admin:keys·Least Privilege). 형식 task-based JEA 부분 |
| SoD | Conflict Rule/Matrix/Violation | **부분(대응물)** — `action_request` maker-checker·high-value 게이트(생산자≠승인자). 형식 SoD 매트릭스 부재 |
| Access Certification | Periodic Review/Approval/Report | ★**실재** — **`AccessReview`**(휴면/만료 검토·회수 결정·증거 필수·이력) |
| Password Vault | Secret Storage/Rotation/Audit | **부분(대응물)** — `Crypto` AES-256-GCM(자격증명·fail-closed)·`Keys` rotation(api_key). 형식 admin Password Vault 부재 |
| Session Recording | Login/Command/Screen Recording | **부재(out of scope)** — 세션 레코딩 없음. `SecurityAudit`(액션 감사)가 대응물(레코딩 아님) |
| Risk-Based Authentication | Device/IP/Geo/Behavior | **부분** — 로그인 rate-limit·`AnomalyDetection`·`Geo`(IP)·OTP 스로틀. 형식 risk score 인증 부분 |
| Continuous Authentication | Session Validation/Device Monitoring | **부분** — 세션 만료·hash-only 검증·자동 로그아웃(262차). Device Monitoring 부재 |
| Device Trust | Managed Device/Certificate/Compliance | **부재(out of scope)** — 디바이스 관리 없음(Part037 out of scope) |
| Identity Analytics | Privilege Usage/Risk/Report | **부분** — `AccessReview`(사용/휴면)·`SecurityAudit`·`ai_call_log`. 형식 Identity Analytics 부분 |
| Monitoring | Login/PAM Session/SoD Violation/Risk | **부분** — 로그인 감사·`AnomalyDetection`·`Alerting`. PAM Session/SoD 대시보드 부분 |
| Logging | User/Session/Device/Trace | ★**부분 준수** — `SecurityAudit`(불변)·세션. Device/Trace ID 부분 |
| Security(MFA/FIDO2/HW Key/격리) | 특권 다중인증 | ★**부분 준수** — MFA(TOTP)·`Crypto`·테넌트 격리. **FIDO2/HW Key 부재**(Part030·Passwordless 부재) |
| Compliance(NIST Zero Trust/ISO) | 인증 규정 | **부분** — Zero Trust 컨트롤·`SecurityAudit`. 형식 인증 아님 |
| Disaster Recovery | Identity/Vault/Session/Policy 복구 | **부분** — DB 백업(app_user/api_key)·`Crypto` 키. Vault/Session 대상 없음 |
| Performance(Token/Policy Cache/Index) | 인증 성능 | **부분** — api_key 인덱스·세션·HTTP 캐시 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Never Trust/Always Verify/Least Privilege/Identity First/Risk Adaptive/Tenant Isolated/Auditable/Continuous Monitoring) | **★대체로 준수** | ★Always Verify(위조불가 tenant·hash-only)·Least Privilege(RBAC+Scope)·Tenant Isolated·Auditable(SecurityAudit). Risk Adaptive 부분 |
| §4 IGA Architecture | **부분** | 미들웨어→RBAC→`AccessReview`. 형식 IGA/PAM 아님 |
| §5 Identity Lifecycle | **부분 준수** | SCIM·`is_active`·`Dsar`. 형식 상태머신 부분 |
| §6 Identity Governance | **부분** | `app_user`·`api_key`·`action_request` |
| §7 PAM | **부재(Part030 판정)** | 형식 PAM 없음. admin+MFA+`AccessReview`+`SecurityAudit` |
| §8 Zero Trust | **부분 준수** | 위조불가 tenant·hash-only·`Ssrf`·RBAC. Device Verify 부재 |
| §9 JIT Access | **부분(대응물)** | `api_key` expires·`AccessReview` 회수. 권한 승격 JIT 부재 |
| §10 JEA | **★대응물** | RBAC+Scope(Least Privilege). task-based 부분 |
| §11 SoD | **부분(대응물)** | `action_request` maker-checker·high-value. 형식 매트릭스 부재 |
| §12 Access Certification | **★실재** | `AccessReview`(휴면/만료 검토·증거·이력) |
| §13 Password Vault | **부분(대응물)** | `Crypto` AES·`Keys` rotation. 형식 admin Vault 부재 |
| §14 Session Recording | **부재(out of scope)** | 레코딩 없음. `SecurityAudit`(액션 감사·레코딩 아님) |
| §15 Risk-Based Auth | **부분** | rate-limit·`AnomalyDetection`·`Geo`·OTP. risk score 부분 |
| §16 Continuous Authentication | **부분** | 세션 만료·hash-only·자동 로그아웃. Device Monitoring 부재 |
| §17 Device Trust | **부재(out of scope)** | 디바이스 관리 없음(Part037) |
| §18 Identity Analytics | **부분** | `AccessReview`·`SecurityAudit`·`ai_call_log` |
| §19 Monitoring | **부분** | 로그인 감사·`AnomalyDetection`·`Alerting` |
| §20 Logging | **부분 준수** | `SecurityAudit`(불변)·세션 |
| §21 Security | **부분 준수** | MFA(TOTP)·`Crypto`·격리. FIDO2/HW Key 부재 |
| §22 Compliance | **부분** | Zero Trust 컨트롤·`SecurityAudit`. 형식 인증 아님 |
| §23 Disaster Recovery | **부분** | DB 백업·`Crypto` 키. Vault/Session 대상 없음 |
| §24 Performance | **부분** | api_key 인덱스·세션·캐시 |
| §25~§26 PHP/Claude(Identity/PAM/Zero Trust Policy Engine/Vault Adapter/Analytics) | **부분** | ★RBAC+Scope·`AccessReview`·MFA·hash-only·`SecurityAudit`. PAM/Vault/형식 Zero Trust 엔진 부재 |
| §27~§28 검증(iga:health/pam:status/zerotrust:validate) | **대상 없음** | artisan 없음. `AccessReview` API·`SecurityAudit::verify`·RBAC 로 대체 |

---

## 4. 확립된 표준 (신규 IGA/접근제어 코드가 따를 정본)

- ★**Access Certification 정본 = `AccessReview`**(v424·휴면/만료 검토·회수 api_key `is_active=0`·**증거(justification) 필수**·fail-secure admin·`SecurityAudit` 증거·Part030). 정기 접근 검토는 이 핸들러 확장. ★**정직 범위**: 현재 **api_key 축만**(app_user tenant_id 부재 Db.php:1099 → tenant 확정 후 확장).
- ★**Least Privilege/JEA = RBAC+Scope**(viewer<connector<analyst<admin·write:*/write:ingest/admin:keys·Part030). 최소 권한·scope 제한. 신규 엔드포인트는 이 게이트.
- ★**MFA = TOTP**(`UserAuth`·AES 봉투·정책 off/admin/all·Part030). 특권 작업 MFA 필수. **mfa_secret 평문 저장 금지**.
- ★**Zero Trust 컨트롤(verify explicitly)**: **위조불가 `auth_tenant`**(raw X-Tenant-Id 불신)·**세션 hash-only 게이트**(raw 비교 금지·289차후속)·`Ssrf`(DNS rebinding/메타데이터)·writeGuard 서버전역·high-value 게이트(₩5M↑ 무승인 차단).
- ★**SoD = `action_request` maker-checker**(생산자≠승인자·high-value 승인). 형식 SoD 매트릭스 신설 전 이 패턴 재사용.
- ★**감사 = `SecurityAudit`**(불변 해시체인·유일 정본·**재오염 금지**·Part040). 인증/권한변경 기록. ★**Session Recording≠SecurityAudit**(레코딩 아님·오흡수 금지).
- ★★**Part030/040 중복·재판정 금지**: IAM/SSO=Part030·SecOps 감사=Part040 정본. 형식 PAM 부재는 **Part030 이미 판정**. 본 Part 는 IGA/Access Certification/Zero Trust 관점 보강.
- ★**사업범위 원칙**: **형식 IGA/PAM(SailPoint/CyberArk)·Session Recording·Device Trust·FIDO2 는 제품 범위 밖/부재** — 도입 결정 전 선이식 금지. 현 컨트롤(AccessReview/RBAC/MFA/Zero Trust)로 커버.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — Part030/040 중복 + 형식 IGA/PAM 부재)

1. **형식 IGA 플랫폼(SailPoint)·PAM(CyberArk·privileged account/privilege elevation)** — 안 함(★**Part030 이미 판정**). admin role+MFA+`AccessReview`+`SecurityAudit`가 특권 통제. 전용 IGA/PAM=인프라 도입.
2. **Password Vault(admin secret storage/rotation)·Session Recording(login/command/screen)** — 안 함/부재. `Crypto` AES(자격증명)·`Keys` rotation(api_key)이 대응물. Session Recording=out of scope·`SecurityAudit`(액션 감사)≠레코딩.
3. **JIT Access(권한 승격/auto revocation)·형식 SoD 매트릭스** — 부분. `api_key` expires·`AccessReview` 회수·`action_request` maker-checker가 대응물. 권한 승격 개념 부재.
4. **Continuous Authentication(device monitoring)·Device Trust·FIDO2/HW Key** — 부재. 세션 만료·hash-only·자동 로그아웃(262차)·MFA(TOTP). Device 관리=out of scope(Part037)·Passwordless 부재(Part030).
5. **Part030/040 와 중복되는 SSO/SCIM/MFA/감사** — 각 Part 정본(재판정 금지). 본 Part 는 IGA/Access Certification/Zero Trust 관점만.
6. **artisan `iga:*`/`pam:status`/`zerotrust:validate` 명령** — 없음(Slim). `AccessReview` API·`SecurityAudit::verify`·RBAC 로 대체.

★**준수하는 실 원칙(강함)**: **Access Certification(`AccessReview`·증거 필수·fail-secure)·Least Privilege(RBAC+Scope)·MFA(TOTP)·Zero Trust(위조불가 tenant·세션 hash-only·Ssrf·writeGuard·high-value 게이트)·SoD(action_request maker-checker)·불변 감사(SecurityAudit·재오염 금지)·테넌트 격리·PII 미저장**. ★**오흡수 차단**: Session Recording≠SecurityAudit. ★**Part030/040 정본 재사용**(재판정 금지).

---

## 6. Claude Code 구현 규칙

1. Access Certification=`AccessReview`(휴면/만료 검토·증거 필수·회수 is_active=0) 확장. ★현재 api_key 축만(app_user tenant 확정 후 확장).
2. 최소권한=RBAC+Scope(Part030). MFA=TOTP(특권 작업). ★Zero Trust: 위조불가 `auth_tenant`·세션 hash-only(raw 비교 금지)·`Ssrf`·writeGuard·high-value 게이트.
3. SoD=`action_request` maker-checker(생산자≠승인자). 감사=`SecurityAudit`(불변·재오염 금지). ★Session Recording≠SecurityAudit(오흡수 금지).
4. ★★형식 IGA/PAM/Vault/Session Recording/Device Trust/FIDO2 를 선이식하지 않는다 — Part030 판정(형식 PAM 부재)·도입 결정 선행. SailPoint/CyberArk 이식 금지.
5. 테넌트 격리 절대·PII 미저장. IAM/SSO/MFA/감사 판정=Part030/040 정본(재판정 금지).
6. 관리자 계정 MFA 없이 운영 금지·권한 변경 `SecurityAudit` 기록 없이 금지·SoD(maker-checker) 없이 고위험 승인 금지.

---

## 7. Completion Criteria

- [x] IGA/접근제어 스택 **실측**(형식 IGA/PAM/Vault/Session Recording/JIT 승격/Device Trust/FIDO2 부재·`AccessReview` certification·RBAC+Scope·MFA·세션 hash-only·`SecurityAudit`·Zero Trust 컨트롤 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 IGA/PAM 부재 증명·접근제어/certification 강함·Part030/040 중복)
- [x] 실 IGA(AccessReview+RBAC+MFA+Zero Trust+SoD maker-checker+SecurityAudit) 성문화(§4)
- [x] ★Access Certification(증거 필수·api_key 축만)·Least Privilege·Zero Trust(위조불가 tenant·hash-only)·SoD(maker-checker)·불변 감사·★오흡수(Session Recording≠SecurityAudit) 명시
- [x] 의도적 미적용 + 사유(§5) — IGA/PAM/Vault/Session Recording/JIT 승격/Device Trust/FIDO2(+Part030/040 중복)
- [x] Claude Code 규칙(§6) · `AccessReview`·RBAC+Scope·MFA·`SecurityAudit`·Zero Trust 컨트롤 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part030/040 중복 + 강한 접근제어 substrate**(`AccessReview` access
> certification + RBAC+Scope Least Privilege + MFA + 세션 hash-only + Zero Trust 컨트롤 + SoD maker-checker +
> `SecurityAudit` 불변 감사)의 성문화이지 SailPoint/CyberArk/Password Vault/Session Recording 이식이 아니다.
> ★**형식 PAM 부재는 Part030 이미 판정**(재판정 금지). ★**오흡수 차단**: Session Recording 은 `SecurityAudit`
> (액션 감사)가 아니다.

---

## 다음 Part

**CCIS Part053 — Enterprise Business Continuity (BCM), High Availability (HA), Resilience & Chaos Engineering** — ★사전 실측 예고: 형식 HA(다중 노드/Auto Failover)·Chaos Engineering(Gremlin)·Circuit Breaker/Bulkhead·Self-Healing 인프라는 **부재**(단일 VPS·Part016/045)이나, 복원력 실체는 **php-fpm 풀 튜닝(Part006·502 대응)·`ensureTables` self-healing(스키마 자가치유)·`omni_outbox` 재시도/DLQ·MySQL→SQLite 폴백(Db.php)·수동 DB 백업·cron 재실행·SSRF/fail-closed**로 부분 실재. Part053 도 실측→HA/Chaos/Circuit Breaker 부재증명→self-healing+폴백+재시도 성문화. ★주의: 단일 VPS라 HA/Auto Failover 대체로 사업범위 밖·MySQL→SQLite 폴백은 실재(오흡수 주의: 폴백≠HA 클러스터).
