# DSAR — Zero Trust & Continuous Authorization: 위협 인텔리전스 (APPROVAL_THREAT_INTELLIGENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_THREAT_INTELLIGENCE는 외부/내부 **위협 신호를 인가 결정에 연계**하는 엔티티다. SPEC §8(Threat Intelligence) 연계 대상: **IOC · Threat Feed · Malicious IP · Suspicious Domain · Malware Indicator · Insider Threat · UEBA Score**. 이 신호는 SPEC §11 Adaptive Authorization(Deny/Challenge/Session Termination)·SPEC §28 Runtime Guard(High Threat 차단)의 입력이 된다. ★핵심 구분: 현 substrate의 SSRF 가드·rate-limit은 **방어 프리미티브**일 뿐 IOC/threat feed 연계가 아니다(ABSENT·ADR D-7).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| ZT 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| IOC / Threat Feed 연계 | **ABSENT** | threat feed/malicious IP/insider/UEBA 연계 grep 0(GT② 표 "Threat Intelligence ABSENT") |
| Malicious IP / Suspicious Domain 분류 | **ABSENT** | `clientIp` 수집만·VPN/TOR/proxy 분류 없음 `UserAuth.php:3443-3463`(GT② 표 Network Trust ABSENT) |
| UEBA / Insider(authz behavior) | **ABSENT** | `AnomalyDetection.php`는 광고 SPC·로그인/API 패턴이 인가에 피드 안 됨(GT② 표 Behavior Analytics ABSENT) |
| egress SSRF 하드닝 | PRESENT(방어·threat intel 아님) | `isSafeWebhookUrl`/`isSafeSiemUrl`/`isPublicHttpsUrl` `Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624` |
| 남용 rate-limit | PRESENT(방어·threat intel 아님) | api_key 1200/min 정적 카운터 `index.php:527-570` |
| 위협 증거 체인 | PARTIAL(근접) | SecurityAudit 해시체인 append-only/verify `SecurityAudit.php:12-53`·`:56-68`(Trust Evidence 확장 대상) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

| 항목 | 계약 |
|---|---|
| 연계 신호 | `IOC`·`THREAT_FEED`·`MALICIOUS_IP`·`SUSPICIOUS_DOMAIN`·`MALWARE_INDICATOR`·`INSIDER_THREAT`·`UEBA_SCORE`(SPEC §8) |
| 결정 결합 | Adaptive Authorization(§11) Deny/Challenge/Session Termination·Runtime Guard(§28 High Threat 차단) 입력 |
| 증거 | 위협 feed·runtime decision 증거는 SecurityAudit 해시체인 재활용(`SecurityAudit.php:12-68`·ADR D-5) |
| 에러/경고 계약 | `THREAT_BLOCKED`(SPEC §30) / `Threat Increasing`(SPEC §31) |
| 성능 | Threat Feed Processing ≤ 2초(SPEC §35) |
| 테넌트 격리 | 위협 상태·차단 이력 `X-Tenant-Id` 격리(SPEC §33)·authz 축(`auth_audit_log`) |
| 순신규 원칙 | 방어 프리미티브(SSRF/rate-limit)와 **별개 신설**·재구현 금지(ADR D-7) |

## 4. KEEP_SEPARATE (마케팅 risk/anomaly·방어프리미티브 흡수금지)

- **방어 프리미티브 흡수 금지**: SSRF 가드(`Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`·`WmsCctv.php:33`)·rate-limit(`index.php:527-570`)·서버 fingerprint 차폐(`Health.php:82`)는 egress/남용/정보노출 하드닝이지 IOC/threat feed 아님(GT② §4 B-4). Threat Intelligence로 승격·흡수 금지.
- **마케팅 anomaly/risk 흡수 금지**: `AnomalyDetection.php`(광고 SPC μ±kσ)·`Risk.php:31-55`(공급망 fraud)·`GraphScore.php:12-18`(influencer 그래프)·`ModelMonitor.php:11-18`(ML 드리프트)는 ZT Threat/Behavior 아님(GT② §4 B-2). authz UEBA와 데이터소스 완전 분리(`performance_metrics`/`crm_*` ≠ `auth_audit_log`).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **Threat Intelligence = ABSENT(순신규 그린필드)**. IOC/threat feed/malicious IP/insider/UEBA(authz) grep 0(GT② 표·ADR §2.2). SSRF/rate-limit은 방어일 뿐(GT② §4 B-4).
- **재활용(Extend)**: SecurityAudit 해시체인(`SecurityAudit.php:12-68`)→위협 증거(Trust Evidence·ADR D-5)만 근접 재활용.
- **선행의존**: Network Trust Engine·Behavior Analytics(authz UEBA)·Adaptive Authorization(§11) 신설 선행. 실 구현=RP-track 승인세션. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
