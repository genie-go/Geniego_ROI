# DSAR — Authorization Observability & Forensics: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> 본 문서는 Part 3-14 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/composer.json`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: audit·hash chain·event store·evidence·custody·trace/correlation/span·replay·digital twin·telemetry·SIEM 다중 grep + 감사 코어(SecurityAudit/UserAuth audit/AdminMenu/AccessReview/Compliance) 정독. 2 Explore 스레드(40 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**Authorization Observability & Forensics(분산추적·재현·디지털트윈·상관·타임라인·텔레메트리·트레이스분석·포렌식케이스·보관연속성)는 대부분 부재(ABSENT)다.** 존재하는 것은 **append-only 감사 로그 substrate**뿐이다.

- **★유일 tamper-evident 앵커 = `SecurityAudit` 해시체인**(`SecurityAudit.php:14-33` append-only·`:56-68` verify broken_at). Immutable Event Store + Evidence Chain의 유일 완비 substrate.
- **PARTIAL 격차**: auth_audit_log(해시체인 없음·평문 detail)·menu_audit_log(체인 있으나 verify 부재).
- **PRESENT 재활용**: SIEM forward·3소스 통합집계(Compliance)·access_review 증거패턴·recordSessionMeta(context 부분).
- **부재**: distributed trace(OpenTelemetry·trace/correlation/span)·decision replay·digital twin(time-travel)·correlation engine·decision timeline·authz telemetry(P95/P99)·trace analytics·forensic case·**chain of custody/retention/legal-hold**. 실 엔진은 SecurityAudit 위에 관측성·포렌식 층을 **신설(Extend·흡수 아님·참조)** 한다.

## 2. 실존 substrate 카탈로그

### A. SecurityAudit 해시체인 (유일 tamper-evident — PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-14 매핑 |
|---|---|---|---|
| `backend/src/SecurityAudit.php:14-33` · `:25` · `:27` | `log`(append-only INSERT·prev_hash→hash_chain sha256) | UPDATE/DELETE 코드경로 전무 | Immutable Event Store(§18)·Evidence Chain(§9) |
| `backend/src/SecurityAudit.php:35-41` · `:39` | `lastHash`·GENESIS 시드 | 체인 앵커 | Hash Chain |
| `backend/src/SecurityAudit.php:43-53` · `:48-52` | `ensure`(security_audit_log 스키마: tenant/actor/action/details_json/ip/ua) | 스키마 | Event Store |
| `backend/src/SecurityAudit.php:56-68` · `:64` | `verify`(hash_equals+prev 연속성 재계산·broken_at) | 무결성 검증 | Verify Integrity(§32)·Chain Integrity |
| `backend/src/SecurityAudit.php:71-83` · `:93-110` | `recent`·`recentByType` | 테넌트 스코프 조회 | Query Trace/Timeline(부분) |
| `backend/src/Handlers/AdminGrowth.php:1429` | verify 노출(admin 전용) | 무결성 검증 API | Verify Integrity |

로깅 호출부(인가·보안 액션): `UserAuth.php:870` · `:994` · `:998` · `:2019` · `:2137` · `:2386` · `AccessReview.php:225`.

### B. auth_audit_log (인증 감사 — PARTIAL·해시체인 없음)

