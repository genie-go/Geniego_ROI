# GeniegoROI Claude Code Implementation Specification

# CCIS Part013 — Exception Handling, Error Code & Logging Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

예외 처리·오류 코드·로깅·추적 표준을 수립한다.

> ★**성격(Part001~012 와 동일)**: 사용자가 Part013 명세(예외 계층·Error Code 체계 `MODULE-CAT-NUM`·
> Global Exception Handler·Monolog PSR-3 구조화 로깅·traceId/Correlation ID·OpenTelemetry·Circuit
> Breaker)를 제공했으나 **그대로 따르지 않았다.** 실측 결과 이 저장소는 **`\Throwable` catch →
> `{ok:false, error:'...'}` + `error_log()`** 가 정본이며, custom 예외계층·Error Code 체계·Monolog·
> traceId·OTel·Circuit Breaker 는 **부재**다. Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재
> 규약 성문화**했다. (문서 차수 — 코드 무변경. ★§30 백엔드 빈 catch 672 는 관찰·권고.)

---

## 2. 실측 — 현행 예외/로깅 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Exception 계층 | Domain/App/Infra/… custom 계층 | **custom `*Exception` 0개**(Part008/012) — `\Throwable`/`\Exception`/`RuntimeException` 직접 |
| Error Code 체계 | `MODULE-CAT-NUM`(불변) | **형식 0**. 안정식별자 5개(`TENANT_ACCESS_DENIED` 류) + 대부분 **free-form 문자열 메시지** |
| API Error Response | `{success:false,error:{code,message,details},traceId,timestamp}` | **`{ok:false, error:'문자열'}`**(Part011). traceId/timestamp 없음 |
| Global Exception Handler | Error Code 매핑·중앙 처리 | **부분** — `public/index.php` 의 Slim 미들웨어 + 핸들러 try/catch. Error Code 매핑 계층 아님 |
| Logging | Monolog PSR-3·구조화(JSON) | **`error_log()` 117** — ★Monolog 는 composer require 에 있으나 **실사용 0**(사문 의존성)·PSR LoggerInterface 0 |
| Log Level | PSR-3 8단계 | **비명시** — error_log 자유형식. 심각도=문맥 |
| Trace ID / Correlation ID | 전 요청·`X-Trace-Id`/`X-Correlation-Id` | **부재**(Part011) |
| Distributed Tracing / OpenTelemetry | Jaeger/Tempo/OTel | **부재**. `SystemMetrics` 프로브·`Compliance` SIEM 포워더 |
| Retry | 지수 백오프 | **실재**(retry 132·외부연동 재시도) |
| Circuit Breaker | LLM/Payment/Carrier | **부재**(0) — timeout+catch 폴백으로 대체 |
| Timeout | DB/Redis/External 상한 | ★**준수**(188 — `CURLOPT_TIMEOUT`/`connect_timeout`·무제한 없음) |
| Audit Log | 불변·App 로그 분리 | ★**`SecurityAudit`(해시체인)·`action_request`·`ai_call_log`**(Part012) — App 로그(error_log)와 분리 |
| ★빈 catch(§30/§31) | 금지·No Silent Failure | **인라인 빈 `catch(){}` 672**(총 catch 1717) — 다수 의도적 best-effort(주석 有) but 대규모 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Fail Fast/Fail Secure/No Silent Failure/Structured Logging) | **부분** | Fail Fast(early-return)·Fail Secure(writeGuard) 준수. **No Silent Failure·Structured Logging 은 미흡**(빈 catch 672·error_log 자유형식) |
| §4~§9 Exception 계층/Domain/App/Infra/Validation/Auth | **미적용** | custom 예외 0. `\Throwable` 직접 catch |
| §10~§11 Error Code 체계 | **미적용** | `MODULE-CAT-NUM` 0. 안정식별자 5 + free-form. **오류 코드는 안정식별자 지향**(CODING-STANDARDS §4.4) |
| §12 API Error Response | **상이** | `{ok:false,error}`(Part011). traceId/timestamp 없음. ★Stack Trace 미노출(준수) |
| §13 Global Exception Handler | **부분** | Slim 미들웨어 + 핸들러 catch. Error Code 매핑 중앙계층 아님 |
| §14 HTTP Status 매핑 | **부분 준수** | 401/403/404/409/422/500 상황별 사용(Part011). Exception→Status 자동매핑 아님 |
| §15 Retry(Validation/Auth 재시도 금지) | **부분 준수** | 외부연동 retry 132. 검증/인증 오류는 재시도 안 함 |
| §16 Circuit Breaker | **미적용** | 부재. timeout+catch 폴백(ClaudeAI 등) |
| §17 Timeout | **★준수** | connect/exec timeout 188·무제한 없음. ★외부 API 는 트랜잭션 밖(285차) |
| §18~§19 Structured Logging/PSR-3 Level | **미적용** | `error_log()` 자유형식. Monolog 미사용 |
| §20~§21 Logging 대상/금지(민감정보 Masking) | **부분 준수** | ★민감정보 로그 금지 준수(credentials 정책·PII 미저장). 구조화·전대상 로깅은 아님 |
| §22~§23 Trace ID / Correlation ID | **미적용** | 부재 |
| §24~§25 Distributed Tracing/OTel | **미적용** | OTel 부재. SystemMetrics·SIEM |
| §26~§27 Audit Log / App 로그 분리 | **★준수** | SecurityAudit(감사·불변 지향) vs error_log(운영) 분리 |
| §28 Log Rotation | **부분** | 서버 logrotate·nginx/php 로그. 앱 로그 정책 부분 |
| §29 Monitoring 연계(ELK/Loki) | **부분** | Compliance SIEM 포워더. 중앙 로그수집 부분 |
| §30~§31 Secure Coding(빈 catch 금지·No Silent Failure) | **미흡(관찰)** | ★백엔드 인라인 빈 catch **672**. 프론트는 우선순위2 에서 339→0 문서화 완료. 백엔드는 미완(§5 권고) |
| §32 검증(phpstan/otelcol) | **부분** | phpstan 실동작. otelcol 대상 없음 |

