# DSAR — Release Governance Engine (Part 3-25 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §10)
Release Governance Engine은 검증된 아티팩트(§9)를 운영으로 **승격시키는 릴리스 절차·전략**을 통제하는 설계 계약이다. 정의 요소: **Release Candidate**(후보 지정·불변 라벨), **Approval**(릴리스 승인 게이트), **Canary**(점진 트래픽 노출), **Blue-Green**(무중단 전환), **Rolling**(순차 롤아웃), **Emergency Release**(긴급 우회 경로+사후 승인). 각 전략은 진행/중단/롤백 트리거와 승인 정족수를 계약으로 명시하며, 배포 실행은 코드 배포 substrate에 위임하되 **거버넌스 결정 계층은 순신설**이다.

## 2. Substrate 매핑
| SPEC 요소 | 현행 substrate | 상태 | 근거 |
|---|---|---|---|
| 코드 배포 실행 | CI가 원격 docroot로 코드 배포 | PRESENT(실행만) | `deploy.yml:77-159` |
| 배포 트리거/게이팅 스텝 | CI 배포 게이트 스텝 | PARTIAL | `deploy.yml:126-144`·`:146-159` |
| Approval 게이트 | maker-checker 승인 | PARTIAL(도메인 승인) | `Mapping.php:238-291`·`:287` |
| Release Candidate/불변라벨 | — | ABSENT(grep 0) | 순신설 |
| Canary/Blue-Green/Rolling 엔진 | — | ABSENT(grep 0) | 순신설 |
| Emergency Release 경로 | — | ABSENT(grep 0) | 순신설 |

## 3. 설계 계약
- **Approval**: 릴리스 승인 게이트는 현행 maker-checker(`Mapping.php:238-291`, 결정 커밋 `:287`) 승인 패턴을 **substrate로 재사용**하도록 계약한다. 단 현행은 매핑 도메인 승인이며 릴리스 승격 승인으로의 확장은 순신설 배선을 요한다.
- **배포 실행 위임**: Release Governance의 실제 롤아웃은 코드 배포 CI(`deploy.yml:77-159`·`:126-144`·`:146-159`)에 위임하되, 이는 **단일 코드 배포(all-at-once)**일 뿐 Canary/Blue-Green/Rolling 전략을 구현하지 않는다.
- **Canary/Blue-Green/Rolling/Emergency**: 릴리스 거버넌스 엔진은 **grep 0(전무)**. 릴리스 후보 지정·전략 선택·점진 노출·긴급 우회 전부 순신설 설계 명세로만 존재. 코드 변경 0.

## 4. KEEP_SEPARATE
- ★**죽은 terraform blue-green/canary**(`infra/aws/terraform/codedeploy_bluegreen.tf`·`infra/aws/terraform/autoscaling.tf`)는 미배선 IaC 잔재이며 운영 릴리스 경로가 아니다. 이를 근거로 Release Governance/Canary/Blue-Green을 **PRESENT로 판정 금지**. KEEP_SEPARATE.
- maker-checker(`Mapping.php:238-291`)는 **도메인 매핑 승인**이지 릴리스 승격 승인 엔진이 아니다. 재사용 대상일 뿐 동일시 금지.

## 5. 판정
**ABSENT**. Release Governance 엔진(Release Candidate·Canary·Blue-Green·Rolling·Emergency) grep 0. 현행은 단일 코드 배포 실행(`deploy.yml:77-159`·`:126-144`·`:146-159`)과 도메인 maker-checker 승인(`Mapping.php:238-291`·`:287`)뿐이다. 죽은 terraform(`codedeploy_bluegreen.tf`·`autoscaling.tf`)은 PRESENT 근거 불가(KEEP_SEPARATE). 순신설 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
