# GeniegoROI Claude Code Implementation Specification

# CCIS Part037 — IoT, Edge Computing, Device Management & Digital Twin Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

IoT·Edge Computing·Device Management·Digital Twin 표준을 수립한다.

> ★**성격(대체로 사업범위 밖 — 유일 실 접점=`WmsCctv` 카메라)**: 이 저장소는 **마케팅/커머스 ROI SaaS**이지
> **IoT 플랫폼이 아니다**. 명세가 다루는 **형식 IoT(MQTT/AMQP/OPC UA/CoAP)·Device Registry·Provisioning·
> Firmware OTA·Digital Twin·Edge Computing·Fleet Management·Sensor Telemetry 시계열**은 이 제품의 **사업
> 범위 밖(out of scope)**이라 **부재**한다(grep 0·MEA 061 IoT/Edge weak·MEA 059 Digital Twin weak). ★결함이
> 아니라 정직한 비적용(MEA 064 "out of scope"·Part035/036 어휘 재적용). ★**유일한 실 디바이스 접점(MEA 061
> D-1 "Device 축 편입")**: **`WmsCctv`**(274차·창고/지정장소 **CCTV 카메라** 자격등록+원격 실시간 조회·DVR/NVR
> Hikvision/Dahua/Wisenet·RTSP→HLS 리먹스·snapshot·WebRTC WHEP·**Crypto AES-256-GCM fail-closed**·**SSRF
> DNS rebinding 재검증**·HMAC 프록시). 부수 접점: `Wms`(창고 재고/이동·바코드 웹캠 getUserMedia)·
> `PixelTracking`(웹 픽셀 텔레메트리·**IoT 센서 아님**)·`api_key`(bot/device identity). Part001 §4 에 따라
> 실측 → IoT 플랫폼/Digital Twin 사업범위 밖 증명 → `WmsCctv` 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 디바이스 접점 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| IoT Architecture | Sensor→Edge→Gateway→Platform | **부재(out of scope)** — IoT 플랫폼 없음. 유일 접점=`WmsCctv`(카메라 프록시) |
| Device Registry | Device ID/Serial/Firmware/Status | **부분(대응물)** — `WmsCctv` 카메라 자격등록(vendor/host/channel)·`api_key`(machine identity). 형식 Device Registry 아님 |
| Device Provisioning | Auto/QR/Certificate Enroll | **부분** — `WmsCctv` 수동 등록(벤더 프리셋)·`api_key` 발급. QR/Cert Enroll 부재 |
| Device Lifecycle | Manufactured→Retired | **부분** — 카메라 등록/조회/삭제·`api_key` is_active. 형식 상태머신 아님 |
| Device Authentication | X.509/mTLS/TPM/Secure Element | **부분** — `WmsCctv` 자격증명(Crypto AES·fail-closed)·`api_key`(SHA-256). mTLS/TPM/Secure Element 부재 |
| MQTT | QoS/Retained/Topic ACL | **부재(out of scope)** — MQTT 브로커 없음 |
| AMQP | Enterprise Queue | **부재(out of scope)** — AMQP 없음(큐=`omni_outbox` DB·Part018) |
| OPC UA | PLC/Factory Automation | **부재(out of scope)** — 산업설비 연계 없음 |
| CoAP | 경량 프로토콜 | **부재(out of scope)** — CoAP 없음 |
| Telemetry | Temp/GPS/Battery/CPU | **부재(out of scope)** — 디바이스 센서 텔레메트리 없음. `PixelTracking`=웹 이벤트(센서 아님)·`SystemMetrics`=서버 지표 |
| Sensor Data(시계열) | TimeSeries/Aggregation | **부재(out of scope)** — 센서 시계열 DB 없음. rollup 집계=커머스 지표(Part026) |
| Edge Computing | Filtering/AI Inference/Cache | **부분(카메라)** — `WmsCctv` 서버측 RTSP→HLS 리먹스(-c copy)·시청자 없으면 자동종료. Edge AI 추론 아님 |
| OTA Firmware Update | Version/Rollback/Signature | **부재(out of scope)** — 펌웨어 관리 없음(카메라는 벤더 자체 관리) |
| Fleet Management | Vehicle/Camera/Gateway 그룹 | **부분(카메라)** — `WmsCctv` 다중 카메라 등록. 대규모 Fleet 관리 아님 |
| Digital Twin | Device State/Config/Health | **부재(out of scope)** — Digital Twin 없음(MEA 059 weak) |
| Event Processing | Threshold/Rule/Stream | **부분(대응물)** — `RuleEngine`(IF-THEN·재고↓ 등)·`Alerting`. 디바이스 스트림 처리 아님 |
| Monitoring | Online/Offline/Firmware | **부분** — 카메라 재생 상태·`SystemMetrics`. 디바이스 fleet 대시보드 아님 |
| Alerting(Email/SMS/Slack) | 장치 장애 알림 | ★**대응물** — `Alerting`(Slack HMAC)·`Omnichannel`(Part033). Teams 부재 |
| Security(mTLS/Secure Boot/Firmware Validation) | 디바이스 보안 | ★**부분 준수** — `WmsCctv` Crypto AES fail-closed·**SSRF 재검증(DNS rebinding·메타데이터 차단)**·HMAC 프록시·mask(). Secure Boot/Firmware Validation 대상 없음 |
| Logging | Device/Firmware/Event | **부분** — `WmsCctv` 로그·`SecurityAudit`. Device/Firmware 감사 부분 |
| Compliance(IEC 62443/NIST IoT) | 산업 IoT 보안 | **부재(out of scope)** — 산업 IoT 인증 대상 아님 |
| Disaster Recovery | Re-provision/OTA Rollback/Twin | **부분** — 카메라 재등록·자격증명 복구. OTA/Twin 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Device First/Edge Before Cloud/Event Driven/Offline First/Immutable Identity/Digital Twin Ready/Zero Trust Device) | **부분(카메라축)** | ★Secure by Default(WmsCctv Crypto/SSRF)·Immutable Identity(api_key). Device First/Edge/Digital Twin=out of scope |
| §4 IoT Architecture | **부재(out of scope)** | IoT 플랫폼 없음. `WmsCctv` 카메라 프록시가 유일 접점 |
| §5 Device Registry | **부분(대응물)** | `WmsCctv` 카메라 등록·`api_key`. 형식 Registry 아님 |
| §6 Provisioning | **부분** | 수동 등록(벤더 프리셋)·`api_key` 발급. QR/Cert 부재 |
| §7 Device Lifecycle | **부분** | 등록/조회/삭제·`api_key` is_active |
| §8 Device Authentication | **부분** | Crypto AES·`api_key` SHA-256. mTLS/TPM 부재 |
| §9~§11 MQTT/AMQP/OPC UA | **부재(out of scope)** | 브로커/산업설비 연계 없음 |
| §12~§13 Telemetry/Sensor Data | **부재(out of scope)** | 디바이스 센서/시계열 없음. `PixelTracking`=웹(센서 아님) |
| §14 Edge Computing | **부분(카메라)** | RTSP→HLS 서버 리먹스·자동종료. Edge AI 아님 |
| §15 OTA Firmware | **부재(out of scope)** | 펌웨어 관리 없음 |
| §16 Fleet Management | **부분(카메라)** | 다중 카메라 등록. 대규모 Fleet 아님 |
| §17 Digital Twin | **부재(out of scope)** | Digital Twin 없음(MEA 059 weak) |
| §18 Event Processing | **부분(대응물)** | `RuleEngine`·`Alerting`. 디바이스 스트림 아님 |
| §19 Monitoring | **부분** | 카메라 재생 상태·`SystemMetrics` |
| §20 Alerting | **★대응물** | `Alerting`(Slack)·`Omnichannel`. Teams 부재 |
| §21 Security | **★부분 준수** | Crypto AES fail-closed·**SSRF 재검증**·HMAC 프록시·mask(). Secure Boot 대상 없음 |
| §22 Logging | **부분** | `WmsCctv`·`SecurityAudit` |
| §23 Compliance | **부재(out of scope)** | IEC 62443/NIST IoT 대상 아님 |
| §24 Disaster Recovery | **부분** | 카메라 재등록·자격 복구. OTA/Twin 대상 없음 |
| §25~§26 PHP/Claude(Registry/MQTT Client/OPC UA/Twin Repo) | **부분** | ★`WmsCctv`(카메라)·`api_key`·`RuleEngine`. MQTT/OPC UA/Twin Repo=out of scope |
| §27~§28 검증(device:list/mqtt:health/twin:health) | **대상 없음** | artisan 없음·IoT 없음. `WmsCctv` API·`api_key` 로 대체 |

