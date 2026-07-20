# DSAR — Approval Fabric Analytics (Part 3-16 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

`APPROVAL_FABRIC_ANALYTICS`는 authorization fabric의 운영 지표를 집계·모니터링한다. SPEC §21 지표:

- **Decision Throughput**: 단위 시간당 authz 결정 처리량.
- **Sync Latency**: 노드간 상태 동기화 지연.
- **Cache Hit**: 정책/결정 캐시 적중률.
- **Region Health**: region/replica 건강도.
- **Distribution Success**: 스냅샷/정책 배포 성공률.
- **Failover Count**: 장애 전환 발생 횟수.

이 지표들은 fabric-native(authz) 관측치여야 하며, 무관한 도메인 지표와 혼입 금지.

## 2. Substrate 매핑

| SPEC 요구 (§21) | 라이브 substrate | 상태 |
|---|---|---|
| authz fabric 지표 집계 | 없음 — fabric 미존재 | ABSENT |
| 단일노드 헬스/시스템 지표(baseline) | `SystemMetrics.php:60-100`(`:67-76`) | baseline 참고 |
| 노드 헬스 엔드포인트 | `Health.php:13-26` | baseline 참고 |
| Sync Latency/Distribution/Failover(노드간) | 없음 — 노드간 fabric 부재 | ABSENT(순신설) |
| Cache Hit(authz 정책 캐시) | 없음 | ABSENT |

## 3. 설계 계약

- **baseline 재활용**: 단일노드 시스템 헬스는 `SystemMetrics.php:60-100`(`:67-76`) 및 `Health.php:13-26`을 baseline으로 참고 — Region Health의 단일노드 근사치. fabric-native 노드간 지표는 순신설.
- **집계 모델**: `authz_fabric_analytics`(신설) — Decision Throughput/Sync Latency/Cache Hit/Region Health/Distribution Success/Failover Count를 시간 윈도우별 집계. 결정 이벤트·evidence(§19)를 소스로 파생(임의 숫자 금지·실측 파생).
- **선행 의존**: 노드간 지표는 fabric 노드 실재가 선행 — BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE

- **attribution 캐시** `AttributionEngine.php:1754-1791`는 **마케팅 기여도 캐시 지표**이지 authz fabric Cache Hit이 아니다 — fabric analytics에 혼입 금지.
- **데이터 export** `DataExport.php:11`(`:26`·`:131-133`·`:154-156`)는 데이터 반출 경로로 authz fabric analytics 아님 — 분리 유지.

## 5. 판정

**ABSENT.** 라이브에 authz fabric 지표 집계는 존재하지 않는다. 단일노드 헬스(`SystemMetrics.php:60-100`·`:67-76`, `Health.php:13-26`)만 Region Health baseline으로 참고 가능하며, Sync/Distribution/Failover/Cache 등 노드간 지표는 순신설. attribution 캐시(`AttributionEngine.php:1754-1791`)·데이터 export(`DataExport.php:11`)는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
