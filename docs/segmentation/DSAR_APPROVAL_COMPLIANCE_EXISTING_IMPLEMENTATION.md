# DSAR — Authorization Compliance & Regulatory Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> 본 문서는 Part 3-17 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/src/routes.php`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: Compliance/SecurityAudit/AccessReview/Mapping/UserAuth/AdminMenu/TeamPermissions 정독 + regulation/control_map/assessment/attestation/exception/gap/drift grep. 2 Explore 스레드(36 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**저장소에 성숙한 authz/보안 compliance posture 계층(`Compliance.php`)이 실재한다** — SOC2 Trust Service Criteria / ISO 27001:2022 Annex A readiness 스코어카드 + audit event 통합 + SIEM export. 여기에 **불변 evidence 해시체인·review/attestation·maker-checker** 실 substrate가 결합돼 있다. 그러나 **authz 특화 규제 프레임워크**(Regulatory Catalog·Control Library 영속·Control Mapping Engine=Regulation/Policy/Role/Permission/SoD/JIT→Control·per-scope Compliance Score·Assessment/Gap/Exception/Drift/Reconciliation)는 **부재(ABSENT)**.

- **★Golden Rule 확정 = `Compliance.php` EXTEND**(신설 아님). `Compliance.php:2-10`은 명시적으로 **보안/authz compliance 핸들러**(SOC2 TSC/ISO Annex A)이며 이미 RBAC/SSO/SCIM/encryption/audit를 authz control로 introspect(`:90-113`)하고 `/v424/compliance/*` 네임스페이스(`routes.php:1108-1118`)를 소유. Part 3-17의 정당한 확장점.
- **★유일 tamper-evident evidence = SecurityAudit 해시체인**(`SecurityAudit.php:14-68`·prev_hash→hash_chain append-only·verify()). Evidence Chain(§20)·Immutable Evidence(§32)의 실체.
- **★Attestation/Review 실 substrate = AccessReview**(`AccessReview.php:177-242`·justification 필수·SecurityAudit 증거 기록·단 api_key 축 한정).
- **★Compliance Workflow/Exception 승인 substrate = Mapping maker-checker**(`Mapping.php:238-291`·self-approval 차단·정족수).
- **★데이터 거버넌스 compliance(DataPlatform/Dsar/GdprConsent)와 엄격 분리**(GT② §B) — `Compliance.php`에 데이터품질 점수 희석 금지·`DataPlatform.php`에 authz 거버넌스 병합 금지.

## 2. 실존 substrate 카탈로그

### A. Compliance Posture 계층 (PARTIAL — 데이터/프라이버시 posture·authz 규제 프레임워크 아님·EXTEND 대상)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `Compliance.php:2-10` · `:53-130` · `:55` | `posture()`·SOC2 TSC/ISO Annex A readiness 스코어카드(requirePro) | 구현 control 라이브 introspection | Assessment(§9·PARTIAL) |
| `Compliance.php:60-87` · `:68-70` · `:71-74` · `:78-82` · `:83-85` · `:87` | security_audit_log/sso_config/gdpr_consent/email_suppression/APP_KEY 카운트 | control 구현여부 증거 신호 | Audit Readiness(§17·PARTIAL) |
| `Compliance.php:90-113` · `:93` · `:95` · `:97` · `:99-101` · `:102` · `:104` · `:105` · `:107` · `:109-113` | `$add()` 하드코딩 14 control(각 SOC2 TSC+ISO Annex A 태그) | 정적 in-memory control 리스트(영속/매핑 불가) | Control Library(§4·PARTIAL)·Control Mapping(§5·ABSENT 엔진) |
| `Compliance.php:115-120` · `:119-124` · `:122-129` | readiness_pct=(implemented+available*0.5)/total | 단일 flat 점수(per-regulation/scope 분해 없음) | Compliance Score(§10·PARTIAL) |
| `Compliance.php:143-190` · `:149-161` · `:163-175` · `:177-187` · `:188-189` | `collectAuditEvents` audit event 3소스 UNION 정규화(auth/security/audit_log) | 감사 이벤트 통합(audit_log는 tenant scope 시 제외 fail-closed) | Continuous Monitoring(§8·PARTIAL) |
| `Compliance.php:198-209` · `:200-206` | `auditScope` admin=global/enterprise=own/else=false(세션 서버도출) | tenant 격리 | Tenant Isolation |
| `Compliance.php:212-263` | `toCef`/`toLeef`/`toSyslog`/`serializeEvents` SIEM 직렬화 | 표준 포맷 | Reporting(§18·PARTIAL·규제리포트 아님) |
| `Compliance.php:269-300` · `:274` · `:277` | `auditExport`(requirePlan enterprise+tenantSecurityWrite·json/ndjson/cef/leef/syslog) | 감사 증거 export | Audit Readiness(§17)·Evidence(§20) |
| `Compliance.php:307-428` · `:411-428` | siemCfg/siemConfig·isSafeSiemUrl(SSRF 가드) | SIEM 설정 | Reporting infra |
| `Compliance.php:430-461` · `:438-439` · `:463-511` | `forwardEvent`(static·고심각 실시간 SIEM forward)·`siemPush`(배치) | 실시간 이벤트 forward | Continuous Monitoring(§8) |
| `routes.php:1108-1118` · `:3518-3523` | `/v424/compliance/*` 라우트 | 네임스페이스 소유 | EXTEND 정본 |