---

## 4. 확립된 표준 (신규 디바이스 접점 코드가 따를 정본)

- ★**카메라/디바이스 접점 정본 = `WmsCctv`**(274차·MEA 061 Device 축). 신규 카메라/영상장비는 이 핸들러 확장(중복 신설 금지). ★**착수 전 부재증명(CHANGE_GATE) 모범**: `cctv|rtsp|nvr|onvif|m3u8|hls` grep 0 확인 후 신설 확정 — 이 규율 승계.
- ★**디바이스 자격증명 보안**: `Crypto` AES-256-GCM(`CRED_ENC_KEY`·**fail-closed**)·조회는 `mask()`(원문 미반환)·**자격증명 브라우저로 미노출**(HMAC 서명 프록시 경로). 신규 장비 연동 필수 승계.
- ★**SSRF 재검증(등록·재생 양 시점)**: 공인 IP 재해석(**DNS rebinding 대비**)·사설(10/172.16/192.168)·루프백·링크로컬(**169.254.169.254 메타데이터**)·예약대역 **fail-closed 거부**. DVR http 허용하되 IP 정책 동일 적용.
- ★**Bot/Device Identity = `api_key`**(SHA-256·RBAC·테넌트). 디바이스 identity 신설 금지(api_key 재사용·MEA "Bot identity=api_key").
- ★**이벤트/알림 = `RuleEngine`(IF-THEN)+`Alerting`/`Omnichannel`**(Part032/033). 디바이스 이상=규칙 액션·알림 재사용.
- ★**사업범위 원칙**: **IoT 플랫폼(MQTT/OPC UA/Digital Twin/OTA/Sensor Telemetry)은 이 제품 범위 밖** — 요구·제품결정 전 선이식 금지. 카메라/창고 장비 접점만 `WmsCctv` 로 확장.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 상당수 out of scope)

