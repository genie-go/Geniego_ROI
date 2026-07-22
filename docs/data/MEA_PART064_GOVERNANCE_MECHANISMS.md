# MEA Part 064 — GOVERNANCE MECHANISMS (§12~§19 거버넌스·보안·AI·완료기준)

> 289차 후속(2026-07-22) · **코드 변경 0 · NOT_CERTIFIED · 배포 없음**
> 근거 전량 [`GT①`](MEA_PART064_EXISTING_IMPLEMENTATION.md)·[`GT②`](MEA_PART064_DUPLICATE_AUDIT.md)·[`ADR`](../architecture/ADR_MEA_PART064_QUANTUM_ADVANCED_COMPUTING.md).

---

## 1. §12 Computing Governance 8종

| 항목 | 판정 |
|---|---|
| Resource Policy · Scheduling Policy · Quantum Policy · Capacity Policy · Usage Validation | **ABSENT — 사업 범위 밖**(관리 대상 자산이 존재하지 않는다) |
| Security Policy · Compliance Policy | **범용은 실재 / 연산 스코프는 ABSENT** — 전역 RBAC·writeGuard·`Compliance` SIEM(057)은 있으나 **연산 자원에 적용할 대상이 없다** |
| **Audit Trail** | **ABSENT (기반은 실재)** — `SecurityAudit`(`:44~52`·**`verify()`:55~68`**)이 기반. ★**ESG·연산 전용 감사 체인 신설 금지**(GT② DUP-2) |

★★**`menu_audit_log.hash_chain` 재오염 절대 금지**([[reference_menu_audit_log_not_tamper_evident]]).

---

## 2. §13 Data Security 6종 — ★본 Part 유일의 실질 절

| 항목 | 판정 | 근거 |
|---|---|---|
| Tenant Isolation | **범용 실재 / 연산 스코프 대상 없음** | 전역 확정 자산 |
| RBAC | **범용 실재 / 연산 스코프 대상 없음** | EPIC 06-A. ★신규 API 시 **`/api` 접두 필수**([[reference_api_prefix_routing]]) |
| **Quantum-Safe Cryptography** | ★**"미구현"이 아니라 "외부 표준·인프라 선행 종속"** | ADR D-2 · 아래 §2.1 |
| Compute Data Encryption | **대상 부재** | 연산 데이터 자체가 없음. 범용 암호는 `Crypto`(049) |
| **Secure Key Management** | **ABSENT — 062 확정 상속** | PKI/KMS/HSM 부재. ★**재판정 금지** |
| Audit Logging | **기반 실재**(`SecurityAudit`) | 동상 |

### 2.1 ★PQC 노출면 실측 결론 (과대·과소 주장 동시 금지)

**대칭 자산 — 교체 대상 아님**
`Crypto.php:121` **AES-256-GCM**(+`:113~114` fail-closed) · **`hash_hmac('sha256')` 48개소**.
→ Grover 하에서 유효강도 절반(≈128비트)이나 **여전히 안전 영역**.

**비대칭 자산 5개소 — 전부 외부 종속**
`WebPush.php:620` VAPID **ES256**(Web Push 표준) · `Connectors.php:3817` **RS256**(Google OAuth2 SA JWT) · `DataExport.php:602` RS256 · `EnterpriseAuth.php:536`·`:600` **SAML/SSO 검증측**(IdP 공개키).
→ 상대(브라우저 벤더·Google·IdP)가 PQC 를 지원해야 따라가는 구조 — **선제 교체 불가**.

**최대 노출 = TLS** — nginx 종단, **앱 코드 밖·인프라 계층**(044/045/050 선행 종속).

> ★정직한 표현: **"앱 계층에 선제 교체 대상이 사실상 없고, 노출은 외부 표준과 인프라 TLS 에 있다."**
> "양자내성 암호 도입" 주장 = **거짓** / "양자에 취약" 주장 = **과장**.

**★양자와 무관한 별건(선택 검토)**: `hash_hmac('sha1')` 2 · `hash_hmac('md5')` 1 — 이미 약한 해시. **단 외부 채널 API 스펙 강제일 수 있으므로 용도 확인 선행**(본 Part 범위 밖).

---

## 3. §14 Runtime 7종 · §15 API 8종 · §16 Event 8종

**전량 ABSENT — 사업 범위 밖.**

★§16 오흡수 주의: `ResourceAllocated`/`CapacityExceeded` 는 **WMS bin 용량**(`Wms.php:195` `capacity`)이나 **AI quota 초과**(`ClaudeAI` `ai_usage_quota`·225차 P1-4)와 **다른 개념**이다. 후자는 실재하지만 **연산 자원 이벤트가 아니다**(스코프 분리·둘 다 참).

★§15 신설 시 규율(가정): **`/api` 접두 필수** + **맵 등록만으론 라우트가 살지 않는다(`$register` 필수)** — 289차 후속 `claims/meta` 신설에서 재확인된 정본 패턴.

---

## 4. §17 AI Integration 8종

**전량 ABSENT.**

### ★AI 조항은 현행이 구조적으로 충족 — 단 "대상이 없어서"
명세 §17 "AI 는 승인 없이 Quantum 알고리즘을 운영 환경에 적용하거나 연산 정책을 자동 변경하지 않는다":
ⓐ **Quantum 알고리즘 개념 부재**(적용 대상 없음) ⓑ **연산 정책 부재**(변경 대상 없음) ⓒ 파괴적 액션은 **제안-only + HITL**·기본값 approval(054 D-2).
★**"잘 통제되어서"가 아니라 "대상이 없어서"** — 과대주장 금지.

### ★AI 를 만들더라도 지켜야 할 상속 규율
- **데이터 없이 AI 부터 만들지 말 것**(063 §17 규율 동일) — 8종 전부 연산 계측 데이터 선행
- **V3 신뢰검증 READY 통과 데이터만** · **Explainable 필수**(§17 마지막 항목이 명시)
- **★053 Gateway 부재 상속**: AI 호출이 단일 통과점을 거치지 않는 구조 문제는 본 Part 에도 적용 — 새 경로로 붙이면 **감사 구멍이 하나 더 는다**
- **마케팅 AI(`ClaudeAI`) / dev AI(Claude Code) KEEP_SEPARATE**

---

## 5. §18 성능 요구사항 6종

| 항목 | 판정 |
|---|---|
| Workload Scheduling ≤1초 · Resource Allocation ≤2초 · Cluster Status ≤500ms | ★**"미달"이 아니라 "측정 대상 부재"** |
| **API 응답 ≤300ms · Availability ≥99.99%** | ★**범용 지표는 `SystemMetrics`(057)가 이미 관측 축 보유** — 연산 SLA 는 부재 / 범용 가용성은 057 대상, **스코프 분리·둘 다 참**(ADR D-6) |
| Analytics Dashboard ≤2초 | 대상 부재 |

★계측 신설 시 **057 규율 승계**: `SystemMetrics.php:15~19` **목데이터 금지 원칙** + **산출 불가 시 `null` + 사유**(0 은 "측정했는데 0"으로 오독).

---

## 6. §19 Completion Criteria 10종

**10종 전량 미충족(NOT_CERTIFIED).** 본 세션은 설계 명세이며 코드 변경 0.

> ★**그러나 이 미충족은 "달성해야 할 목표에 못 미친 상태"가 아니다.** ADR D-1 에 따라 **§19 자체를 본 제품의 완료 기준으로 채택하지 않는다.**
> "거의 됐다"류 진척 주장 금지 · 동시에 **"미완성 부채"로 기록하는 것도 금지**(과잉 부채 계상).

---

## 7. ★본 Part 최대 거버넌스 가치 — "만들지 않기로 한 결정을 기록하는 것"

058~063 의 거버넌스 문서는 **어떻게 만들 것인가**를 규정했다. 064 는 다르다:

> **미래에 누군가 이 명세를 근거로 HPC/Quantum 플랫폼 신설을 제안할 때, 이 문서가 "왜 만들지 않기로 했는지"와 "그래도 만든다면 무엇을 재사용해야 하는지"를 답한다.**

재사용 정본(신설 금지): **계측=`SystemMetrics`** · **감사=`SecurityAudit`** · **대시보드=`SystemMonitor`/`DashSystem`** · **스케줄 실행=`Reports`+cron** · **암호=`Crypto`** · **최적화=`Mmm::frontier`/`PriceOpt`**.
