# DSAR — Zero Trust & Continuous Authorization: 신뢰 증거 (APPROVAL_TRUST_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_EVIDENCE`는 지속 인가 판정을 뒷받침한 **원자재 증거**를 tamper-evident하게 봉인하는 레코드다. SPEC §21(Evidence)은 저장 대상으로 **Trust Evaluation · Threat Feed · Session Analysis · Authentication History · Runtime Decision** 5종을 규정한다. Snapshot(§20)이 "판정 결과"라면 Evidence는 "그 판정에 이르게 한 근거"이며, 사후 포렌식·규제준수(NIST 800-207/SOC 2)·재현(Reconciliation §26)의 감사 소스가 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §21 증거 | 판정 | 근거(GT 인용) |
|---|---|---|
| Authentication History (인증 이력) | **PARTIAL** | `auth_audit_log`·`audit()`(`UserAuth.php:4165`·`:4174`·`:4190-4191`)·로그인 MFA/OTP 경로(`UserAuth.php:929-980`) 존재하나 authz 증거 스키마 아님 |
| Runtime Decision (런타임 결정) | **ABSENT** | Adaptive/Continuous Decision 산출·저장 전무(GT② §2 Adaptive Authorization ABSENT) |
| Trust Evaluation (신뢰 평가) | **ABSENT** | Trust Score/Confidence 산출 없음(GT② §2)·평가 증거 구조 전무 |
| Session Analysis (세션 분석) | **PARTIAL** | 세션 메타 raw 기록(`UserAuth.php:4232-4251`)·동시세션 목록(`:4253-4298`)이나 hijack/분석 산출 없음 |
| Threat Feed (위협 피드) | **ABSENT** | SSRF 가드(`Alerting.php:786`)·rate-limit(`index.php:527-570`)는 방어 프리미티브·IOC/threat feed 연계 아님(GT② §2·§4 B-4) |
| tamper-evident 무결성 substrate | **재활용(PRESENT)** | SecurityAudit 해시체인 append-only·verify(`SecurityAudit.php:12-53`·`:56-68`) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드 계약**(§21): `evidence_id`, `tenant_id`, `snapshot_ref`, `evidence_type(trust_eval|threat_feed|session_analysis|auth_history|runtime_decision)`, `payload`, `hash_prev`, `hash_curr`, `recorded_at`, `trust_version`.
- **무결성**(ADR D-5): Trust Evidence는 **SecurityAudit 해시체인 확장**(`SecurityAudit.php:12-68`) — Evidence 저장은 신설이나 append-only 해시체인 무결성은 신설 아닌 **확장**. `verify()`(`:56-68`)로 체인 검증.
- **Authentication History**: 정적 `auth_audit_log.risk`(`UserAuth.php:4165`)를 계산된 risk로 승격(ADR D-5)해 증거 payload에 결합. 현행은 SIEM 라우팅(`:4193`)만.
- **Tenant Isolation**: `tenant_id` 필수. authz `auth_audit_log`/`user_session` ≠ 마케팅 데이터소스(GT② §5).
- **Threat Feed는 순신규**(ADR D-7): IOC/malicious IP/insider/UEBA(§8) 증거는 그린필드. SSRF/rate-limit 재사용 아님.

## 4. KEEP_SEPARATE (마케팅 trust/analytics 흡수금지)

- 마케팅 신뢰도 증거 — `Mmm.php:749`·`:939`·`AttributionEngine.php:246-261`(`mkTrust`/`mmmTrust`)·`Attribution.php:145-242`(cross-device confidence)는 어트리뷰션 신뢰등급이며 authz Trust Evaluation 증거 아님(GT② §4 B-1).
- 위협/이상 오인 금지 — `AnomalyDetection.php`(광고 SPC)·`ModelMonitor.php:11-18`(ML 드리프트)·`Risk.php:31-55`(공급망 fraud)는 Threat Feed/Session Analysis 증거 아님(GT② §4 B-2).
- 방어 프리미티브 분리 — SSRF 가드(`Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`)·rate-limit(`index.php:527-570`)·서버 fingerprint 차폐(`Health.php:82`)는 threat intel 증거로 승격 금지(GT② §4 B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Trust Evaluation·Runtime Decision·Threat Feed 증거 = **ABSENT(순신규)**. Authentication History·Session Analysis 원자재는 PARTIAL(감사 라벨·raw 메타). **tamper-evident 무결성은 SecurityAudit 확장(재활용)**.
- **재활용 vs 신설**: `SecurityAudit.php:12-68`(해시체인)·`auth_audit_log`(`:4165` 등)·세션 메타(`:4232-4251`) 재활용. Trust Evaluation 증거·Threat Feed·Runtime Decision·evidence 스키마 신설.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-12 인증 후 실 구현. Trust Score(D-4)·Threat Intel(D-7)이 증거 생산자의 선행. 코드 변경 0.

### 본 문서 file:line 인용 목록
`UserAuth.php:4165` · `UserAuth.php:4174` · `UserAuth.php:4190-4191` · `UserAuth.php:4193` · `UserAuth.php:929-980` · `UserAuth.php:4232-4251` · `UserAuth.php:4253-4298` · `SecurityAudit.php:12-53` · `SecurityAudit.php:56-68` · `SecurityAudit.php:12-68` · `Alerting.php:786` · `Compliance.php:411` · `DataExport.php:624` · `index.php:527-570` · `Health.php:82` · `Mmm.php:749` · `Mmm.php:939` · `AttributionEngine.php:246-261` · `Attribution.php:145-242` · `AnomalyDetection.php` · `ModelMonitor.php:11-18` · `Risk.php:31-55`
