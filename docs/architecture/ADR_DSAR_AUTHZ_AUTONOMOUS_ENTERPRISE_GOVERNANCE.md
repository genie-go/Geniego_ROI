# ADR — Enterprise Authorization Autonomous Enterprise Governance Platform (Part 3-40)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_40_AUTONOMOUS_ENTERPRISE_GOVERNANCE_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAAEGP_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAAEGP_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-40은 사람 정책+AI 의사결정+자동 제어를 결합한 Autonomous Control Plane을 규정한다. ★특이점: 현행 "자율"은 마케팅 자동화이며 authz 자율은 부재·고위험. 본 ADR이 안전 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (★Human Oversight 절대 전제·무인 authz 자율 금지)**: authz 정책 자동 변경/집행은 반드시 Human Oversight·PAUSED-by-default·Explainable·pending_approval을 전제로만 설계. 무인 authz 자율은 데이터/마케팅 헌법 안전원칙(검증데이터+승인정책+로그+롤백)과 충돌 → 설계에서도 자동집행 기본 OFF.
- **D-2 (형식 authz Autonomous Control Plane 순신설)**: Autonomous Policy/Decision Engine(authz)·Predictive Risk(거버넌스)·Executive Override·Continuous Validation은 신설(grep 0).
- **D-3 (마케팅 자율 substrate 재사용·오흡수 금지)**: Rule Engine 패턴=`RuleEngine.php`(★마케팅·authz 아님)·AI 의사결정=`AutoRecommend`/`Decisioning`·Predictive=`AnomalyDetection`·self-heal=`ensureTables`/consolidateOrphanStock. **마케팅 자동화를 authz 자율로 재사용 금지**(도메인·리스크 상이).
- **D-4 (Alerting executeAction 정직)**: `Alerting::executeAction`은 287/288차 action_request 생산자 부재로 **부분 정직-pending**(가짜집행 회피). Autonomous Action 실집행은 생산자 배선+안전게이트 후에만.
- **D-5 (Immutable/Safety Rule)**: 결정/AI trace/override 이력=append-only `SecurityAudit::verify`. 안전Rule(마케팅 헌법 V5: 신뢰도/권한/동기화/통계신뢰 부족→자동집행 금지·경고) 반영. Runtime Guard=AI Confidence Threshold·Cross-Tenant 차단은 `index.php` RBAC·`Db.php` 격리 위 배치.

## KEEP_SEPARATE (오흡수·안전 최대 위험)
- 마케팅 자동화(RuleEngine/AutoCampaign/Decisioning/AutoRecommend) ≠ authz Autonomous Governance(오흡수 시 인가 무인집행 위험).
- ModelMonitor(ML drift) ≠ Autonomous Drift · WMS/스키마 self-heal ≠ authz Self-Healing.

## 결과 (Consequences)
- 판정 = PARTIAL(RuleEngine·AutoRecommend·Decisioning·AnomalyDetection·self-heal·SecurityAudit substrate·★마케팅 도메인) / ABSENT-formal(authz Autonomous Control Plane/Policy Engine/Predictive Risk/Executive Override 순신설) + ★안전상 무인 authz 자율 미허용.
- 실행 순서: 선행 Part 인증 → Autonomous Registry(Human Oversight 게이트) 신설 → 안전게이트+Explainable+PAUSED 배선 → Predictive Risk/Optimization(권고만·집행은 승인). 코드 0.
