# DSAR — Approval Fabric Sync (Part 3-16 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_FABRIC_SYNC`는 fabric의 cluster node·region 간에 authz **상태 도메인**을 수렴시키는 substrate 계약이다. 동기화 대상 상태 클래스:

- **Policy** / **Role** / **Permission** / **Assignment**: 결정 규칙과 부여 관계의 정본 전파.
- **Context** / **Trust** / **Risk**: 결정 시점 신호(세션·신뢰·위험 스코어)의 노드 간 일관성.

계약 속성: 변경 순서 보존(버전/시퀀스), 수렴 보장(최종 일관성 하한), tamper-evident 전파 로그, 충돌 해소 규칙(정본 우선). 노드/region 부재 시 sync는 정의상 no-op이 아니라 **미성립**이다.

## 2. Substrate 매핑 (라이브 실측)

| Sync 상태 클래스 | 라이브 substrate | 상태 |
|---|---|---|
| Policy/Role/Permission/Assignment 전파 | 없음 — 단일 프로세스가 단일 DB(`Db.php:63-87`) 직접 read·단일 노드(`index.php:23`) | **ABSENT** |
| 노드/region 간 전파 채널 | 없음 — `composer.json:5-13` 큐/mesh/pub-sub 의존 전무 | **ABSENT** |
| Context/Trust/Risk 동기화 | 없음 — 결정 신호가 요청 스레드 로컬 (`index.php:423-461`) | **ABSENT** |
| tamper-evident 전파 로그 | `SecurityAudit.php:4-33`(`:8`,`:27`,`:35-40`) = **단일노드** append-only 감사(노드 간 sync 로그 아님) | **PARTIAL(비-sync)** |

## 3. 설계 계약 (순신설 — 코드 0)

fabric sync plane을 신규 도입한다. 각 authz 상태 클래스(Policy/Role/Permission/Assignment/Context/Trust/Risk)마다 버전 시퀀스와 정본 소유 노드를 지정하고, 변경을 순서 보존 스트림으로 cluster node·region(§2·§7)에 전파하여 최종 일관성 하한을 만족시킨다. 전파 로그는 tamper-evident(해시 체인)로 하되, 이는 `SecurityAudit.php:4-33`의 **단일노드** 감사와 별개의 **노드 간** 계약임을 명시한다. 정족수·region 부재 상태에서 sync는 미성립이므로 선행 plane 없이는 활성화 금지.

## 4. KEEP_SEPARATE

다음 라이브 "sync"들은 **데이터 동기화**이지 authz Fabric Sync가 아니다 — 계약 혼입 금지:

- **커머스 채널 sync** `ChannelSync.php:12-25` — 외부 판매채널 상품/주문 데이터 수집. authz 상태 전파와 무관.
- **connector sync** `Db.php:469-517`(참조 `:448-456`, `:414-427`) — 커넥터 데이터 적재. 노드 간 정책 전파 아님.
- **sibling 미러** `AdminPlans.php:53-72`(`:64-70`) — product-config(플랜 정의) 미러링만. Policy/Role/Permission 전파가 아님.

이들은 각자 도메인에 존속(KEEP_SEPARATE)하며 fabric sync로 대체·흡수하지 않는다.

## 4. 판정

**ABSENT.** 라이브에는 노드·region이 없으므로(§2·§7) 노드 간 authz 동기화 자체가 미성립이다 — 단일 프로세스가 단일 DB(`Db.php:63-87`, `index.php:23`)를 직접 읽어 결정하며 전파 채널이 없다(`composer.json:5-13`). `SecurityAudit.php:4-33`은 단일노드 감사 append-only이지 sync 전파 로그가 아니다. 커머스/connector/sibling sync(`ChannelSync.php:12-25`·`Db.php:469-517`·`AdminPlans.php:53-72`)는 데이터 sync로 KEEP_SEPARATE. Fabric Sync substrate는 순신설 대상이며 선행 cluster·region plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
