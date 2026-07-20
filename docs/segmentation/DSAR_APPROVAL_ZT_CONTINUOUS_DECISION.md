# DSAR — Zero Trust & Continuous Authorization: 지속 결정·런타임 모니터링·정책 재평가 (APPROVAL_CONTINUOUS_DECISION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

본 엔티티는 SPEC 세 절을 결합한다. **§17 Continuous Decision**: Permit·Temporary Permit·Read Only·Challenge·Suspend·Deny·**Revoke Session**의 지속 결정 유형. **§18 Runtime Monitoring**: Session·Permission·Device·Context·Threat·API·Data 실시간 모니터링. **§19 Policy Reevaluation**: Policy Update·Runtime Update·Threat Update·Trust Score Update 발생 시 자동 재평가. §10 Verification 결과를 §17 결정으로 사영(project)하고, §18이 지속 관찰하며, §19가 정책/신뢰 변화에 자동 반응한다. ADR §D-6은 §17 결정 유형이 PDP(3-12) Decision Types에 step-up/re-auth/session-termination을 추가하는 방식임을 규정한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| §17 Deny/Permit(정적) | **PARTIAL** | 요청별 게이트 permit/deny(`index.php:69-622`·`:573-597`·`:608-619`)·`guardTeamWrite`(`index.php:72-89`·`UserAuth.php:1134-1167`)=고정 RBAC·신뢰기반 아님(GT① §D) |
| §17 Revoke Session | **ABSENT(수동만)** | `revokeOtherSessions`(타기기 폐기·토큰 마스킹)(`UserAuth.php:4253-4298`)=사용자 **수동** 폐기·자동 revoke/suspend 결정엔진 부재(GT① §A·GT② §2) |
| §17 Suspend/Temporary Permit/Challenge | **ABSENT** | Adaptive/Risk-based Authorization grep 0. `auth_audit_log.risk`(`UserAuth.php:4165`·`:4193`)=정적 라벨·SIEM 라우팅만·결정 미반영(GT② §2) |
| §18 Runtime Monitoring(Session) | **PARTIAL** | 유휴 무효화(`UserAuth.php:288-311`)·recordSessionMeta ip/ua last_seen(`UserAuth.php:4232-4251`·`:4247`)=기록만·실시간 authz 모니터 아님(GT① §A) |
| §18 Monitoring(Threat/Data/API) | **ABSENT** | Threat Intelligence·UEBA·runtime authz 관찰 전무. rate-limit(`index.php:527-570`)는 남용카운터·모니터 아님(GT② §B-4) |
| §19 Policy Reevaluation(자동) | **ABSENT** | Policy/Trust Score Update 트리거 자동 재평가 없음. 근접=agency 재검증(`index.php:96-122`·매요청 approved·수동 상태변경 반영·자동 트리거 아님)(GT① §D·ADR §D-3) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **결정 유형**(SPEC §17): `permit`·`temporary_permit`·`read_only`·`challenge`·`suspend`·`deny`·`revoke_session`. Trust Score 임계(SPEC §14)로 구동(ADR §D-4)·PDP(3-12)에 추가(ADR §D-6).
- **모니터링 대상**(SPEC §18): `session`·`permission`·`device`·`context`·`threat`·`api`·`data`. recordSessionMeta(`UserAuth.php:4232-4251`)를 실시간 관찰 입력으로 승격(ADR §D-1).
- **재평가 트리거**(SPEC §19): `policy_update`·`runtime_update`·`threat_update`·`trust_score_update` 발생 시 자동 재계산. `revoke_session`은 기존 `revokeOtherSessions`(`UserAuth.php:4253-4298`)를 **자동 집행 경로**로 확장(수동→자동·Extend).
- **제약·테넌트 격리**: 자동 결정 집행은 SecurityAudit 해시체인(`SecurityAudit.php:12-53`·`:56-68`) 증거화·fail-closed. `user_session`/`auth_audit_log` authz 전용(GT② §5). 자동집행은 사용자 승인정책 존중(무후퇴).

## 4. KEEP_SEPARATE (마케팅 trust/risk/anomaly 흡수금지)

- **마케팅 risk/anomaly/drift**: `AnomalyDetection.php`(광고 SPC)·`ModelMonitor.php:11-18`(ML 드리프트/재학습)·`Risk.php:31-55`(공급망 fraud)·`CustomerAI.php:10-18`(churn risk)·`GraphScore.php:12-18`(influencer 그래프)는 §17 결정·§18 모니터링·§19 재평가 입력 **아님**(GT② §B-2).
- **방어 프리미티브**: rate-limit(`index.php:527-570`)·SSRF 가드(`Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`·`WmsCctv.php:33`)·`Health.php:82`(서버 fingerprint 차폐)는 authz runtime 결정 아님(GT② §B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: §17 Continuous Decision=**ABSENT**(정적 permit/deny·수동 revoke만 존재·자동 suspend/challenge/temporary 부재). §18 Runtime Monitoring=PARTIAL(세션 기록만). §19 Policy Reevaluation=ABSENT(agency 재검증 근접·자동 트리거 아님).
- **재활용**: `revokeOtherSessions`(수동→자동 집행)·recordSessionMeta(모니터링 입력)·SecurityAudit(결정 증거)·agency 재검증(재평가 선례). Extend-only(ADR §D-1·§D-3·§D-5).
- **선행의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). Trust Score(§14·ADR §D-4)가 결정 구동 선행. 코드 변경 0 · NOT_CERTIFIED · 무후퇴.
