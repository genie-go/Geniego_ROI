# GeniegoROI Claude Code Implementation Specification

# CCIS Part040 — Enterprise Security Operations (SecOps), SOC, SIEM & Threat Intelligence Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

SecOps·SOC·SIEM·SOAR·Threat Intelligence 표준을 수립한다.

> ★**성격(강한 축=보안 컨트롤+감사 substrate·부재 축=형식 SOC/SOAR/UEBA/EDR 도구)**: 보안은 이 저장소가
> **은행급**을 지향하는 **강한 영역**이다(헌법 9대 원칙). 다만 **보안 컨트롤·감사 substrate**가 강하고 **형식
> SecOps 도구(SOC/SIEM 제품·SOAR 엔진·UEBA·EDR/XDR·MITRE 매핑)**는 별도 제품층으로 없다. ★**강한 축**:
> **`SecurityAudit`**(240차·**tamper-evident 해시체인 append-only 감사로그**·유일 정본·`verify()`·forensics
> 증적)·**`Compliance`**(SOC2 TSC/ISO 27001 Annex A **준비도 대시보드**+실측 introspection+**SIEM 로그
> 포워더**)·**`AnomalyDetection`**(이상탐지·UEBA 유사)·**`Alerting`**(경보·SOAR notification 유사)·
> **`action_request`+`agent_mode`**(자동 대응 승인)·**로그인 rate-limit/OTP 스로틀**·**`Ssrf` 가드**·
> **writeGuard 서버전역**·**세션 hash-only 게이트**·**high-value 게이트**(₩5M↑ 무승인 차단)·MFA·RBAC 가 강하게
> 실재한다. ★**부재 축**: 명세의 **형식 SOC/SIEM 제품(Splunk/ELK)·SOAR Playbook 엔진·UEBA 전용·EDR/XDR·
> Threat Intelligence Feed·IOC 관리·MITRE ATT&CK 매핑·Threat Hunting·Case Management·Alert Correlation
> 엔진**은 **부재/부분**(grep 0). Part001 §4 에 따라 실측 → SOAR/UEBA/EDR/MITRE 부재증명 → 실 보안운영
> substrate 성문화했다. ★정본=Part023(Observability)·Part012(Auth/Security)·Part030(IAM) 승계·**SecurityAudit
> 재오염 금지**. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 보안운영 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| SecOps Architecture | App→Collector→SIEM→Correlation→SOAR→IR | **부분** — `SecurityAudit`(수집/불변)·`Compliance`(SIEM 포워드)·`Alerting`. 형식 SIEM→SOAR 파이프라인 아님 |
| Security Event Collection | API/Auth/DB/Network/WAF | **부분** — `SecurityAudit`(민감 액션·로그인/플랜/자격변경)·error_log·nginx. OS/WAF/Network 형식 수집 부분 |
| SIEM | 수집/정규화/Correlation/Alert | **부분(대응물)** — `Compliance`(SIEM 로그 포워더)·`SecurityAudit`. 형식 SIEM 제품(Splunk/ELK) 아님 |
| SOAR | Playbook/자동대응/Ticket | **부분(대응물)** — `Alerting`(경보)·`action_request`(승인 대응)·`RuleEngine`. 형식 Playbook 엔진 아님 |
| Threat Intelligence | IOC Feed/IP·Domain Reputation | **부재** — Threat Feed/IOC 관리 없음. `Ssrf`(IP 정책)는 방어이지 threat intel 아님 |
| Threat Hunting | IOC/행위/AI 헌팅 | **부재** — 능동 헌팅 도구 없음. `AnomalyDetection` 이상탐지는 있음 |
| UEBA | 로그인/API/권한 행위분석 | **부분(대응물)** — `AnomalyDetection`·로그인 rate-limit·이상 로그인. 형식 UEBA 베이스라인 부분 |
| EDR/XDR | Endpoint/Malware/Isolation | **부재(out of scope)** — 엔드포인트 EDR 없음(SaaS 서버·엔드포인트 관리 대상 아님) |
| Alert Correlation | Rule/Time/Multi-Source/AI | **부분** — `Alerting`·`RuleEngine`. 형식 Correlation 엔진 아님 |
| Incident Response | Detection→Recovery→Lessons | **부분** — `SecurityAudit`(증적)·`Alerting`·수동 대응. 형식 IR 워크플로 부분 |
| Digital Forensics | 증거/로그보존/Timeline/Hash | ★**대응물** — `SecurityAudit`(**tamper-evident 해시체인**·불변·hash 검증). Timeline=감사 순서 |
| IOC Management | IP/Domain/Hash/Cert | **부재** — IOC 저장소 없음 |
| MITRE ATT&CK | Tactic/Technique 매핑 | **부재** — ATT&CK 매핑 없음 |
| Security Dashboard | Active Alerts/Risk Score | **부분** — `Compliance` 준비도·`Alerting`·`AnomalyDetection`. SOC 실시간 대시보드 부분 |
| Case Management | Incident ID/Owner/Severity | **부분** — `action_request`·`SecurityAudit`. 형식 Case 관리 부분 |
| Monitoring | Alert Volume/FP Rate/Latency | **부분** — `SystemMetrics`(정직 null)·`Alerting`. SOC KPI 부분 |
| Logging | Event/Tenant/Source/Severity | ★**준수** — `SecurityAudit`(불변 해시체인·tenant/actor/action/ip/ua) |
| Security(RBAC/MFA/Immutable/Time Sync) | SOC 최소권한 | ★**준수** — RBAC+Scope·MFA(TOTP)·`SecurityAudit` 불변·UTC(`gmdate`)·`Crypto` |
| Compliance(ISO 27001/27035/SOC2/NIST) | 보안 규정 | ★**부분 준수** — `Compliance`(SOC2/ISO 준비도 매핑). ★**실제 인증=외부 감사**(준비도/증적이지 인증서 아님) |
| Disaster Recovery | SIEM/IOC/IR DB 복구 | **부분** — DB 백업(`security_audit_log`). IOC/Playbook 대상 없음 |
| Performance(Dedup/압축/병렬) | 대량 이벤트 | **부분** — best-effort 감사·일반 인덱스. 형식 이벤트 파이프라인 아님 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Security by Default/Zero Trust/Continuous Monitoring/Automated Containment/Immutable Audit/Evidence Preservation/Tenant Isolated) | **★대체로 준수** | ★Immutable Audit(`SecurityAudit` 해시체인)·Evidence Preservation·Tenant Isolated·MFA/RBAC. Automated Containment 부분 |
| §4 SecOps Architecture | **부분** | `SecurityAudit`+`Compliance`(SIEM 포워드)+`Alerting`. 형식 SIEM→SOAR 아님 |
| §5 Event Collection | **부분** | `SecurityAudit`(민감 액션)·error_log·nginx. WAF/Network 형식 부분 |
| §6 SIEM | **부분(대응물)** | `Compliance` 로그 포워더. Splunk/ELK 아님 |
| §7 SOAR | **부분(대응물)** | `Alerting`·`action_request`·`RuleEngine`. Playbook 엔진 아님 |
| §8~§9 Threat Intel/Hunting | **부재** | Threat Feed/IOC/헌팅 없음. `AnomalyDetection` 이상탐지는 있음 |
| §10 UEBA | **부분(대응물)** | `AnomalyDetection`·rate-limit·이상 로그인. 형식 베이스라인 부분 |
| §11 EDR/XDR | **부재(out of scope)** | 엔드포인트 EDR 없음 |
| §12 Alert Correlation | **부분** | `Alerting`·`RuleEngine`. Correlation 엔진 아님 |
| §13 Incident Response | **부분** | `SecurityAudit` 증적·수동 대응. 형식 IR 부분 |
| §14 Digital Forensics | **★대응물** | `SecurityAudit`(tamper-evident 해시체인·불변) |
| §15~§16 IOC/MITRE | **부재** | IOC 저장소/ATT&CK 매핑 없음 |
| §17 Security Dashboard | **부분** | `Compliance`·`Alerting`·`AnomalyDetection` |
| §18 Case Management | **부분** | `action_request`·`SecurityAudit` |
| §19 Monitoring | **부분** | `SystemMetrics`(정직 null)·`Alerting` |
| §20 Logging | **★준수** | `SecurityAudit` 불변 해시체인 |
| §21 Security | **★준수** | RBAC+Scope·MFA·불변 감사·UTC·`Crypto` |
| §22 Compliance | **★부분 준수** | `Compliance`(SOC2/ISO 준비도). 실제 인증=외부 감사 |
| §23 Disaster Recovery | **부분** | `security_audit_log` 백업. IOC/Playbook 대상 없음 |
| §24 Performance | **부분** | best-effort 감사·인덱스. 이벤트 파이프라인 부분 |
| §25~§26 PHP/Claude(Event API/SIEM·SOAR Adapter/IOC Repo/UEBA Service) | **부분** | ★`SecurityAudit`·`Compliance`·`Alerting`·`AnomalyDetection`. SOAR/IOC/UEBA 전용 부재 |
| §27~§28 검증(siem:health/ioc:status/soar:playbook) | **대상 없음** | artisan 없음. `SecurityAudit::verify`·`Compliance` API·`Alerting` 로 대체 |

