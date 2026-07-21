# MEA Part 012 — Index (Enterprise Data Platform Operations & Governance Architecture)

> **거버넌스 상태**: 설계 명세 인덱스(★Data Platform 캡스톤·Part 001~012 완성) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 012 (Data Platform Operations & Governance) 산출 문서 색인. ★MEA Part 001~011 운영·거버넌스 통합(재정의 금지)·Data Platform 기준 아키텍처 완성.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART012_DATA_PLATFORM_OPERATIONS_GOVERNANCE_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18·캡스톤) |
| `docs/architecture/ADR_MEA_DATA_PLATFORM_OPERATIONS_GOVERNANCE_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~011 상속·CHANGE_GATE/안전배포 승격) |
| `docs/data/MEA_PART012_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART012_DUPLICATE_AUDIT.md` | GT② CHANGE_GATE/registry/Alerting·Part 001~011 중복 경계 |
| `docs/data/MEA_PART012_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 운영/변경/거버넌스 판정 |
| `docs/data/MEA_PART012_GOVERNANCE_MECHANISMS.md` | §9~18 Change/Incident/Capacity/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART012_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(운영/변경/거버넌스 프로세스 실재):** ★Change Management 프로세스=`CHANGE_GATE.md`(변경 게이트·재구현금지·무후퇴)+배포 승인 필수+**안전배포 패턴**(out-of-band SHA→backup `.bak`→pscp→chown→post-deploy SHA byte-match→fpm reload→health 200→fatal scan·본 세션 전 배포에 사용) · Operational/Data Governance=`CONSTITUTION.md`+데이터 헌법 6볼륨+`docs/registry/`(ChangeHistory/DecisionLog/AuditHistory) · Incident=`Alerting.php`/`AnomalyDetection.php`/`docs/BUGS_TRACKING.md`/`PM_CURRENT_STATUS.md` · Capacity=php-fpm pool 튜닝(max_children·별도 pool) · SLA/Monitoring=health check/`Alerting` · 무중단 배포=dist swap+fpm reload · Security=MFA(`UserAuth`)/RBAC/`Crypto`/writeGuard · Audit=`SecurityAudit` · Continuous Improvement=`NEXT_SESSION.md`/`COMPETITIVE_SCORE_HISTORY.md`.
- **ABSENT-formal(형식 ITIL 운영 도구 greenfield):** Data Operations Center(형식) · Governance Center(형식) · **SLA Manager** · **Capacity Manager**(예측) · **Change Manager**(형식 ITIL) · **Incident/Problem Manager** · Performance Manager · Operational Dashboard · Continuous Improvement Manager · Maintenance Window · Event 표준(OperationStarted 등).
- **★핵심:** 운영/변경/거버넌스 **프로세스**는 실 강함 — 특히 §9 Change Management(요청→영향도→승인→테스트→배포→검증→모니터링→종료)가 **이번 세션 내내 사용한 실제 워크플로우**(CHANGE_GATE + 배포 승인 + 안전배포 패턴)와 정확히 대응. 형식 ITIL 도구(Ops Center/SLA/Incident Manager)만 부재.
- **★재사용(중복 신설 절대 금지):** `CHANGE_GATE`+안전배포(변경관리)·`CONSTITUTION`/registry(거버넌스)·`Alerting`/`AnomalyDetection`(Incident)·php-fpm 튜닝(Capacity)·`SecurityAudit`(Audit)·MFA/RBAC/Crypto/writeGuard(Security). Part 001~011·헌법·CONSTITUTION·CHANGE_GATE 재정의 금지. AI=운영 정책 직접변경/승인 불가(V3+배포 승인)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[feedback_deploy_approval_mandatory]](배포 승인=Change Management 핵심) · [[reference_phpfpm_pool_tuning_502]](php-fpm=Capacity·502 오진 정정) · [[reference_audit_false_positives]](오탐 레지스트리=Incident Root Cause) · [[reference_menu_audit_log_not_tamper_evident]](Operation Audit 정본=SecurityAudit::verify) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Operation Leakage).
- **★Data Platform 캡스톤: MEA Part 001~012로 Enterprise Data Platform 기준 아키텍처 완성**(설계 명세·코드 0·형식 엔진 구현은 후속·기존 substrate 재사용 원칙).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~011 + 형식 ITIL 운영 도구 신설).

## 다음
MEA Part 013 — ROI Intelligence Platform Foundation(Data Platform 상속·확장·중복 정의 금지).