### B. Immutable Evidence Chain (PRESENT — SecurityAudit 해시체인·유일 tamper-evident)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `SecurityAudit.php:4-11` · `:14-33` · `:25` · `:27` · `:28-31` · `:32` | `log()` append(sha256 prev\|tenant\|actor\|action\|details\|now·best-effort) | append-only tamper-evident | Evidence Chain(§20·PRESENT) |
| `SecurityAudit.php:35-41` · `:39` · `:43-53` · `:48-52` | `lastHash`(GENESIS seed)·`ensure()` DDL(prev_hash/hash_chain CHAR(64)) | 체인 스키마 | Immutable Evidence(§32) |
| `SecurityAudit.php:56-68` · `:63` · `:64-67` | `verify()` 재계산·hash_equals·broken_at | 무결성 검증 | Evidence Verification(§31·§34) |
| `SecurityAudit.php:71-153` | `recent`/`recentByType`/`acquisitionSummary`(tenant-scoped 읽기) | 조회 | Evidence 조회 |
| `AdminGrowth.php:1429` | `SecurityAudit::verify()` 내부 호출부 | 검증 노출(전용 라우트 없음) | Verify Evidence Chain(§31) |

### C. Review / Attestation substrate (PARTIAL — AccessReview·api_key 축 한정)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `AccessReview.php:13-35` · `:19-23` · `:49-52` | Part 3-8 review·api_key(머신 identity) 축 한정·app_user 보류·requireAdmin | 범위 정직표기 | Attestation(§16·PARTIAL) |
| `AccessReview.php:87-122` · `:99-121` · `:39` · `:41` | `classify` EXPIRED/STALE_UNUSED/DORMANT/EXPIRING_SOON/OK(임계 DORMANT=90·WARN=14) | 결정론 상태도출 | Review Status(§17) |
| `AccessReview.php:125-174` · `:177-242` · `:188-190` · `:191-194` · `:219-222` · `:224-233` · `:225` · `:245-257` · `:62-81` | `keys`/`decision`(approve\|revoke·justification 필수 fail-secure·access_review_item·SecurityAudit::log 증거)·`history`·`ensureTable` | 근거기반 인증결정+불변증거 | Attestation(§16)·Evidence(§20) |

### D. Maker-checker / Workflow / Exception 승인 (PARTIAL — Mapping·ops 축·compliance 특화 아님)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `Mapping.php:31` · `:183` · `:209` · `:238-291` · `:244-248` · `:267-269` · `:278-280` · `:285-288` · `:291` · `:309-310` | 정족수 maker-checker(approver 필수·self-approval 차단 maker≠checker·per-approver dedup·정족수 approved·apply 게이트) | 승인 워크플로 패턴 | Workflow(§14)·Exception 승인(§15·재사용 패턴·compliance scope 아님) |
| `Db.php:592-600` · `:623-636` | `action_request`(approvals_json)·`mapping_change_request`(status/requested_by/required_approvals) | 승인요청 테이블 | Exception Manager(§15·재사용) |

