# DSAR — Authorization Cache Policy (§63)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§63 Cache Key(구성요소)**: Tenant · Definition Version · Policy Set Version · Subject Version · Session Generation · Resource Version · Action · Slot · Amount·Currency · Environment · Kill-switch version · Integrity-digest — **모두 aware**(누락 시 캐시 금지).

**즉시 Invalidation 트리거**: Registry Suspended · Policy Changed/Suspended · Definition Version · Subject Identity · Session Revoked · Resource Version · Assignment/Authority/Delegation · Exception/Override Revoked · Kill Switch · Tamper · Incident.

**Cache Hit 재검증(§63)**: Hit 시에도 `Valid Until` · `Policy/Definition Version` · `Resource Version` · `Session Generation` · `Kill Switch` · `Digest`를 다시 확인 후에만 사용.

**Cache 금지 대상(§49)**: Override · Exception · Emergency · Break-glass · Manual Review · Indeterminate · Challenge · Error · Tamper · 고위험 Version 불명확.

의미: 인가 캐시는 순수 성능장치이며 **테넌트 격리·버전 인지·즉시 무효화·Hit 재검증**을 절대 위반하지 않는다. Cross-Tenant 재사용·버전 없는 키·고위험 판정 캐시는 §53 Critical Gap이자 §54 Lint 차단 대상이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 판정 캐시는 부재** — GROUND_TRUTH 중복감사(§59)에서 **인가 결과 캐시 자체 부재**로 확정. 현재 판정은 매 요청 인메모리 재계산(`index.php:553-603` roleRank/scope/method 게이트)이라 캐시 무효화·Cross-Tenant 오염 벡터는 아직 없음(=미도입).
- **Cross-Tenant 재사용 차단 substrate(양호)**: `index.php:590-593,600` tenant 강제주입 — 인증키 tenant_id로 X-Tenant-Id 무조건 덮어쓰기(위조 원천차단). 캐시 도입 시 이 tenant가 Cache Key의 필수 1요소가 되어야 한다.
- **Session/무효화 substrate**: agency 위임은 매요청 재검증(`index.php:74-104` agency_client_link.status='approved') — 캐시 없이 매번 확인하는 fail-closed 패턴. TeamPermissions ACL/스코프도 매요청 DB 조회(`TeamPermissions.php:236-322`)로 캐시 미도입.
- **★캐시 오염의 실 전례(§63 규율 근거)**: MEMORY 286차 `platform_growth act-as 전역 tenant 하이재킹` — localStorage에 고착된 act-as 상태가 X-Act-As-Tenant 헤더로 authedTenant를 `platform_growth`로 오반환해 전 메뉴 공백. 이는 **버전/세션 비인지 상태 재사용**이 Cross-Tenant 유사 사고로 번진 실증 — 인가 캐시가 Session Generation·Tenant를 키에 넣지 않으면 동일 계열 사고 위험.
- `Cache Key Digest`/`Session Generation`/`Kill Switch version`/`즉시 Invalidation` (인가용) → **no hits**.

## 3. 판정

- **Verdict: ABSENT** (인가 캐시 미도입). Cross-Tenant 차단(tenant 강제주입 `index.php:600`)·매요청 재검증(agency `index.php:74-104`) substrate는 PRESENT — 캐시 도입 시 그 격리·무효화 원칙을 승계할 기반.
- **선행 의존**: 캐시 키는 §7 Definition Version·§13 Version·§16 Resource Version·§46 Kill Switch·§37 Digest에 종속 — 상위 버전화·Kill Switch·Digest가 ABSENT이므로 캐시도 순신규. 버전 없는 캐시는 도입 자체가 금지(§54 Lint).
- **cover: 0** (인가 캐시 전무). 단 캐시 미도입 자체는 현재 Cross-Tenant 오염을 원천차단 중(양호) — 도입 시 규율 준수 필수.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 캐시 도입 시 §63 전 요소 aware Cache Key(**Tenant 필수** — `index.php:600` 강제주입 tenant 재사용 · Definition/Policy Set/Subject/Resource Version · Session Generation · Slot · Amount·Currency · Kill-switch version · Integrity-digest). 하나라도 누락 시 캐시 금지(§54 Lint "Policy/Resource Version 없는 Cache Key" 차단).
- **즉시 Invalidation**: Registry Suspended·Policy Changed·Definition Version·Session Revoked·Resource Version·Assignment/Authority/Delegation·Exception/Override Revoked·Kill Switch·Tamper·Incident 발생 시 관련 엔트리 즉시 무효화. Session 무효화는 기존 매요청 재검증(agency `index.php:74-104`) 패턴을 캐시 무효화 트리거로 승격.
- **Cache Hit 재검증 강제(§63)**: Hit여도 Valid Until·Policy/Definition/Resource Version·Session Generation·Kill Switch·Digest를 재확인 — "Hit=무조건 재사용" 안티패턴 금지. 286차 act-as 하이재킹처럼 세션·테넌트 비인지 재사용이 Cross-Tenant 사고로 번지는 것을 차단.
- **Cache 금지 대상(§49) 강제**: Override·Exception·Emergency·Break-glass·Manual Review·Indeterminate·Challenge·Error·Tamper·고위험 Version 불명확은 **절대 캐시하지 않음** — 매번 재평가. 고위험 Approval/Payment/Security Profile(§14)은 `cache allowed=false`.
- Part 1은 캐시 정책·키 구성·무효화 트리거 설계만·실 캐시 계층 구현은 후속. **캐시 미도입 상태에서 Cross-Tenant 격리는 이미 확보(재증명)** — 성급한 캐시 도입이 격리를 깨뜨리지 않도록 규율 선(先)정립.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_AUTHORIZATION_TEST_STRATEGY]] · [[reference_platform_growth_actas_tenant_hijack]].
