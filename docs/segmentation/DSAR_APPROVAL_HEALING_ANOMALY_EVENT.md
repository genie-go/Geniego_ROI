# DSAR — Authorization Anomaly Event (Part 3-20 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_ANOMALY_EVENT

권한 거버넌스에서 **자기치유(self-healing)의 최초 트리거**가 되는 정규 이벤트. 인가 상태가
정상 baseline에서 이탈하는 순간을 포착해 후속 Remediation Plan(§7)·Recovery Workflow(§15)로
전달한다. Part 3-20 §6는 다음 7종 anomaly 클래스를 규정한다.

| # | Anomaly Class | 이탈 신호(정의) |
|---|---------------|-----------------|
| A1 | 비정상 권한 증가 | 단일 principal의 effective permission이 baseline 대비 급증(privilege creep 급변) |
| A2 | 정책 변경 이상 | policy/role 정의 변경이 승인·감사 경로 밖에서 발생 |
| A3 | 승인 실패 이상 | maker-checker 승인 실패율/거부율이 통제 한계 이탈 |
| A4 | Session 증가 이상 | 동일 principal 활성 session 수 baseline 급증 |
| A5 | Runtime Decision 이상 | 인가 결정(allow/deny) 분포가 통제 baseline 이탈 |
| A6 | AI Recommendation 이상 | 권한 관련 AI 추천의 신뢰/근거 지표가 임계 이탈 |
| A7 | Cross-Tenant 접근 시도 | tenant 격리 경계를 넘는 인가 요청 탐지 |

APPROVAL_ANOMALY_EVENT는 **불변(append-only) 사실 레코드**이며 그 자체로 조치를 수행하지 않는다
(조치는 §7·§15의 별도 계약). Detection→Event 발행까지가 본 §6의 책임 경계다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| authz anomaly event 스키마 | (없음) | ABSENT — grep 0 |
| baseline 이탈 탐지 | AccessReview 주기 탐지(`AccessReview.php:87`) | PARTIAL(정기 스냅샷 탐지, event 발행 아님) |
| 이벤트 append-only 저장 | SecurityAudit append-only 해시체인(`SecurityAudit.php:14-68`) | 재사용 후보(현재 authz anomaly 미기록) |
| Cross-Tenant 경계 | 요청 tenant 해석 substrate 존재 | 별도(anomaly event화 안 됨) |

## 3. 설계 계약

- **순신설**: authz anomaly event 도메인은 grep 0으로 전무하다. AnomalyDetection/ClaudeAI 계열을
  확장하지 않고 신규 정규 이벤트 타입으로 도입한다(KEEP_SEPARATE 준수).
- **불변성**: 발행 이벤트는 `SecurityAudit.php:56-68` append-only 해시체인 계약을 재사용해 tamper-evident로
  기록한다. baseline·임계·근거는 이벤트 payload에 명시(Explainable).
- **탐지≠조치**: §6는 이벤트 발행에서 멈춘다. Remediation(§7)·Recovery(§15)로 넘길 뿐 자동 삭제/변경 없음.
- **Fail-closed Cross-Tenant**: A7은 tenant 경계 위반을 Unknown이 아닌 위반으로 취급.

## 4. KEEP_SEPARATE

- `AnomalyDetection.php:3`·`:49` — 마케팅 SPC(통계공정관리) anomaly. authz와 도메인 상이. 흡수 금지.
- `ClaudeAI.php:3692`·`:3737`·`:3753` — anomaly_hint AI 힌트(마케팅/모델). 인가 anomaly 아님.
- `ModelMonitor.php:221`·`:244` — ML drift 모니터. drift≠authz anomaly.

## 5. 판정

**ABSENT** (authz anomaly grep 0). 최근접은 AccessReview 정기 탐지(`AccessReview.php:87`)뿐이며
event 발행·baseline 계약·Cross-Tenant anomaly 정규화는 부재. 순신설. 코드 변경 0 · NOT_CERTIFIED ·
BLOCKED_PREREQUISITE(§7·§15 선행 계약과 substrate 신설 필요).