---

## 4. 확립된 표준 (신규 코드가 따를 정본)

- **예외**: `\Throwable`/`\Exception` catch → **`{ok:false, error:'명확한 메시지'}`**. Stack Trace 미노출(§12 준수). custom 예외계층 신설하지 않는다(Part008).
- **오류 식별자**: 안정 식별자(`TENANT_ACCESS_DENIED`·`ORDER_NOT_FOUND` 류) 지향(CODING-STANDARDS §4.4). 변경 금지.
- **HTTP Status**: 상황별 표준(401/403/404/409/422/429/500).
- **로깅**: `error_log()`(정본). ★**민감정보(비번/토큰/Secret/API키/PII) 로그 금지·Masking**. 반복 로그 억제.
- **감사**: 승인/권한/보안=`SecurityAudit`(해시체인·불변 지향)·`action_request`·`ai_call_log`. **운영 로그(error_log)와 분리 유지**.
- **Timeout**: 외부 호출은 connect/exec timeout 필수(무제한 금지). ★외부 API 는 트랜잭션 밖·루프 내 N+1 금지(285차).
- **Retry**: 외부연동만(검증/인증/비즈니스 오류 재시도 금지). 지수 백오프.
- **빈 catch(§30)**: ★신규 빈 `catch`는 **사유 주석 필수**(무음 삼킴 금지·No Silent Failure). 프론트 정합(우선순위2).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **custom 예외 계층·Error Code 체계(`MODULE-CAT-NUM`)** — 안 함. `\Throwable`+`{ok:false,error}`·안정식별자가 정본. 예외계층 도입=핸들러 전면 재작성(Part008 Golden Rule).
2. **Monolog PSR-3 구조화 로깅** — 안 함. `error_log()` 정본. ★Monolog 는 composer require 에 있으나 **미사용(사문 의존성)** — 정리 후보(권고).
3. **traceId/Correlation ID/OpenTelemetry/Distributed Tracing** — 안 함(Part011/012). SystemMetrics·SIEM 부분.
4. **Circuit Breaker** — 안 함. timeout+catch 폴백으로 대체.
5. **백엔드 빈 catch 672 일괄 문서화** — ★**본 차수 미실행**. 프론트 339(우선순위2)와 동급의 **별도 대형 작업**이라 문서 차수에 부적절. §6 권고로 기록.