---

## 4. 확립된 표준 (신규 보안운영 코드가 따를 정본)

- ★**감사/포렌식 정본 = `SecurityAudit`**(240차·**유일 tamper-evident 해시체인**·append-only·`verify()`). 민감 액션(로그인/플랜/자격/권한 변경)은 이 체인에 기록. ★**재오염 금지**(참조·흡수 아님)·**중복 감사체인 신설 금지**(`audit_log`/`menu_audit_log`는 별개 관심사).
- ★**감사 정직(한계 명시)**: 해시체인은 **탐지만·막지 못한다**(DB 관리자 UPDATE 가능·best-effort·감사 실패가 원 액션 막지 않음). ★**`menu_audit_log.hash_chain`은 tamper-evident 아님** — 정본은 `SecurityAudit::verify()`만.
- ★**SIEM/컴플라이언스 = `Compliance`**(SOC2 TSC/ISO 27001 Annex A 매핑·**실측 introspection**·SIEM 로그 포워더). ★**준비도/증적이지 실제 인증 아님**(SOC2 Type II·ISO 심사=외부 감사 프로세스·날조 금지).
- ★**이상탐지/UEBA = `AnomalyDetection`** + 로그인 rate-limit/OTP 스로틀. 자동 대응=`Alerting`(경보)·`action_request`(승인 containment)·`RuleEngine`. 중복 엔진 신설 금지.
- ★**Zero Trust 컨트롤**: writeGuard 서버전역·세션 hash-only 게이트(raw 비교 금지)·high-value 게이트(₩5M↑ 무승인 차단)·`Ssrf` 가드(DNS rebinding·메타데이터 차단)·MFA·RBAC+Scope·`Crypto` AES.
- ★**정직 미산출·테넌트 격리**: SOC 지표 산출 불가=null+사유(`SystemMetrics`·가짜값 금지). 보안 데이터 테넌트 격리 절대·UTC 저장.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 SOC/SIEM 제품(Splunk/ELK/QRadar)** — 안 함. `SecurityAudit`(불변 감사)+`Compliance`(SIEM 포워더)가 대응물. 전용 SIEM=인프라 도입.
2. **SOAR Playbook 엔진·Alert Correlation 엔진·형식 Case Management** — 안 함. `Alerting`+`action_request`(승인 대응)+`RuleEngine`이 대응물. Playbook 자동화 엔진 미도입.
3. **Threat Intelligence Feed·IOC 관리·Threat Hunting·MITRE ATT&CK 매핑** — 안 함. IOC 저장소/ATT&CK 커버리지 없음. `AnomalyDetection`(이상탐지)·`Ssrf`(IP 정책)는 방어이지 threat intel 아님.
4. **UEBA 전용 엔진·EDR/XDR** — 부분/부재. `AnomalyDetection`+rate-limit 가 UEBA 유사. EDR=엔드포인트 관리 대상 아님(SaaS 서버).
5. **형식 ISO 27001/27035/SOC 2 Type II 인증** — 안 함. `Compliance`는 **준비도/증적**(기술 통제는 준수)·실제 인증서는 외부 감사 프로세스(날조 금지).
6. **artisan `siem:*`/`ioc:*`/`soar:*` 명령** — 없음(Slim). `SecurityAudit::verify`·`Compliance` API·`Alerting` 로 대체.