### E. Audit Trail (PRESENT — 3 store·혼합 chaining·미통합)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `UserAuth.php:4159-4168` · `:4165` · `:4174-4197` · `:4190-4191` · `:4193-4195` · `:4203-4206` · `:4209-4226` | `auth_audit_log`(평문·비체인)·`audit()`(risk=high시 Compliance::forwardEvent)·`logAudit`·`auditLogs` | 인증 감사 trail | Audit Control(§4)·Evidence(§20·비체인) |
| `AdminMenu.php:123-131` · `:140-143` · `:169-212` · `:182` · `:183-197` · `:199-210` · `:214-219` | `menu_audit_log`(hash_chain CHAR(64))·`appendAudit` 해시체인 | 메뉴 거버넌스 2차 체인 | Evidence(§20·체인) |
| `UserAuth.php:3681-3686` · `:3706` | `tenant_security_policy`(mfa_policy/siem_config) DDL·setter 가드 | 테넌트 보안정책 | 정책 저장 |

### F. Control Mapping 대상 — RBAC/PDP/PEP (PRESENT 대상·매핑 계층 없음)

| 파일:라인 | 심볼 | 설명 | Part3-17 매핑 |
|---|---|---|---|
| `index.php:59` · `:118-121` · `:195-335` · `:324-325` · `:423-461` · `:436-439` · `:448-461` · `:600-619` · `:600-604` · `:611` · `:611-612` · `:615-618` · `:619` | PEP 미들웨어·X-Tenant-Id 서버도출 강제(위조 차단)·compliance 라우트 bypass | 집행점(PEP)·tenant 격리 | Control Mapping 대상(§5)·Tenant Isolation(§32·PRESENT) |
| `TeamPermissions.php:624-693` · `:695-701` · `:704-712` · `:715-731` · `:737` · `:738-739` | `effectivePermissions`(PDP)·`assignablePermissions`(위임상한)·`teamAudit`·ORG_PRESET(resource→action) | 권한 결정(PDP) | Control Mapping 대상(Role/Permission→Control) |
| `Db.php:20-21` · `:27-30` · `:116-166` · `:136-154` · `:159-163` · `:308-321` · `:330-358` · `:365-381` · `:387-407` · `:414-427` · `:434-440` · `:540-546` · `:809` | PDO 싱글톤·MySQL→SQLite 폴백·self-healing ensureTables 패턴·`audit_log` DDL·`audit()` helper | DB 인프라(compliance_*/regulation/control_map 테이블 부재) | 신규 테이블 대상 |

## 3. 종합 판정

**Authorization Compliance & Regulatory Governance = EXTEND-Compliance.php(데이터/프라이버시 posture 실재) + PRESENT-evidence(SecurityAudit 해시체인) + PARTIAL(AccessReview attestation·Mapping maker-checker·audit trail 3store·flat readiness score) / ABSENT-framework(Regulatory Catalog·Control Library 영속·Control Mapping Engine·Rule Engine·Assessment/Gap Engine·per-scope Compliance Score·Attestation Engine·Audit Readiness Engine·Regulatory Reporting·Regulatory Change Manager·Exception Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard·Static Lint 순신규).** ★SoD/JIT는 grep 0(maker-checker self-approval 차단 `Mapping.php:267-269`이 유일 SoD-근접). 재활용: `Compliance.php`→규제 프레임워크 확장(정본)·SecurityAudit→Compliance Evidence Chain·AccessReview justification→Attestation/Exception 라이프사이클·Mapping maker-checker→Compliance Workflow·TeamPermissions/index.php→Control Mapping 대상. ★데이터 거버넌스(DataPlatform/Dsar/GdprConsent·GT②)는 **흡수·병합 금지**.
