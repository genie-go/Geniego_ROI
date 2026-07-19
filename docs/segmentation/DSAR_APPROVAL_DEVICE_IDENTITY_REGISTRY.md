# DSAR — Device Identity Registry (06-A-03-02-03-03 · §35)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§35 Device Identity Registry** — 승인 행위가 이뤄진 기기의 신원 등록소. 필수 필드:
`device id` · `tenant` · `type`(9종: DESKTOP / LAPTOP / MOBILE / TABLET / SERVER / WORKLOAD / HARDWARE_TOKEN_REF / UNKNOWN / CUSTOM) · `platform` · `OS ref` · `application` · `owner subject` · `managed / trusted`(관리·신뢰 여부) · `enrolled / verified`(등록·검증 시각) · `trust expires` · `compromise status` · `attestation ref` · `fingerprint digest`.

★ **Fingerprint 원문 저장 금지**(§26·§5.7). 기기는 `fingerprint digest`·attestation 참조로만 식별하며, managed/trusted 상태와 compromise 상태를 Device Assurance Level(DAL, §12)의 근거로 결합한다.

## 2. 기존 구현 대조

- **완전 부재** — GROUND_TRUTH §2 인증표: Device/Fingerprint/Trusted **ABSENT**(grep 무 — "마케팅 cross-device·Snowflake JWT만"). device id·type·managed/trusted·attestation·fingerprint digest 코드·테이블 no hits.
- **인증 흐름에 device 축 없음** — 세션 발급(`UserAuth.php:964-970`)·검증(`UserAuth.php:229-318`)은 opaque 토큰만 다루며 device binding이 없다(GROUND_TRUTH §2 "세션 모델: opaque stateful·device 미결합"). api_key(`index.php:483-493`)도 device 개념 없음.
- **"cross-device"는 마케팅 도메인 전용** — grep 상 존재하는 cross-device는 마케팅 identity resolution·Snowflake JWT이지 인증 device registry가 아니다(§25 Channel Binding에서 "Email/Slack/Teams Identity만으로 Canonical Actor 결정 금지"와 유사하게, 마케팅 device는 인증 device로 오인 금지).

## 3. 판정

- **Verdict: ABSENT(완전 부재·순신규)** — Device Identity Registry 전무. device type 9종·managed/trusted·attestation·fingerprint digest 어느 축도 없다.
- **선행 의존**: §3.2 Authentication Foundation의 Device Registry 부재 + §3.3 Decision Binding(§26 Device Binding) ABSENT.
- **cover: 0** — 인증 device 커버 없음. 마케팅 cross-device는 KEEP_SEPARATE(§35 대체 아님·오인 금지).

## 4. 확장·구현 방향 (설계)

- **순신규 Device Identity Registry** — `device id`·`tenant`·`type`(9종)·`platform`·`OS ref`·`application`·`owner subject`·`managed/trusted`·`enrolled/verified`·`trust expires`·`compromise status`·`attestation ref`·`fingerprint digest`를 테넌트 격리 등록소로 신설.
- ★ **Fingerprint 원문 비저장 Mandatory Control** — digest만 저장(§26·§62 Lint). 마케팅 cross-device 테이블과 물리 분리(§66 KEEP_SEPARATE).
- **세션에 device binding 확장(Golden Rule=Extend)** — 기존 세션(`UserAuth.php:964-970,229-318`)에 device id 참조를 결합(§26). owner subject는 canonical subject(`Mapping.php:36-53`)에 매핑.
- **DAL 근거로 Step-up 연동** — new/untrusted device(§31 Step-up 조건)·compromise 상태를 재인증 트리거로. Trusted Device(§35/§26)는 후속 DSAR에서 상세.
- **선행 필수**: Device Provider/Attestation + Decision Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_TRUSTED_DEVICE_FOUNDATION]] · [[DSAR_APPROVAL_CERTIFICATE_IDENTITY_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