1. **형식 IoT 플랫폼(MQTT/AMQP/OPC UA/CoAP 브로커)·Device Registry·Provisioning(QR/Cert)** — 안 함. **사업 범위 밖**(IoT 플랫폼 제품 아님·마케팅/커머스 ROI SaaS). `WmsCctv`(카메라)+`api_key`(identity)가 유일 접점.
2. **Digital Twin(Device State/Config/Health 트윈)** — 안 함. **사업 범위 밖**(MEA 059 weak·물리 자산 트윈 없음).
3. **OTA Firmware Update·Fleet Management(대규모)·Sensor Telemetry 시계열** — 안 함. **사업 범위 밖**. 카메라는 벤더 자체 펌웨어/관리.
4. **Edge Computing(Edge AI 추론/로컬 캐시)** — 부분. `WmsCctv` 서버측 RTSP→HLS 리먹스가 Edge 유사이나 AI 추론 아님.
5. **mTLS/TPM/Secure Boot/Firmware Validation·IEC 62443/NIST IoT** — 안 함. 카메라 자격=`Crypto` AES fail-closed·SSRF 재검증이 실효 보호. 산업 IoT 인증 대상 아님.
6. **artisan `device:*`/`mqtt:*`/`twin:*` 명령** — 없음(Slim·IoT 없음). `WmsCctv` API·`api_key`·`RuleEngine` 로 대체.

