# DSAR — Authorization Universal Governance Mesh Warning Contract (Part 3-24 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Warning Contract(§28)는 메시가 **아직 실패는 아니나 열화(degrading) 추세**인 상태를 조기 신호로 방출하는 비차단(non-blocking) 계약이다. 5종: Region Health Degrading(리전 상태 열화), Synchronization Delay(동기화 지연), Trust Chain Weakening(신뢰체인 약화), Consensus Timeout(합의 타임아웃 임박), Mesh Topology Drift(위상 드리프트). 경고는 인가 결정을 차단하지 않되(에러와 대비) 관측·알림 경로로 흘러 운영자가 사전 개입하게 한다. 경고 또한 tenant scope 격리, 임계값은 정책으로 설정된다.

## 2. Substrate 매핑

| 경고 | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| Region Health Degrading | 시스템 헬스/메트릭 수집 | `SystemMetrics.php:32` | Health baseline·mesh미인지 |
| Region Health Degrading | 헬스 체크 엔드포인트 | `Health.php:27` | baseline·리전미인지 |
| Trust Chain Weakening | 감사 verify 신뢰체인 | `SecurityAudit.php:63-64` | 인접·약화신호부재 |
| Consensus Timeout | 승인 큐 게이트(대기 상태원) | `Mapping.php:287` | 근접·타임아웃신호부재 |
| Sync Delay / Topology Drift | (해당 substrate 없음) | — | ABSENT-greenfield |

Mesh Warning 자체(열화 추세 탐지·임계·드리프트 계산·경고 방출)는 grep 0 — 코드 전무.

## 3. 설계 계약

- **경고 표면**: 메시 관측 경로가 방출하는 비차단 경고 봉투(종류·심각도·추세지표·tenant). 기존 헬스 메트릭(`SystemMetrics.php:32`)·헬스 엔드포인트(`Health.php:27`)를 baseline 신호원으로 확장(대체 아님). 신규 실배선은 `/api` 접두·`$register` 배선.
- **비차단 의미론**: 경고는 인가를 막지 않는다(Error Contract와 명확히 분리). Region Health Degrading은 `SystemMetrics.php:32`/`Health.php:27` 지표를 리전 차원으로 집계. Consensus Timeout은 `Mapping.php:287` 승인 대기 시간의 임박 신호. Trust Chain Weakening은 `SecurityAudit.php:63-64` verify 체인 신선도 하락.
- **감사**: 경고 방출도 append-only 감사(`SecurityAudit.php:27`)에 기록해 사후 상관분석 가능하게 함. verify 정본만.
- **격리**: 경고·임계·추세 tenant scope. 교차 테넌트 헬스/드리프트 노출 금지.

## 4. KEEP_SEPARATE

마케팅 채널 동기화(`ChannelSync.php:12`)의 지연은 커머스 아웃바운드로 Synchronization Delay와 무관. 어트리뷰션(`AttributionEngine.php:1560`) 무관. 별도 유지.

## 5. 판정

**ABSENT(mesh 경고 계약 전무)** — 순신설. Region Health Degrading은 헬스 메트릭(`SystemMetrics.php:32`)·헬스 엔드포인트(`Health.php:27`), Trust Chain Weakening은 감사 verify(`SecurityAudit.php:63-64`), Consensus Timeout은 승인 큐(`Mapping.php:287`)가 각각 baseline 신호원으로 실재하나 **리전 차원 집계·열화 추세·위상 드리프트 계산·경고 방출은 어디에도 없다**. 죽은 terraform substrate PRESENT 금지(greenfield). BLOCKED_PREREQUISITE(메시 관측 경로 부재). 코드 변경 0.
