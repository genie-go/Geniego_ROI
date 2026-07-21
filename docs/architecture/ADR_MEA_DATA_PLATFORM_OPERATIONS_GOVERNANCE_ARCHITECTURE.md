# ADR — MEA Part 012 Enterprise Data Platform Operations & Governance Architecture

> **거버넌스 상태**: 아키텍처 결정 기록(★Data Platform 캡스톤) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part012 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 012는 Data Platform 전체 운영·거버넌스(Part 001~012 캡스톤). GeniegoROI는 운영/변경/거버넌스 **프로세스**가 실 강하다 — `CHANGE_GATE`(변경 게이트)+배포 승인+★안전배포 패턴(out-of-band SHA→backup .bak→pscp→chown→post-deploy SHA byte-match→fpm reload→health→fatal scan·본 세션 전 배포에 사용)+`docs/registry`(ChangeHistory/DecisionLog/AuditHistory)+`Alerting`/`AnomalyDetection`(Incident)+php-fpm pool 튜닝(Capacity)+`SecurityAudit`(Audit). 단 형식 ITIL Ops Center/SLA/Incident/Capacity Manager는 부재. 본 Part는 Part 001~011 상속(재정의 금지).

## 결정
- **D-1 (Part 001~011·헌법 상속·재정의 금지):** Part 001~011 각 도메인 운영 정책을 통합·인용. 운영 대상(§6)=Part 002~011. 거버넌스=`CONSTITUTION`/`CHANGE_GATE`(Part 3-53/3-58). 중복 정의 금지.
- **D-2 (Change Management = CHANGE_GATE + 안전배포 패턴 승격):** 변경 요청→영향도→승인→테스트→배포→검증→모니터링→종료(§9) = `CHANGE_GATE`(영향도/재구현금지/무후퇴)+배포 승인 필수([[feedback_deploy_approval_mandatory]])+안전배포(php -l 테스트·post-deploy SHA byte-match 검증·health/fatal 모니터·`.bak` 롤백)+git+`SecurityAudit`+`ChangeHistory.md`. 형식 Change Manager는 이 프로세스를 도구화(중복 변경관리 신설 금지).
- **D-3 (Governance = CONSTITUTION/registry 재사용):** Operational/Data Governance=`CONSTITUTION`+데이터 헌법 6볼륨+`CHANGE_GATE`+`docs/registry`(ChangeHistory/DecisionLog/AuditHistory). 중복 거버넌스 문서 신설 금지(Part 3-49/3-57 정합).
- **D-4 (Incident/Capacity/SLA = 기존 자산 승격·형식 신설):** Incident=`Alerting`/`AnomalyDetection`+`BUGS_TRACKING.md`/`PM_CURRENT_STATUS.md`+감사 오탐 레지스트리([[reference_audit_false_positives]]). Capacity=php-fpm pool 튜닝(max_children·별도 pool·[[reference_phpfpm_pool_tuning_502]]). SLA/Monitoring=health check+`Alerting`. 형식 SLA/Capacity/Incident Manager=순신설(중복 알림/감사 로직 금지).
- **D-5 (Security/AI = Part 001~011·헌법 정합):** MFA=`UserAuth`(OTP·289차후속 fail-closed 수정)·RBAC/writeGuard=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]). AI(장애/Capacity 예측·Root Cause)=`AnomalyDetection`·운영 정책 직접변경/승인 불가=헌법 V3+배포 승인. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·★Data Platform 캡스톤(Part 001~012 완성)**. Part 001~011/헌법 상속·재정의 금지·CHANGE_GATE/안전배포/registry/Alerting/AnomalyDetection/php-fpm 튜닝/SecurityAudit 재사용(중복 변경관리/거버넌스/알림/감사 신설 금지)·형식 ITIL Ops Center/SLA/Incident/Capacity Manager만 신설. 실행은 선행 Part 001~011 종속.
