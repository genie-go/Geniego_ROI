# DSAR — Operational Readiness Manager (Part 3-25 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

---

## 1. 계약 정의 (SPEC §5 — APPROVAL_OPERATIONAL_READINESS)

**Operational Readiness Manager**는 플랫폼이 운영 전환(go-live) 전 **운영에 필요한 준비 축이 모두 충족되었는지**를 평가·게이트하는 거버넌스 엔티티다. 준비 축은 (a) Monitoring(관측성·헬스/메트릭 수집), (b) Logging(감사/운영 로그), (c) Backup, (d) Recovery(복구 절차·리허설), (e) 운영 문서/Runbook, (f) 인력(온콜·역할) 준비다. Manager는 각 축을 READY/WARNING/BLOCKED로 스코어링하고, BLOCKED 축이 하나라도 있으면 운영 준비 게이트를 통과시키지 않는다(Fail-closed). 결과는 근거체인에 앵커되어 운영 사인오프의 증거가 된다.

## 2. 실존 substrate 매핑 (PARTIAL — baseline 존재)

| 준비 축 | 판정 | 근거(허용목록) |
|---|---|---|
| Monitoring(헬스/메트릭) | **PARTIAL(baseline)** | check ok/degraded·HTTP 200/503(`Health.php:27-45`·`:41-42`)·dbProbe(`Health.php:99-110`)·8 probe(`SystemMetrics.php:60-83`·`:127-351`·`:278`·`:323-351`) |
| Logging(감사) | **PARTIAL(재사용 primitive)** | append-only 해시체인(`SecurityAudit.php:8`·`:25-31`·`:35-45`·`:47-52`·`:60-64`) |
| 환경/config 준비 | **PARTIAL(재사용 primitive)** | env 해석(`Db.php:43-48`·`:93-110`)·config 미러(`AdminPlans.php:53-71`·`:157`·`:180`) |
| 운영 사인오프 | **PARTIAL(재사용 primitive)** | maker-checker(`Mapping.php:238-291`·`:287`) |
| Compliance readiness posture | **PARTIAL(재사용 primitive)** | control readiness(`Compliance.php:50-128`·`:120-124`) |
| Backup / Recovery / Runbook / 인력 준비 | **ABSENT** | readiness gate·RUNBOOK 순신규·복구 리허설/온콜 원장 없음 |

## 3. 설계 계약 (규칙)

- R1. Manager는 6개 준비 축을 각각 READY/WARNING/BLOCKED로 평가. BLOCKED 하나라도 있으면 전체 게이트 BLOCKED(Fail-closed·부분충족 통과 금지).
- R2. Monitoring 축은 health/metrics probe(`Health.php:27-45`·`SystemMetrics.php:60-83`)를 **읽기 신호**로 소비—Manager가 probe를 재구현하지 않는다(SSOT·중복엔진 금지).
- R3. Logging 축은 append-only 근거체인(`SecurityAudit.php:25-31`)의 verify() 통과를 조건으로 READY 판정. 평가 결과 자체도 체인에 앵커.
- R4. Backup/Recovery/Runbook/인력 준비 게이트와 RUNBOOK 산출물은 순신규—리허설 완료·문서 존재를 evidence로 요구.
- R5. 운영 준비 사인오프는 maker-checker(`Mapping.php:238-291`) 재사용—작성자≠승인자·정족수 상속.

## 4. KEEP_SEPARATE

- **★마케팅 readiness**(`DataPlatform.php:218-309`·`:281`)=DataTrust readiness/trust 스코어이지 운영 준비 게이트 아님. 동음이의—흡수 금지.
- **Compliance readiness**(`Compliance.php:50-128`)=SOC2/ISO control readiness(실 인증은 외부 감사)이지 production go-live 게이트 아님. 재사용은 하되 대체 금지.
- **커머스 integration**(`ChannelSync.php:11-14`·`Connectors.php:13-15`)·Part3-8 role cert(`AccessReview.php:16-17`)·LiveCommerce go-live(`LiveCommerce.php:248-249`)·죽은 terraform(`infra/aws/terraform/codedeploy_bluegreen.tf`)=오판 금지.

## 5. 판정 (NOT_CERTIFIED)

**Operational Readiness Manager = PARTIAL(baseline 존재).** Monitoring baseline(`Health.php:27-45`·`SystemMetrics.php:60-83`)·Logging(`SecurityAudit.php:25-31`)·env/config(`Db.php:43-48`·`AdminPlans.php:53-71`)·사인오프(`Mapping.php:238-291`)·compliance posture(`Compliance.php:50-128`)는 재사용 가능한 준비 신호이나, **6축 READY/WARNING/BLOCKED 스코어링 게이트·Backup/Recovery 리허설 원장·RUNBOOK·온콜 인력 준비**는 순신규다. ★마케팅 readiness(`DataPlatform.php:218-309`)는 KEEP_SEPARATE—운영 준비로 흡수 금지. 선행(§1~§3 통합 거버넌스) 부재로 **BLOCKED_PREREQUISITE** · 코드 변경 0 · **NOT_CERTIFIED**.
