# ADR — MEA Part 050 Enterprise Business Continuity, Disaster Recovery & Resilience Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★단일호스트 배포 현실·부재증명 완료·오흡수 금지·과대주장 금지·헌법/CHANGE_GATE 우선.

## Context
MEA Part 050은 BC/DR/HA/Backup·Restore/Multi-Region/Failover/Recovery Governance/Disaster Simulation/AI Resilience를 표준화하려 한다. 그러나 GeniegoROI 운영 배포 현실은 **단일호스트 nginx/php-fpm**(운영 roi.geniego.com·데모 roidemo·MySQL+SQLite 폴백)이며, 컨테이너/K8s/멀티리전/클러스터는 운영 부재(MEA Part 044 Container·045 Service Mesh 승계·docker-compose=개발/희망). 따라서 형식 BC/DR/HA 대부분은 인프라 현실상 ABSENT.

## D-1 형식 BC/DR/HA Platform은 순신설(현재 단일호스트 degraded-mode seed만 실재)
**결정**: Business Continuity Platform·DR Platform·Multi-Region Replication Engine·Failover Management Engine·Active-Active/Standby Cluster·Recovery Site·AZ·RPO/RTO objective·DR Test는 **부재**(부재증명 완료). 실재=`Db` SQLite 폴백(degraded-mode 지속·Db.php:136~149)·`Health`(헬스체크)·dist.bak(배포 롤백)·데모-운영 2환경. ★이들을 형식 HA/DR로 과대주장 금지·순신설 대상이나 인프라 선행(멀티노드/리전) 종속.

## D-2 SQLite 폴백 ≠ HA Cluster/Failover (★오흡수 금지)
**결정**: `Db.php`의 MySQL 연결 실패→SQLite 폴백은 **degraded-mode 지속 seed**(단일 프로세스 내 대체 저장소)이지 Active-Active/Standby Cluster·Automatic Failover·Load Balancing 아님. 데이터 정합/복제 없음(별도 SQLite 파일). ★HA/Failover로 흡수 금지.

## D-3 dist.bak·nginx reload·데모-운영 2환경 ≠ 형식 Backup/Failover/Multi-Region (★오흡수 금지)
**결정**: dist.bak(프론트 배포 롤백 아티팩트)≠형식 Backup Job/PITR/Snapshot·nginx -s reload(무중단 리로드)≠Automated Failover·데모-운영 2환경(격리 배포)≠Multi-Region Recovery Site/Cross Region Replication. media_gc_cron(미디어 GC retention)≠Backup Retention Policy. ★전부 seed·형식 엔진 아님·과대주장 금지.

## D-4 db_restore 무인증 제거(279차)·DbAdmin SQL 가드=보안 seed (재감사 금지)
**결정**: 279차에 무인증 db_restore 라우트 제거(routes.php grep 0 확인)·`DbAdmin`은 SQL 파괴구문(DROP DATABASE/SHUTDOWN/INTO OUTFILE) 차단(:204). 이는 복구/백업 안전 seed이나 형식 Secure Restore/Recovery Verification 엔진 아님. ★279차 보안 결정 재감사 금지([[project_n279_full_audit]]).

## D-5 AI Resilience Advisor는 승인 없는 자동 재해복구/환경 전환 불가 (헌법 V5+CHANGE_GATE)
**결정**: AI 장애 예측/복구 시나리오 추천/백업 최적화는 인사이트-only. ★AI가 운영자 승인 없이 Failover/Failback/환경 전환/DR 실행 불가=헌법 V5(안전 자동화)+`CHANGE_GATE`+배포 사전승인([[feedback_deploy_approval_mandatory]]). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. 실재 예측 seed=`AnomalyDetection`(이상)·`ModelMonitor`(drift)·`Health`.

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★형식 BC/DR/HA/Multi-Region은 인프라(멀티노드/리전/K8s) 선행 종속·현재 단일호스트라 degraded-mode seed만 실재.
- ★중복 금지: `Db` 폴백·`Health`·dist.bak·`DbAdmin`·`SecurityAudit` 재사용(중복 백업/헬스/복구 엔진 신설 금지).
- Part 044/045(단일호스트·K8s 부재) 상속·재감사 금지. Part 048/049 보안 상속.
