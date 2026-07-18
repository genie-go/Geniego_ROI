# DSAR — Cache Policy (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§70 CACHE_POLICY — Resolution 결과 캐시의 키 구성과 무효화 규칙.

### 1.1 Resolution Cache Key 구성 (전사)
1. tenant
2. instance
3. request version
4. case version
5. workflow version
6. chain version
7. sequential version
8. current stage instance
9. current level instance
10. current step instance
11. cursor version
12. assignment version
13. authority version set hash
14. delegation version set hash
15. dependency state hash
16. policy version
17. effective ts

### 1.2 캐시 정책 원칙 (전사)
- Version-aware · Tenant-aware · Cursor-aware · State-aware · Assignment-aware · Authority-aware · Delegation-aware · Dependency-aware.
- 전(全) 이벤트에서 Invalidation.
- Suspension 즉시 Invalidation.
- Critical Conflict 시 캐시 차단(serve 금지).
- 과거 Snapshot 재생성 금지(캐시가 과거 상태를 재작성해서는 안 됨).

## 2. 기존 구현 대조

- **Resolution 캐시 대상 부재**: 캐시할 "Resolution"(Current/Next Stage·Level·Step Resolution §25~30)이 ABSENT — 캐시 키를 구성하는 17개 구성요소 대부분이 실존하지 않음(§GROUND_TRUTH 개념별 판정).
  - instance(2)·stage/level/step instance(8~10): 다단 인스턴스 ABSENT(`current_step/stage/level` 0 hits).
  - cursor version(11): Cursor(§45) ABSENT.
  - assignment version(12): Assignment(§3.4) ABSENT.
  - authority/delegation version set hash(13·14): Authority(§3.2)·Delegation(§3.3) ABSENT.
  - request/case/workflow/chain/sequential version(3~7): Version(§10) 엔티티 ABSENT.
- **Tenant-aware(1)만 substrate 존재**: Tenant Guard `UserAuth.php:403-406` — 캐시 키의 tenant 격리 축은 재사용 가능.
- **이벤트 기반 Invalidation 실체 부재**: 전이가 하드코딩 인라인 UPDATE(`Catalog.php:2397`·`AdminGrowth.php:1330`·`Mapping.php:287`)로 산재 — 전이 이벤트를 캐시 무효화 훅으로 관측할 중앙 Event 스트림(§18) 없음.
- 실존 인접 캐시 성격 자산은 도메인 특화(공용 카탈로그 `__shared__` 스코프 등)로 Resolution Cache 계약과 무관.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Cursor(§45)·Version(§10)·Assignment(§3.4)·Authority(§3.2)·Delegation(§3.3)·Dependency(§23) — 캐시 키 17요소 중 다수가 참조할 실체 없음. 근원적으로 Approval Chain(§3.1) 부재에 종속.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규**. 캐시는 Resolution 엔진과 동시 설계 — 키가 상태 파생 전체를 포함하지 않으면 stale serve 위험.
- **Mandatory Control — 키 완결성**: Resolution Cache Key는 17개 축을 **모두** 포함해야 한다. 특히 cursor version(11)·assignment/authority/delegation version(12~14)·dependency state hash(15)를 키에서 누락하면 승인 권한/위임/의존성 변경 후에도 낡은 Resolution을 serve → 무권한 진행. 이는 §59 Critical Gap.
- **Invalidation 강제**: 전 이벤트(§18) Invalidation + Suspension(§39) 즉시 Invalidation + Critical Conflict(§56) 시 serve 차단을 캐시 계층에 하드 게이트로 편입. 캐시는 절대 과거 Snapshot(§52)을 재생성하지 않음(read-through만·write-back으로 과거 상태 재작성 금지).
- **확장 substrate**: Tenant Guard(`UserAuth.php:403-406`)를 tenant 키 축(1)으로 재사용. 무효화 훅은 순신규 중앙 Event 스트림에 종속 — 실존 하드코딩 전이(`Catalog.php:2397` 등)에는 훅 지점이 없어 그대로는 캐시 무효화 불가.
- **★실위험**: version-aware 키가 낙관적 version CAS(ABSENT)·Fencing Token(ABSENT)과 정합해야 함 — 이 primitive들이 없으면 캐시가 "일관"으로 보이는 stale 상태를 안정적으로 serve하게 되어 동시성 결함을 은폐.
- **BLOCKED_PREREQUISITE**: Resolution 엔진·Cursor·Version·선행 4군 신설 전 캐시 설계 무의미.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