★**준수하는 실 원칙(강함)**: **tamper-evident 감사(SecurityAudit 해시체인·유일 정본·재오염 금지)·감사 한계 정직 명시(탐지 only·best-effort)·SIEM 포워드+컴플라이언스 준비도(인증 아님·날조 금지)·이상탐지(AnomalyDetection)·Zero Trust 컨트롤(writeGuard/세션 hash-only/high-value 게이트/Ssrf/MFA/RBAC)·정직 미산출·테넌트 격리·UTC**.

---

## 6. Claude Code 구현 규칙

1. 감사=`SecurityAudit`(유일 해시체인) 기록. ★재오염 금지·중복 감사체인 금지. ★해시체인 한계 정직(탐지 only·`menu_audit_log`≠tamper-evident·정본=`verify()`).
2. SIEM/컴플라이언스=`Compliance`(SOC2/ISO 매핑·SIEM 포워드). ★준비도/증적이지 인증 아님(날조 금지).
3. 이상탐지=`AnomalyDetection`+rate-limit/OTP 스로틀. 자동 대응=`Alerting`+`action_request`+`RuleEngine`(중복 엔진 금지).
4. ★Zero Trust: writeGuard 서버전역·세션 hash-only(raw 비교 금지)·high-value 게이트·`Ssrf`(DNS rebinding/메타데이터)·MFA·RBAC·`Crypto`.
5. ★정직 미산출(SOC 지표=null+사유·가짜값 금지)·테넌트 격리 절대·UTC 저장.
6. SOAR 엔진/UEBA 전용/EDR·XDR/Threat Feed/IOC/MITRE 를 "명세에 있다"는 이유로 이식하지 않는다(SecurityAudit+Compliance+AnomalyDetection+Alerting 로 커버). 전용 SecOps 도구=인프라 도입 결정 후.