| 파일:라인 | 심볼 | 설명 | Part3-14 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:4159-4168` · `:4165` | `ensureAuditSchema`(at/user_id/actor/role/tenant_id/action/**detail TEXT**/ip/ua/risk) | detail=평문 문자열(구조화 trace 아님) | Auth Event(§3·격차) |
| `backend/src/Handlers/UserAuth.php:4174-4197` · `:4193-4195` | `audit`(single INSERT·high-risk시 forwardEvent 훅) | **해시체인 없음→tamper-evident 아님** | Runtime Context Recorder(부분) |
| `backend/src/Handlers/UserAuth.php:4203-4206` · `:4209-4226` | `logAudit` 공개 래퍼·`auditLogs` GET | TeamPermissions 등 공유 기록·조회 | Log/Query(부분) |

### C. menu_audit_log (메뉴 거버넌스 감사 — PARTIAL·verify 부재)

| 파일:라인 | 심볼 | 설명 | Part3-14 매핑 |
|---|---|---|---|
| `backend/src/Handlers/AdminMenu.php:123-131` · `:140-143` · `:128` · `:143` | 스키마(mysql/sqlite·hash_chain 컬럼) | 체인 컬럼 존재 | Event Store(부분) |
| `backend/src/Handlers/AdminMenu.php:169-212` · `:194` · `:197` · `:214-219` | `appendAudit`(prev_hash→sha256)·`lastHash` | 체인 append | Hash Chain(부분) |
| `backend/src/Handlers/AdminMenu.php:660-702` | `auditLog` 조회 | — | Query |

★**verify/무결성 재계산 메서드 부재**(AdminMenu 내 verify/integrity/hash_equals 무매치) → broken_at 탐지 불가(SecurityAudit 미달).

### D. access_review_item (증거 저장 패턴 — PRESENT·Part 3-8 선례)

| 파일:라인 | 심볼 | 설명 | Part3-14 매핑 |
|---|---|---|---|
| `backend/src/Handlers/AccessReview.php:62-81` · `:177-242` | `ensureTable`·`decision`(approve/revoke) | 검토 결정 이력(추가전용) | Evidence Preservation(§18) |
| `backend/src/Handlers/AccessReview.php:192-194` · `:219-222` | justification 필수(fail-secure)·이력 INSERT | 증거 없는 결정 차단 | Evidence(§26) |
| `backend/src/Handlers/AccessReview.php:225-233` · `:245-257` · `:87` · `:19-22` | SecurityAudit 이중기록·`history`·`classify`·api_key 축만 | **흡수 아닌 참조 패턴 선례** | Evidence Chain(참조) |

### E. SIEM forward / Log Aggregation (중앙집계·외부전송 — PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-14 매핑 |
|---|---|---|---|
| `backend/src/Handlers/Compliance.php:143-190` · `:148-187` · `:176` | `collectAuditEvents`(auth_audit_log+security_audit_log+audit_log 3소스 통합·테넌트 fail-closed) | 중앙 로그집계 | Log Aggregation(§21) |
| `backend/src/Handlers/Compliance.php:430-461` · `:440-442` · `:444` | `forwardEvent`(realtime opt-in·high severity만·SSRF/TOCTOU 재검사) | 외부 전송 | Telemetry forward |
| `backend/src/Handlers/Compliance.php:411-428` · `:211-262` · `:325` · `:463-510` · `:508` | `isSafeSiemUrl`·CEF/LEEF/syslog 직렬화·siemConfig·`siemPush`(반출 logAudit) | 직렬화·설정·푸시 | SIEM 연계 |
| `backend/src/Handlers/UserAuth.php:4243-4251` | `recordSessionMeta`(ip/ua/last_seen) | 세션 컨텍스트 기록(**결정 컨텍스트 스냅샷 없음**) | Runtime Context Recorder(§11·부분) |

## 3. 종합 판정

**Authorization Observability = ABSENT-forensics / PARTIAL-audit / PRESENT-hashchain.** Distributed Trace(OTel)·Correlation Engine·Decision Timeline·Decision Replay·Digital Twin(time-travel)·Policy/Permission/Session/Resource Trace·Authz Telemetry(P95/P99)·Trace Analytics·Forensic Case Management·**Chain of Custody/Evidence Export lifecycle/Retention/Legal-hold** 전부 순신규. 재활용: SecurityAudit 해시체인(§A·유일 tamper-evident 앵커)·auth_audit_log/menu_audit_log(§B·C·격차 보완)·access_review 증거참조 패턴(§D)·SIEM/집계(§E)·recordSessionMeta(§E·부분). 실 엔진은 SecurityAudit를 Immutable Event Store로 승격하고, 감사행에 trace/correlation/decision-context를 확장하며, forensics 층(replay/twin/case/custody)을 그 위에 **신설·참조**한다(흡수 아님). 마케팅 trace·인프라 SystemMetrics·Walmart correlation_id(GT②)는 **흡수 금지**.
