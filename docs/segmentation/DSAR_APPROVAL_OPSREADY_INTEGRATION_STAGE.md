# DSAR — Integration Stage (Ordered Activation / State Tracking) (Part 3-25 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

---

## 1. 계약 정의 (SPEC §2·§3 — APPROVAL_INTEGRATION_STAGE)

**Integration Stage**는 Integration Plan(§2)이 정의한 DAG를 **실제로 순차 활성화(Ordered Activation)하고 각 스텝의 진행 상태를 추적(State Tracking)**하는 실행 거버넌스 엔티티다. Stage는 (a) Plan revision 참조(불변 바인딩), (b) 현재 활성 스텝 포인터와 스텝별 상태(PENDING→ACTIVATING→ACTIVE→VERIFIED / FAILED→ROLLED_BACK), (c) 전제조건 재평가(활성화 직전 헬스/환경 게이트), (d) 스텝 완료 시 exit-criteria 검증, (e) 실패 시 Plan의 롤백 경로 실행과 상태 원장 기록을 필수로 보유한다. Stage는 **하나의 활성 스텝만** 전진시키며(직렬 활성화·동시전진 금지), 각 전이를 tamper-evident로 남긴다.

## 2. 실존 substrate 매핑

| SPEC 요구 | 판정 | 근거(허용목록) |
|---|---|---|
| Integration Stage(순차 활성화·상태 머신) | **ABSENT** | integration state tracking 없음·0 handler/route/table |
| 스텝 상태 추적(PENDING→VERIFIED→ROLLED_BACK) | **ABSENT** | 통합 상태 원장 부재 |
| 활성화 직전 전제조건 재평가 | **PARTIAL(재사용 primitive)** | health check(`Health.php:56-70`·`:72-97`·`SystemMetrics.php:60-83`)·env 가드(`Db.php:71-87`·`:81-84`) |
| 순차 활성화 스텝(형태 유사·CODE) | **KEEP_SEPARATE** | CI 순차 단계(`deploy.yml:37-75`·`:77-159`)=CODE 단계·거버넌스 아님 |
| 전이 근거/상태 앵커 | **PARTIAL(재사용 primitive)** | `SecurityAudit.php:25-31`·`:60-64` |

## 3. 설계 계약 (규칙)

- R1. Stage는 Plan revision에 **불변 바인딩**. Plan 변경 시 새 Stage 인스턴스(진행 중 Stage에 Plan 교체 금지·무후퇴).
- R2. 활성화는 **직렬**: 동시에 하나의 스텝만 ACTIVATING/ACTIVE. 동시전진·건너뛰기 금지(Plan DAG 순서 강제).
- R3. 각 스텝 활성화 직전 전제조건 재평가(`Health.php:56-70`·`Db.php:71-87`)—실패 시 ACTIVATING 진입 거부(Fail-closed).
- R4. exit-criteria 미충족/스텝 FAILED 시 Plan 정의 롤백 경로 실행 후 ROLLED_BACK 기록. 상태 전이 전량 근거체인 앵커(`SecurityAudit.php:25-31`).
- R5. Stage 상태는 SSOT—헬스/CI 신호를 참조하되 그 원천을 복제하지 않는다(중복엔진 금지).

## 4. KEEP_SEPARATE

- **★CI/CODE deploy 순차 단계**(`deploy.yml:37-75`·`:77-159`·`:126-144`·`deploy.ps1:14-34`·`deploy.sh:18`)=빌드→SCP→reload→health check의 CODE 활성화 순서이지 authz 통합 상태 거버넌스 아님. 형태가 유사해도 오판 금지.
- **죽은 terraform blue-green**(`infra/aws/terraform/codedeploy_bluegreen.tf`)=단계적 트래픽 전환 IaC 스캐폴딩·라이브 무연결. Stage PRESENT 근거 금지.
- **커머스 integration**(`ChannelSync.php:11-14`·`Connectors.php:13-15`)·마케팅 readiness(`DataPlatform.php:218-309`)·Part3-8(`AccessReview.php:16-17`)·LiveCommerce go-live(`LiveCommerce.php:248-249`)=동음이의.

## 5. 판정 (NOT_CERTIFIED)

**Integration Stage = ABSENT-greenfield(integration state tracking 없음·순신설·0 handler/route/table).** deploy CI 단계(`deploy.yml:37-75`)는 **CODE 활성화 순서**이지 거버넌스 상태 머신이 아니며 KEEP_SEPARATE. 재사용 primitive는 전제조건 재평가용 health/env 신호(`Health.php:56-70`·`Db.php:71-87`)와 상태 앵커(`SecurityAudit.php:25-31`)뿐이고, 직렬 순차 활성화·스텝 상태 머신·롤백 경로 실행은 순신규다. 선행(Plan §2·Registry §1) 부재로 **BLOCKED_PREREQUISITE** · 코드 변경 0 · **NOT_CERTIFIED**.
