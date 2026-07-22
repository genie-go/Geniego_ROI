# ADR — MEA Part 061 Enterprise IoT, Edge AI & Intelligent Device Platform Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` + 광의 히트 파일 단위 전수 분류**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054·059 판정 상속·재판정 금지** — 단 **`WmsCctv`는 본 Part에서 Device 축으로 스코프 전환**(D-1).

## Context
MEA Part 061은 물류·창고·차량·센서·스마트 디바이스를 연결하고 Edge AI로 현장 즉시 분석·판단·제어하려 한다. 전수조사 결과:
① **IoT 표준 프로토콜·Firmware·Edge AI·Telemetry는 단어 자체가 없다** — `mqtt`/`coap`/`lorawan`/`zigbee`/`modbus`/`opcua`/`firmware`/`edge_ai`/`edge_inference`/`edge_model`/`edge_node`/`sensor_reading`/`device_command`/`device_registry` **전부 0**.
② **그러나 CCTV 카메라 도메인에 실질 Device Management가 있다** — `wms_cameras`(vendor·protocol·host·port·model·active·**test_status** `WmsCctv`:124~151)·`wms_cctv_bridges`(**pair_code·token_hash·status·agent_version·discovered·last_seen_at**:152~166)·`VENDORS` 벤더 프로파일(**ONVIF 표준 포함**:55~79)·`saveCamera`(:384)/`listCameras`(:364)/`deleteCamera`(:497)/`testCamera`(:739)·세션·재생토큰(`TOKEN_TTL`:46·`session`:672·`keepalive`:722)·**자원 폭주 방어**(`MAX_BYTES` 25MB:47·**`IDLE_KILL` 무시청 90초 ffmpeg 종료**:48).
③ **온프렘 브리지 에이전트**가 **페어링**(`bridge.js`:92)·**토큰 인증**(:202)·**heartbeat**(:200~206)·**LAN WS-Discovery ONVIF 자동발견**(:21)·**VERSION 보고**(:36)를 수행한다.

## D-1 ★★`WmsCctv` 스코프 전환 — 054·059 배제 → 061 편입 (경계 재설정)
**결정**: 동일 자산이 **세 Part에서 다르게 취급**된다. 054는 **`agent_version`≠AI Agent**로, 059는 **비디오월≠Asset Twin**으로 배제했다. **본 Part(IoT/Device)에서는 CCTV 카메라가 정당한 Device 스코프**이므로 **배제가 아니라 편입**한다.
★**단 편입 범위를 Device Management 축에만 한정**한다 — **Edge AI·Telemetry Platform·Predictive Maintenance로 확대 해석하지 않는다**. 054·059의 배제 판정은 **각자의 스코프에서 여전히 유효**하며 **재판정하지 않는다**.
★이는 **060 D-2에서 확립한 "스코프를 분리해 둘 다 참으로 만든다"의 두 번째 적용 사례**다. 같은 자산이 Part마다 다른 스코프로 평가되는 것은 **모순이 아니라 정상**이며, **어느 판정이 적용되는 스코프를 명시**하는 것이 표준 처리법이다.

## D-2 ★"IoT가 없다"가 아니라 "카메라 한 종류의 Device 관리만 있다"
**결정**: §6 Domain 10종 중 실질 대응은 **Smart Warehouse 부분**(창고 CCTV)뿐이며 **Smart Fleet·Vehicle·Logistics·Asset·Facility·Environment·Edge AI·Device Intelligence·Enterprise IoT는 전면 부재**다.
★§7 Lifecycle은 **6/10 부분 실재**(Registration·Provisioning·Authentication·Configuration·Monitoring·Retirement)이나 **핵심 4단계(Telemetry Collection·Edge Processing·Firmware Update·Archive)가 부재**해 "Lifecycle 전 과정 관리"는 미충족이다.
★**현행은 조회 전용 스트림 릴레이**다 — **DEVICE_COMMAND(제어 명령)가 없고** 카메라를 제어하지 않는다(정직 표기).

## D-3 ★`cctv-bridge`는 Edge Runtime이 아니다 — §9 미충족 정직 기술
**결정**: `tools/cctv-bridge/bridge.js`는 **LAN 내 RTSP를 서버로 중계하는 릴레이 에이전트**이지 **Edge Runtime/추론기가 아니다**. 현장에서 **분석·판단하지 않는다**. 실장비가 표준 스트림을 노출하지 않아 브리지가 필수라는 현장 제약이 코드에 명시돼 있다(`WmsCctv`:966).
★따라서 §9 "Edge 환경은 **네트워크 장애 시에도 독립적으로 동작**할 수 있어야 한다"는 **릴레이가 끊기면 조회 자체가 불가**하므로 **미충족**이다.
★**Edge 추론 도입은 GPU/연산 인프라 선행 종속**(051 GPU/클러스터 부재 확정) — **"미구현"이 아니라 "인프라 선행 종속"**으로 기술한다. AI Model Distribution은 **053 Gateway·052 Model Registry 부재**를 함께 해결해야 성립한다.

