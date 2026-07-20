# DSAR — Integration Plan (Part 3-25 §2·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

---

## 1. 계약 정의 (SPEC §2·§3 — APPROVAL_INTEGRATION_PLAN)

**Integration Plan**은 Platform Registry(§1)에 등재된 통합 대상들을 **어떤 순서·의존성·전제조건·검증 게이트·롤백 경로**로 하나의 플랫폼으로 통합할지 선언하는 거버넌스 계획 엔티티다. Plan은 (a) 대상 Registry Entry 집합과 그 위상정렬(topological order), (b) 각 통합 스텝의 전제조건(precondition)·완료기준(exit criteria), (c) 스텝별 검증 게이트(E2E integration validator 훅), (d) 실패 시 롤백/보상 경로, (e) 승인(maker-checker sign-off) 바인딩을 필수로 보유한다. Plan은 **선언적 계획**이며 실제 순차 활성화·상태추적은 Integration Stage(§3)가 담당한다(관심사 분리).

## 2. 실존 substrate 매핑

| SPEC 요구 | 판정 | 근거(허용목록) |
|---|---|---|
| Integration Plan(통합 오케스트레이터·위상정렬·전제조건 그래프) | **ABSENT(grep 0)** | integration orchestrator 0 handler·0 route·0 table |
| 스텝별 검증 게이트(E2E integration validator) | **ABSENT** | CI 게이트(`deploy.yml:37-75`)=CODE 검증·통합 계획 게이트 아님 |
| 스텝 승인(sign-off) 바인딩 | **PARTIAL(재사용 primitive)** | maker-checker(`Mapping.php:238-291`·`:287`)=정족수/self-approval 차단·release sign-off 아님 |
| 계획 근거/이력 앵커 | **PARTIAL(재사용 primitive)** | append-only 체인(`SecurityAudit.php:25-31`) |
| 전제조건 신호(헬스/환경) | **PARTIAL(재사용 primitive)** | `Health.php:27-45`·`Db.php:56-61` |

## 3. 설계 계약 (규칙)

- R1. Plan은 Registry Entry 집합에 대한 **DAG(비순환 의존성 그래프)**로 정의. 순환/누락 의존성은 Plan 검증 단계에서 Fail-closed.
- R2. 각 스텝은 명시적 precondition·exit criteria를 보유하며, exit criteria 미충족 시 다음 스텝 진입 금지(§3 Stage가 강제).
- R3. Plan 승인은 maker-checker(`Mapping.php:238-291`) 재사용—작성자≠승인자, 정족수 충족, forged-actor 차단(`:287`)을 상속.
- R4. Plan 생성/개정/승인은 근거체인(`SecurityAudit.php:25-31`)에 앵커. Plan은 버전드(immutable revision).
- R5. Plan은 계획일 뿐, 실행은 §3 Stage에 위임(중복 실행엔진 금지·무후퇴).

## 4. KEEP_SEPARATE

- **★커머스 integration**(`ChannelSync.php:11-14`·`Connectors.php:13-15`)=채널 데이터 연동 계획이지 authz 플랫폼 통합 계획 아님. 동음이의—흡수 금지.
- **CODE deploy 파이프라인**(`deploy.ps1:14-34`·`:38`·`deploy.sh:18`·`deploy.yml:37-75`·`:77-159`)=빌드/배포 순서이지 통합 거버넌스 계획 아님.
- **죽은 terraform blue-green**(`infra/aws/terraform/codedeploy_bluegreen.tf`)·마케팅 readiness(`DataPlatform.php:218-309`)·Part3-8(`AccessReview.php:16-17`)·LiveCommerce go-live(`LiveCommerce.php:248-249`)=오판 금지.

## 5. 판정 (NOT_CERTIFIED)

**Integration Plan = ABSENT-greenfield(integration orchestrator grep 0·0 handler·순신설).** 재사용 primitive는 maker-checker 승인(`Mapping.php:238-291`)·근거체인(`SecurityAudit.php:25-31`)·전제조건 신호(`Health.php:27-45`·`Db.php:56-61`)뿐이며, 위상정렬·전제조건 DAG·스텝 exit-criteria 게이트는 순신규다. ★커머스 integration(`ChannelSync.php:11-14`·`Connectors.php:13-15`)과 CODE deploy 파이프라인은 KEEP_SEPARATE—authz 플랫폼 통합 계획으로 흡수 금지. 선행 부재로 **BLOCKED_PREREQUISITE** · 코드 변경 0 · **NOT_CERTIFIED**.
