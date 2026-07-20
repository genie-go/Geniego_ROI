# DSAR — Cutover Plan & Rollout Governance (Part 3-25 §2·§13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §2·§13 Cutover Manager)
Cutover Plan Governance는 운영 전환(cutover)의 **전략 선택·승인·실행 순서·롤백 기준**을 단일 권위로 관리한다. 지원 전략: **Big Bang**(일괄 전환), **Phased**(단계 전환), **Parallel Run**(신·구 병행 운영), **Pilot**(제한 파일럿), **Regional Rollout**(지역 점진 전개). 각 전략은 진입 게이트(사전 인증·baseline 일치·릴리스 패키지 유효)와 롤백 트리거(건강도 임계·오류율)를 필수로 하며, 전환 단계 전이는 maker-checker 승인과 감사 앵커링을 요구한다.

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 전환 단계 승인 골격 | maker-checker 승인 큐 `Mapping.php:238-291`(특히 `:287`) | 재사용 substrate |
| 전환 후 건강도 판정(롤백 트리거 입력) | 헬스 판정 `Health.php:56-70` | 재사용 (관측 신호) |
| 마이그레이션 실행 순서(전환 시퀀스 입력) | `migrate.php:34-38`·`migrate.php:94-133` | 재사용 (스키마 전환 단계) |
| 규정/컴플라이언스 전환 게이트 | `Compliance.php:50-128`·`Compliance.php:120-124` | 재사용 (전환 규정 게이트) |
| Cutover 전략·계획 엔진 | grep 0 | **ABSENT — 순신설** |

## 3. 설계 계약
- **CutoverPlan 엔티티**: `{strategy(BigBang|Phased|ParallelRun|Pilot|RegionalRollout), entry_gates[], phases[], rollback_triggers[], approvals[]}` — 순신설. 진입 게이트는 Production Certificate 유효·Deployment Baseline 일치·Release Package 유효를 선결로 요구(BLOCKED_PREREQUISITE 사슬).
- **단계 전이 승인**: 각 phase 전이는 기존 `Mapping.php:238-291`(`Mapping.php:287`) maker-checker를 **재사용**해 승인 강제(별도 승인엔진 신설 금지).
- **롤백 트리거**: 전환 후 `Health.php:56-70` 건강도 신호를 임계 기준으로 관측하여 자동 롤백 판정 입력으로 사용. 스키마 전환 순서는 `migrate.php:34-38`·`migrate.php:94-133`를 전환 시퀀스의 관측 단계로 참조.
- **컴플라이언스 게이트**: 전환은 `Compliance.php:50-128`(특히 `Compliance.php:120-124`) 규정 게이트 통과를 필수 진입 조건으로 결합.
- 모든 전략 선택·단계 전이·롤백 이벤트는 append-only 감사에 앵커링.

## 4. KEEP_SEPARATE
- **★죽은 terraform blue-green/canary**(`infra/aws/terraform/codedeploy_bluegreen.tf`·`infra/aws/terraform/autoscaling.tf`) — 미배선 IaC 잔재. **Release Governance/Canary/Cutover PRESENT로 절대 인정 금지**. Cutover 거버넌스의 근거·구현으로 인용 불가(ground-truth 봉인).
- **LiveCommerce go-live**(`LiveCommerce.php:248-249`) — 라이브커머스 방송 개시 도메인. 릴리스 cutover와 주체·의미 상이 → 흡수 금지.

## 5. 판정
**ABSENT — greenfield (cutover grep 0).** Big Bang/Phased/Parallel Run/Pilot/Regional Rollout 전략 엔진·진입 게이트·롤백 트리거 계획 계층 일체 부재. 승인은 `Mapping.php:238-291`(`:287`)·건강도는 `Health.php:56-70`·전환 시퀀스는 `migrate.php:34-38`·`migrate.php:94-133`·규정은 `Compliance.php:50-128`(`:120-124`)로 **재사용**하되 Cutover 계획 엔진은 **순신설**. 죽은 terraform blue-green(`codedeploy_bluegreen.tf`)·`autoscaling.tf`는 PRESENT 금지, LiveCommerce go-live는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED.