## D-4 ★Device Registry는 `wms_cameras` 일반화 — Registry 부재 4연속의 동일 처방
**결정**: §6 "모든 Device는 **Enterprise Device Registry**를 기준으로 관리"는 **Registry 부재**로 미충족이다. ★이는 **058 Decision Registry · 059 Twin Registry · 060 Automation Registry에 이은 4연속 동일 병리**다.
★**처방도 같다**: 새 테이블이 아니라 **`wms_cameras`를 `device_type` 확장으로 일반화**하는 것이 1순위 검토 경로다(**기존 위의 얇은 통합 계층**).
★**온프렘 에이전트 이원화 금지**: 페어링·토큰·heartbeat·발견이 **이미 `cctv-bridge`에 있다**. 새 Edge Agent를 만들면 **두 개의 온프렘 에이전트**가 되어 **현장 설치 부담과 보안 표면이 이중화**된다.
★**Device identity는 `api_key` 위에**(EPIC 06-A Part3-6 확정 — `api_key`가 유일 비인간 identity·별도 계정 체계 신설 금지)·자격은 **`Crypto`(049) AES-256-GCM Vault**(중복 암호화 금지).

## D-5 ★Device Discovery는 명세보다 앞선 실재분 — 반드시 재사용
**결정**: `bridge.js`(:21)가 **LAN WS-Discovery 프로브로 ONVIF 장비를 자동발견**해 모델/서비스주소를 `discovered` 컬럼(`WmsCctv`:152~166)에 보고한다. **명세 §8 Device Management 항목에는 Discovery가 없으나 실재**한다(정직 병기).
★신설 시 **반드시 재사용**하며 중복 발견기를 만들지 않는다. 이는 [[feedback_competitive_gap_verify]]의 "코드 존재분 감점 금지"가 적용되는 지점이다 — **명세에 없다고 부재로 기록하면 실재 자산을 잃는다**.
★**274차가 착수 전 자체 부재증명을 남긴 것**(`WmsCctv`:13 "착수 전 부재증명(CHANGE_GATE): `cctv|rtsp|nvr|onvif|m3u8|hls` 소스 전수 grep 매치 0건")은 **`CHANGE_GATE` 준수 모범 사례**로 기록한다.

## D-6 ★★테넌트 격리는 본 Part 최고 위험도 — 물리 보안 직결
**결정**: Device 데이터에는 **카메라 자격(user/pass)·현장 IP·창고 배치**가 담긴다. 교차 노출 시 **물리 보안 침해**로 직결되며, **다른 Part의 영업 기밀(예산·마진·프로세스)보다 위험도가 높다**([[reference_platform_growth_actas_tenant_hijack]]).
★**테넌트 격리 절대**(전 테이블 tenant 키 이미 적용 `WmsCctv`:124~166)·**자격 AES-256-GCM 암호화 유지**(`Crypto` 049·274차)·**SSRF 이중검증 유지**(274차)·신규 Device API는 **인증 필수 접두**(053 D-5·057 D-7·058 D-6·059 D-6·060 승계).
★**후퇴 금지 자원 통제**: 응답 상한 **25MB**(:47)·**무시청 90초 후 ffmpeg 종료**(:48)·재생토큰 **TTL 3600s**(:46)는 **서버 자원 폭주 방어**다 — 특히 `IDLE_KILL`이 없으면 **ffmpeg 프로세스가 무한 누적**된다. 제거·완화 시 **장애 직결**.
★**DEVICE_AUDIT**은 `SecurityAudit` 확장이되 **고빈도 텔레메트리는 체인 직접 유입 금지**(앵커링·057 D-4~060 승계).

