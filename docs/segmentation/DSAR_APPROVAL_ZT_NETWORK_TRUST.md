# DSAR — Zero Trust & Continuous Authorization: 네트워크 신뢰 (APPROVAL_NETWORK_TRUST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_NETWORK_TRUST`는 SPEC §5(Network Trust Engine)가 정의하는 **네트워크 신뢰 평가 엔티티**다. 요청 발신 네트워크를 분류·등급화해 Trust Score(§14)·Continuous Re-authentication(§13 Network 변경)에 결합한다.

평가 요소(SPEC §5): Office Network · VPN · Zero Trust Network · Public Internet · Proxy · TOR · Unknown Network. 신뢰 낮은 네트워크(TOR/Unknown)는 Adaptive Authorization(§11) Challenge/Deny를 유발한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §5 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| IP 수집(raw material) | **PARTIAL(수집만·비authz)** | `clientIp`(X-Real-IP→REMOTE_ADDR→XFF 마지막홉·스푸핑 하드닝) — rate-limit 식별·세션메타·**신뢰등급 산출 없음**(`UserAuth.php:3443-3463`, GT①) |
| Office/VPN/ZTN/Proxy/TOR/Unknown 분류 | **ABSENT** | `clientIp` 수집만·**VPN/TOR/proxy/impossible-travel 분류 없음**(`UserAuth.php:3443-3463`, GT②) |
| rate-limit(남용 차단) | 방어 프리미티브 | api_key 1200/min 정적 카운터(`index.php:527-570`)=남용 차단·**위협 인텔 아님**(GT①/②) |
| SSRF egress 가드 | 방어 프리미티브 | `Alerting.php:786`(`isSafeWebhookUrl`) 등 egress 하드닝·**IOC/threat feed 아님**(GT②) |

**요약**: Network Trust Engine의 신뢰등급 산출은 순신규. 유일 substrate는 `clientIp`의 IP 수집이며 rate-limit 식별·세션메타에만 쓰이고 authz 신뢰등급을 산출하지 않는다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력 승격(ADR D-1)**: `clientIp`(`UserAuth.php:3443-3463`)·recordSessionMeta ip(`UserAuth.php:4232-4251`)를 Network Trust(VPN/TOR/impossible-travel 분류) 신호로 **승격(Extend·대체 아님)**.
- **필드**: `network_class`(office/vpn/ztn/public/proxy/tor/unknown)·`vpn_detected`·`tor_exit`·`proxy_detected`·`impossible_travel`(SPEC §5). 전부 순신규.
- **상태 출력**: 네트워크 등급을 Trust Score(§14)에 기여. Network 변경은 Continuous Re-authentication(§13) 트리거·Network Untrusted는 Adaptive(§11) Challenge/Deny.
- **오류(SPEC §30)**: `NETWORK_UNTRUSTED`. 방어 프리미티브(rate-limit/SSRF)와 데이터·목적 분리.
- **제약(SPEC §33)**: Immutable Trust Snapshot·Trust Version·**Tenant Isolation**·Digest Validation.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- **방어 프리미티브 흡수 금지**: SSRF 가드(`Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`)·rate-limit(`index.php:527-570`)는 egress/남용 하드닝이지 threat feed/IOC 아님(GT② B-4). Network Trust로 오인 금지.
- `Health.php:82`(서버 fingerprint 차폐)=정보노출 방지·network trust 아님(GT②).
- `Attribution.php:144-150`(`attribution_device_sig` ip+ua 해시)의 ip 성분은 마케팅 attribution이지 authz network 신호 아님(GT② B-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Network Trust Engine = **PARTIAL(clientIp 수집만·비authz) / 분류 ABSENT(순신규)**. 재활용: `clientIp`·recordSessionMeta ip를 분류 입력으로 승격(ADR D-1).
- **정직 분리(ADR D-8)**: IP 수집은 rate-limit 식별용이지 신뢰등급 아님. SSRF/rate-limit은 방어이지 threat intel 아님.
- **선행 의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 network trust 소비지점(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0. 무후퇴·Extend-only.