---

## 7. Completion Criteria

- [x] 보안운영 스택 **실측**(SOAR/UEBA/EDR/XDR/MITRE/IOC/Threat Feed 부재·`SecurityAudit` 해시체인·`Compliance` SIEM/준비도·`AnomalyDetection`·Zero Trust 컨트롤 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 SOC/SOAR/UEBA/EDR/MITRE 부재 증명·감사/컨트롤 강함)
- [x] 실 보안운영(SecurityAudit+Compliance+AnomalyDetection+Alerting+Zero Trust 컨트롤) 성문화(§4)
- [x] ★tamper-evident 감사(재오염 금지·한계 정직)·컴플라이언스 준비도(인증 아님·날조 금지)·Zero Trust 컨트롤·정직 미산출·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — SOC/SIEM 제품/SOAR 엔진/Threat Intel/IOC/MITRE/UEBA 전용/EDR
- [x] Claude Code 규칙(§6) · `SecurityAudit`·`Compliance`·`AnomalyDetection`·`Alerting` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **강한 보안 컨트롤+감사 substrate**(`SecurityAudit` tamper-evident
> 해시체인 + `Compliance` SIEM/준비도 + `AnomalyDetection` + Zero Trust 컨트롤)의 성문화이지 Splunk/SOAR
> 엔진/UEBA/EDR/MITRE 이식이 아니다. ★**정직**: 해시체인은 **탐지만 하지 막지 못하고**(best-effort), `Compliance`
> 는 **준비도/증적이지 실제 인증이 아니다**(외부 감사). 부재(SOAR/threat intel/IOC)는 전용 도구 도입 결정 후.

---

## 다음 Part

**CCIS Part041 — Enterprise Data Lake, Lakehouse, Streaming & Real-Time Data Platform** — ★사전 실측 예고: 형식 Data Lake/Lakehouse(Iceberg/Delta/Hudi)·Kafka/Pulsar·CDC·Schema Registry 는 **부재**(Part026/034 승계)이나, 데이터 파이프라인 실체는 **MySQL rollup 집계(de-facto DWH)·cron sync ETL 7종·증분(synced_at)·`EventNorm`(스키마 정규화)·V3 Trust·SSE/폴링(준실시간)·`DataPlatform` Data Source Registry**로 실재. Part041 도 실측→Iceberg/Kafka/CDC 부재증명→rollup+cron ETL+EventNorm 성문화(스트리밍 플랫폼 이식 금지). ★Part018(Queue/Event)·Part026(DWH)·Part017(캐시) 승계·"채널 나열 금지·정규화" 재확인.