## D-7 ★★Firmware·제어 명령 금지는 현행이 구조적으로 충족 — 물리 제어는 최고 수위 게이트
**결정**: 명세 §17 말미 "AI는 **승인 없이 Device Firmware를 자동 변경**하거나 **제어 명령을 무단 실행**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ**Firmware 개념 자체가 없다**(`firmware` grep 0 — 변경 대상 부재) ⓑ**제어 명령(DEVICE_COMMAND)이 없다** — 조회 전용 릴레이 ⓒAI가 Device에 접근하는 경로 자체가 없다 ⓓ파괴적 액션은 **제안-only+HITL**·기본값 **approval**(054 D-2).
★★**후퇴 금지 + 최고 수위 게이트**: 향후 **PTZ 제어·펌웨어 OTA·자동 재부팅**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**([[feedback_deploy_approval_mandatory]]). ★**물리 장치 제어는 오작동이 물리 세계에 즉시 반영**되므로 **058(의사결정)·059(시뮬레이션)·060(프로세스)보다 더 엄격한 게이트**를 적용한다 — **승인 정족수 + 킬스위치 + 롤백 경로 + 작업 창(maintenance window)**까지 함께 설계할 것.
★**지표 규율**: Device Health·Predictive Maintenance 지표는 **실 heartbeat·`test_status`·`last_seen_at` 파생만**이며 **산출 불가 시 0이 아니라 null·명시적 사유**(057·058·059 **3연속 모범** 승계). ★본 Part에서는 특히 위험 — **장비 헬스 0%를 "정상"으로 오독하면 물리 장애를 은폐**한다.
★**성능(§18)**: **측정 장치 부재** → **"미달"이 아니라 "측정 기반 부재"**. 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL-weak** — CCTV 카메라 도메인 Device Management는 실재하나 **Sensor·Telemetry·Edge AI·Firmware·Device Command·Predictive Maintenance는 전면 부재**.
- ★★**Registry 부재 4연속**(058 Decision·059 Twin·060 Automation·**061 Device**)=**같은 구조적 병리**·처방 동일(**기존 위의 얇은 통합 계층**).
- ★중복 금지 재사용: **`WmsCctv`**(`wms_cameras`·`wms_cctv_bridges`·`VENDORS`·세션/토큰·자원 통제)·**`tools/cctv-bridge`**(페어링·토큰·heartbeat·**ONVIF WS-Discovery**)·`Crypto`(049 Vault)·`api_key`(EPIC 06-A identity)·`SystemMetrics`(057 관측 정본)·`SecurityAudit`(056 감사 정본)·cron 36·`index.php`.
- ★순신설: **Enterprise Device Registry**·**IoT Gateway**·**Edge AI Platform 전량**(§9 8항목)·**Telemetry Platform 전량**(§10 8항목)·**§11 Intelligent Device Analytics 전량**·**§12 IoT Governance 전량**·SENSOR/SENSOR_READING/TELEMETRY/DEVICE_COMMAND/DEVICE_EVENT/DEVICE_POLICY/DEVICE_FIRMWARE/DEVICE_ANALYTICS 엔티티·**IoT 표준 프로토콜**(MQTT/CoAP/LoRaWAN/Zigbee/Modbus/OPC-UA)·**Firmware 전 계층**·**mTLS·Secure Boot·Firmware Integrity**·Remote Configuration·**API 6종·Event 8종**·**§17 AI 8종**.
- ★오흡수 금지: **`iot` 11히트=`ioTransferDest`/`ioTypeLabel`(WMS 입출고 i18n 키) 완전 오탐** · **`edge` 18히트=`GraphScore` 그래프 엣지 + `WebPush`/`CctvPlayer` 브라우저 Edge 완전 오탐** · **`sensor` 1히트=`AIInsights.jsx`(:144) "Sensors" UI 라벨** · **`telemetry` 3히트=`plans.js`(:7·:156·:207) 주석**(057 확정) · `provisioning` 2히트=**SCIM SSO 계정 프로비저닝** · `time_series` 1히트=**`PixelTracking`(:879) 픽셀 시계열** · **`device` 81 대부분=`Attribution` 크로스디바이스 식별(280차)·매뉴얼 라벨** · **`tools/cctv-bridge`=스트림 릴레이≠Edge Runtime/추론기** · **영상 릴레이≠센서 텔레메트리** · `Wms` 재고 8테이블(060 확정)≠Smart Warehouse Device · `SystemMetrics`(057)≠Device Monitoring · `connector_health`≠Device Health · **`agent_version`≠AI Agent**(054 확정 유지) · **비디오월≠Asset Twin**(059 확정 유지).
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI의 Device Firmware 자동 변경·제어 명령 무단 실행 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 044/045/047/048/049/051/**054**/056/057/**059**/060·EPIC 06-A 상속·**재판정 금지**·재감사 금지(274차 데모검증·운영 미배포 상태 기술만).
