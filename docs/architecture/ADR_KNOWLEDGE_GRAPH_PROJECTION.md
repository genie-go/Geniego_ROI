# ADR — Knowledge Graph Projection & Synchronization (EPIC 02-C)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Projection 설계·Registry 확정. 비파괴 — 코드변경 0). 실 Worker/emit/Reconciliation 배선은 후속 승인·라이브검증·회귀 후.
- **근거**: [`../knowledge-graph/GRAPH_PROJECTION_ARCHITECTURE.md`](../knowledge-graph/GRAPH_PROJECTION_ARCHITECTURE.md) + 288차 기존 Sync 인프라 전수조사(실코드) + 02-A/B.

## 결정 (핵심)
1. **신규 poller·이벤트버스·MQ 신설 금지**. 기존 확장: OpenPlatform::emit(주문 chokepoint) + 아웃박스(webhook_delivery 패턴) + graph_projection_cron(install_crontab.sh 관용구) + 정규화 파이프라인(raw→normalized). Reconciliation은 rollup/roasReconciliation 패턴 복제.
2. **Projection은 멱등 chokepoint 하류에서만 소비**(saveOrders/persistMetricRows/upsertAdInsights). **원천 재파싱 금지**(이중계산 — 이미 폴링+웹훅 삼중경로가 chokepoint 멱등 수렴).
3. **증분=고정 lookback 윈도우 재fetch + 자연키 멱등 upsert**(기존 철학 승계, 커서/CDC 미도입 — 스택 미보유). Idempotency Key=tenant+source+object+record+version+projection_version.
4. **Ordering**: 재fetch가 out-of-order 흡수·Stale은 source_version Ignore·Late(Conversion/Refund)는 valid_from/to 수정(Temporal, 덮어쓰기 금지).
5. **Retry/DLQ**: ad_delivery_dlq 패턴(지수백오프 600*2^attempts·max5) 복제→graph_projection_dlq. Replay 멱등.
6. **Rebuild**: SoT(channel_orders 등)에서 Shadow Compare→Cutover→Rollback. 운영 Graph 직접 비우기 금지.
7. **Tenant 경계=Projection 단계부터**(도출 tenant·본문 불신). Cross-Tenant 차단.

## 발견 위험(§26)
- ⚠️ **채널 인바운드 웹훅 HMAC 부재**(ChannelSync:5612, 토큰만). Batch 재fetch 백업으로 정합은 유지되나, KG 신뢰경로로 쓰기 전 **HMAC 도입 권고**. Security Risk 1. Paddle 웹훅은 HMAC 정상.

## 무후퇴·영구 규칙(§38)
새 Projection/Worker 전: Projection Source Registry·기존 Pipeline·Node/Edge Type Registry·Tenant Scope·Idempotency Key·Ordering/Delete·Retry/DLQ/Replay·Reconciliation·Observability 확인 → ADR/PM. 동일 Source Object 처리 Pipeline 중복 금지.

## 결과
Graph Projection Architecture(Source 9·Pipeline 4·멱등/순서/삭제/재시도/재구축/정합/SLO/보안) 확정. 기존 Sync 무후퇴 통합. 다음 **EPIC 02-D — Query, Traversal, Security & Validation Gate** 입력 준비 완료. Security Risk 1(웹훅 HMAC)·코드변경 0.