★**준수하는 실 원칙**: Fail Fast/Fail Secure·Timeout·민감정보 로그금지·Audit 분리(SecurityAudit)·Stack Trace 미노출.

---

## 6. ★관찰 및 권고 (§30 — 백엔드 빈 catch 672)

- 명세 §30/§31 은 "빈 catch 금지·No Silent Failure"를 요구하나, 백엔드에 **인라인 빈 `catch(){}` 672건**(총 catch 1717)이 존재한다. 다수는 의도적 best-effort(주석 有·`/* 빈 결과(정직) */` 등)이나 **무음 실패가 숨을 조건**을 만든다.
- 프론트엔드는 **우선순위2 에서 ESLint `no-empty` 339 → 0(사유 주석 문서화)** 로 이미 처리했다(무음 삼킴 → 문서화된 의도). 그 과정에서 실결함도 노출됐다(AuthPage onBlur·290차).
- ★**본 차수 미실행 사유**: 백엔드 672 는 프론트 339 와 동급의 **별도 대형 작업**이며, PHPStan 기본 규칙은 빈 catch 를 잡지 않는다(프론트 ESLint no-empty 같은 게이트 부재). 문서 작성 차수에 672 건 일괄 수정은 부적절.
- **권고(향후 별도 차수)**: ① 백엔드 빈 catch 전수 감사 → 유형별 사유 주석/최소 로깅(단 `error_log` 남발 주의) ② 그 과정에서 **게이트가 프론트에서 그랬듯 실결함이 노출될 가능성 높음**(우선순위 후보) ③ 가능하면 빈-catch 카운트 baseline 게이트 편입 검토.

---

## 7. Claude Code 구현 규칙

1. 예외=`\Throwable` catch → `{ok:false,error}`. **Stack Trace 미노출**. custom 예외계층 신설 금지.
2. ★**신규 빈 `catch`는 사유 주석 필수**(No Silent Failure·프론트 정합). 무음 삼킴 금지.
3. 오류 식별자=안정식별자(변경 금지). HTTP Status 상황별 표준.
4. ★**민감정보(비번/토큰/Secret/API키/PII) 로그 금지·Masking**. `error_log` 반복 남발 금지.
5. 감사=`SecurityAudit`/`action_request`/`ai_call_log` 재사용(운영 로그와 분리·중복 감사엔진 금지).
6. 외부 호출=timeout 필수·트랜잭션 밖·retry 는 외부연동만(검증/인증 재시도 금지).
7. Error Code 체계·Monolog·traceId·OTel·Circuit Breaker 를 "명세에 있다"는 이유로 이식하지 않는다.

---

## 8. Completion Criteria

- [x] 예외/로깅 **실측**(custom 예외 0·Error Code 0·error_log·빈 catch 672·timeout 188·retry 132)
- [x] 명세 §3~§32 **섹션별 매핑·판정**(예외계층/Error Code/Monolog/traceId/OTel/Circuit Breaker 부재 증명)
- [x] 실 예외/로깅 규약(`{ok:false,error}`·안정식별자·error_log·SecurityAudit 분리·timeout) 성문화(§4)
- [x] Timeout(§17)·Audit 분리(§26)·민감정보 로그금지(§21)·Stack Trace 미노출 준수 명시
- [x] ★§30 백엔드 빈 catch 672 관찰·권고(미실행·향후 차수)(§6)
- [x] 의도적 미적용 + 사유(§5) · Claude Code 규칙(§7) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 `\Throwable`+`{ok:false,error}`+`error_log` 예외/로깅 규약의 성문화이지 예외계층/Monolog/OTel 이식이 아니다. ★빈 catch 672 는 향후 별도 차수 권고.

---

## 다음 Part

**CCIS Part014 — Testing Strategy & Quality Assurance** — ★사전 경고: 단위테스트 프레임워크(PHPUnit/Pest·vitest) **부재**(Part004). 실재=i18n triage 자기검증 3종(16 invariants·pre-commit)·`npm run e2e`(smoke/render/scenarios)·PHPStan·ESLint 베이스라인·composer audit 게이트. Part014 는 실측→매핑→기존 게이트/E2E 성문화(Test Pyramid 이식 아님).