★**준수하는 실 원칙(카메라 접점)**: **`WmsCctv`(Device 축)·자격증명 Crypto AES fail-closed·mask()·자격 브라우저 미노출·SSRF DNS rebinding 재검증·HMAC 프록시·api_key device identity·RuleEngine/Alerting 이벤트·CHANGE_GATE 부재증명·테넌트 격리**. ★**out of scope 정직 선언**: IoT 플랫폼/Digital Twin/OTA/Sensor Telemetry 는 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 카메라/영상장비=`WmsCctv`(274차·Device 축) 확장(중복 신설 금지). ★착수 전 CHANGE_GATE 부재증명(grep) 후 확정.
2. ★디바이스 자격=`Crypto` AES-256-GCM fail-closed·`mask()`·**자격 브라우저 미노출(HMAC 프록시)**. Identity=`api_key`(신설 금지).
3. ★SSRF 재검증(등록·재생 양 시점)·**DNS rebinding 대비**·사설/루프백/링크로컬(169.254.169.254)/예약대역 fail-closed 거부.
4. 이벤트/알림=`RuleEngine`(IF-THEN)+`Alerting`/`Omnichannel`. 테넌트 격리·`SecurityAudit` 기록.
5. ★**MQTT/AMQP/OPC UA/Digital Twin/OTA/Sensor Telemetry 를 선이식하지 않는다** — 사업 범위 밖(요구·제품결정 선행).
6. IoT 플랫폼/Fleet/Firmware/Edge AI 를 "명세에 있다"는 이유로 이식하지 않는다(`WmsCctv`+`api_key`+`RuleEngine` 로 커버).

---

## 7. Completion Criteria

- [x] 디바이스 접점 스택 **실측**(MQTT/AMQP/OPC UA/Digital Twin/OTA/Telemetry 부재·`WmsCctv` 카메라·`api_key` identity·SSRF/Crypto 보안 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(IoT 플랫폼/Digital Twin **out of scope** 증명·`WmsCctv` Device 축 실재)
- [x] 실 접점(WmsCctv+api_key+RuleEngine/Alerting) 성문화(§4)
- [x] ★`WmsCctv` Device 축·자격 Crypto fail-closed·SSRF DNS rebinding 재검증·CHANGE_GATE 부재증명·테넌트 격리·**out of scope 정직 선언** 명시
- [x] 의도적 미적용 + 사유(§5) — IoT 플랫폼/Digital Twin/OTA/Fleet/Sensor Telemetry(상당수 out of scope)
- [x] Claude Code 규칙(§6) · `WmsCctv`·`api_key`·`RuleEngine`·`Alerting` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 유일한 실 디바이스 접점인 **`WmsCctv`**(카메라·MEA 061 Device 축·
> Crypto fail-closed·SSRF 재검증)의 성문화이지 IoT 플랫폼/MQTT/OPC UA/Digital Twin/OTA 이식이 아니다. ★**out
> of scope 정직 선언(MEA 064 어휘)**: IoT 플랫폼·Digital Twin·Sensor Telemetry 는 이 마케팅/커머스 SaaS 의
> **사업 범위 밖**이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part038 — GIS, Mapping, Geospatial Analytics & Location Intelligence** — ★사전 실측 예고: 형식 GIS/PostGIS·Route Optimization·Geofencing·Spatial Index 는 **부재/부분**(대체로 사업범위 밖)이나, 위치 실체는 **`Geo`(지역/좌표·IP geo)·배송추적(`Logistics`/`logistics_track_cron`)·국가/지역 코드(i18n 15개국·`fxToKrw` 통화)·채널별 지역 성과(rollup)**로 부분 실재. Part038 도 실측→PostGIS/Route Opt/Geofencing 부재증명→Geo+배송추적+지역 rollup 성문화. ★주의: 차량/경로 최적화·Heat Map 은 대체로 사업범위 밖(035~037 out of scope 어휘 재적용)·`Mmm`/`Decisioning` 는 지리 최적화 아님.
