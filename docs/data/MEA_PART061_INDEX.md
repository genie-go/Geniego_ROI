# MEA Part 061 — Enterprise IoT, Edge AI & Intelligent Device Platform Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0·**단어경계 + 광의 히트 파일 단위 전수 분류**)·정직 표기(**카메라 Device 관리 실재 / Sensor·Telemetry·Edge AI 전무** 동시 기술)·과대주장 금지·**부재 축소 금지**·오흡수 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★★**`WmsCctv` 스코프 전환**: 054(≠AI Agent)·059(≠Asset Twin) **배제** → **061에서 Device 축 편입**(060 D-2 "스코프 분리해 둘 다 참으로"의 **두 번째 적용 사례**)·**Device Management 축에만 한정**.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART061_IOT_EDGE_AI_INTELLIGENT_DEVICE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_IOT_EDGE_AI_INTELLIGENT_DEVICE_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART061_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART061_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART061_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART061_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART061_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-weak (CCTV 카메라 도메인 Device Management는 실재 / ★Sensor·Telemetry·Edge AI·Firmware·Device Command·Predictive Maintenance = 전면 ABSENT).**
★★**성격 규정(ADR D-2)**: **"IoT가 없다"가 아니라 "CCTV 카메라 한 종류의 Device 관리만 있고 Sensor·Telemetry·Edge AI는 없다."** 현행은 **조회 전용 스트림 릴레이**이며 **제어 명령·펌웨어·센서 수집이 전무**하다.
★★**`WmsCctv` 스코프 전환(ADR D-1)**: 동일 자산이 **세 Part에서 다르게 취급**된다 — 054는 `agent_version`≠AI Agent, 059는 비디오월≠Asset Twin으로 **배제**, **061은 Device 축으로 편입**. 054·059 판정은 **각자 스코프에서 여전히 유효·재판정 금지**. ★**060 D-2 "스코프를 분리해 둘 다 참으로 만든다"의 두 번째 적용 사례** — 같은 자산이 Part마다 다른 스코프로 평가되는 것은 **모순이 아니라 정상**이며, **어느 판정이 적용되는 스코프를 명시**하는 것이 표준 처리법이다.
★**실재(정직 인정·평가절하 금지)**: ① **DEVICE 레지스트리** `wms_cameras`(tenant·**wh_id**·name·place·**vendor**·**protocol**·host·port·rtsp_port·channel·direct_url·**model**·info_json·active·**source**·**bridge_id**·**test_status**/`test_message`/`last_tested_at` `WmsCctv`:124~151) ② **DEVICE_PROFILE** 벤더별 접속 프로파일(포트·RTSP/스냅샷 템플릿·**ONVIF 표준 포함** `VENDORS`:55~79·`vendors`:350) ③ **Registration/Inventory/Retirement/Remote Diagnostics**(`saveCamera`:384·`listCameras`:364·`deleteCamera`:497·**`testCamera`**:739) ④ **온프렘 브리지** `wms_cctv_bridges`(**pair_code·token_hash·status·agent_version·discovered·last_seen_at**:152~166) ⑤ **Device Provisioning(페어링)**(`tools/cctv-bridge/bridge.js`:92 `/api/wms/cctv/bridge/pair`) ⑥ **Device Authentication(토큰)**(:202) ⑦ **Device Health(heartbeat + version/discovered 보고)**(:200~206·VERSION:36) ⑧ **★Device Discovery — LAN WS-Discovery ONVIF 자동발견**(:21·**명세 §8에 항목이 없으나 실재**) ⑨ **세션/재생토큰 TTL 3600s**(`TOKEN_TTL`:46·`session`:672·`keepalive`:722) ⑩ **★자원 폭주 방어** — 응답 상한 **25MB**(`MAX_BYTES`:47)·**무시청 90초 후 ffmpeg 종료**(`IDLE_KILL`:48) ⑪ **자격 AES-256-GCM 암호화**(`Crypto` 049·274차)·테넌트 격리·전역 writeGuard·**SSRF 이중검증**(274차) ⑫ 스트림 전달(`hls`:811·`localSegment`:883·`segment`:902·`snapshot`:922·`CctvPlayer.jsx`).
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: **IoT 표준 프로토콜 전무**(`mqtt`/`coap`/`lorawan`/`zigbee`/`modbus`/`opcua` **0**) · **Firmware 전 계층**(`firmware` **0**) · **Edge AI Platform 전량**(§9 8항목·`edge_ai`/`edge_inference`/`edge_model`/`edge_node` 0) · **Telemetry Platform 전량**(§10 8항목) · **SENSOR·SENSOR_READING·TELEMETRY·DEVICE_COMMAND·DEVICE_EVENT·DEVICE_POLICY·DEVICE_FIRMWARE·DEVICE_ANALYTICS 엔티티** · **Enterprise Device Registry**(§6 근간) · **IoT Gateway** · **§11 Intelligent Device Analytics 전량**(Predictive Maintenance·Failure Prediction·Asset/Location Analytics) · **§12 IoT Governance 전량** · **Mutual TLS·Secure Boot·Firmware Integrity Validation** · Remote Configuration · **API 6종·Event 8종** · **§17 AI 8종** · 성능 SLA(§18·**"미달"이 아니라 "측정 기반 부재"**).
★**미충족 정직 기술**: §7 "모든 Device는 **Lifecycle 전 과정** 관리" → **6/10 부분**(핵심 4단계 부재) · §9 "Edge 환경은 **네트워크 장애 시에도 독립 동작**" → **릴레이가 끊기면 조회 불가**로 미충족 · §11 "AI는 **장비 이상을 사전에 예측**" → **예측 계층 전무**(`test_status`는 **수동 테스트 결과**) · §13 "모든 Device는 **신뢰 기반 인증**" → 브리지는 토큰이나 **카메라는 평문 프로토콜 자격**·mTLS 부재.
★**오흡수 금지(동음이의 실측 — 광의 히트 대부분 오탐)**: **`iot` 11히트 = `ioTransferDest`(10)·`ioTypeLabel`(10) = `WmsManager.jsx` WMS 입출고 i18n 키 = 완전 오탐**(`ioT`가 단어 안에 우연 포함) · **`edge` 18히트 = `GraphScore` 그래프 엣지(:18·:19·:23·:105·:137·:433) + `WebPush` 브라우저 Edge(:163·:166) + `CctvPlayer.jsx`(:12) = 완전 오탐** · **`sensor` 1히트 = `AIInsights.jsx`(:144) `t('aiInsights.connectedChannels', 'Sensors')` UI 라벨** · **`telemetry` 3히트 = `plans.js`(:7·:156·:207) 주석**(057 확정) · **`provisioning` 2히트 = `AuthPage.jsx`(:444) SCIM SSO 계정 프로비저닝** ≠ Device Provisioning · **`time_series` 1히트 = `PixelTracking`(:879) 픽셀 이벤트 시계열** · **`device` 81히트 대부분 = `Attribution.php`(12) 크로스디바이스 식별(280차)·매뉴얼 템플릿 라벨** ≠ IoT Device · **`tools/cctv-bridge` = 스트림 릴레이 에이전트 ≠ Edge Runtime/추론기** · **영상 스트림 릴레이 ≠ 센서 텔레메트리** · `Wms` 재고 8테이블(060 확정) ≠ Smart Warehouse Device · `SystemMetrics`(057) ≠ Device Monitoring · `connector_health` ≠ Device Health · **`agent_version` ≠ AI Agent**(054 유지) · **비디오월 ≠ Asset Twin**(059 유지).
★**강점 정직 기술(후퇴 금지)**: 명세 §17 "AI는 **승인 없이 Device Firmware를 자동 변경**하거나 **제어 명령을 무단 실행**하지 않는다"는 **현행이 구조적으로 충족** — ⓐ**Firmware 개념 자체가 없다**(변경 대상 부재) ⓑ**제어 명령(DEVICE_COMMAND)이 없다**(조회 전용) ⓒAI가 Device에 접근하는 경로 자체가 없다 ⓓ파괴적 액션은 제안-only+HITL·기본값 approval(054 D-2). 코드 변경 0.

## ★★핵심 설계 제약 9종 (구현 착수 시 필수)
1. **Device 레지스트리 이원화 금지**(D-4) — **`wms_cameras`를 `device_type` 확장으로 일반화**(★058·059·060에 이은 **Registry 부재 4연속**·처방 동일=**기존 위의 얇은 통합 계층**).
2. **온프렘 에이전트 이원화 금지**(D-4) — `cctv-bridge` 재사용. 새 Edge Agent = **현장 설치 부담 + 보안 표면 이중화**.
3. **Device identity는 `api_key` 위에**(D-4) — EPIC 06-A Part3-6 확정·별도 계정 체계 금지·자격은 **`Crypto` Vault**.
4. **관측=`SystemMetrics`·감사=`SecurityAudit`**(D-6) — 별도 수집기 금지·**고빈도 텔레메트리는 앵커링**(체인 직접 유입 금지).
5. **Device Discovery는 기존 WS-Discovery 재사용**(D-5) — **명세 §8에 없으나 실재하는 자산**(명세에 없다고 부재로 기록하면 실재 자산을 잃는다).
6. **지표는 실 heartbeat/`test_status`/`last_seen_at` 파생만 · 산출 불가 시 0이 아니라 null·명시적 사유**(D-7) — ★057·058·059 **3연속 모범** 승계. **본 Part 특히 위험: 장비 헬스 0%를 "정상"으로 오독하면 물리 장애를 은폐**.
7. **Time-Series 도입 시 보존 정책 선행**(§10) — 단일호스트 디스크·CPU 제약(044/045/050)·059 D-5 `po_simulations` 무한 누적 교훈 승계.
8. **★★테넌트 격리 절대 — 본 Part 최고 위험도**(D-6) — 카메라 **자격(user/pass)·현장 IP·창고 배치**가 담겨 교차 노출 시 **물리 보안 침해 직결**(다른 Part의 영업 기밀보다 위험도 높음). 신규 API는 **인증 필수 접두**·`/api` 변형 동시 등재.
9. **★★Execute Device Command·Firmware OTA는 최고 수위 게이트**(D-7) — **물리 제어는 오작동이 물리 세계에 즉시 반영**되므로 058(의사결정)·059(시뮬레이션)·060(프로세스)**보다 더 엄격히**: **승인 정족수 + 킬스위치 + 롤백 경로 + 작업 창(maintenance window)** 함께 설계.
※ **후퇴 금지 자원 통제**: 응답 25MB 상한(:47)·**무시청 90초 ffmpeg 종료**(:48)·재생토큰 TTL(:46) — 특히 `IDLE_KILL` 제거 시 **ffmpeg 프로세스 무한 누적 → 장애 직결**. ※ **Edge 추론은 GPU/연산 인프라 선행 종속**(051)·AI Model Distribution은 **053 Gateway·052 Model Registry 부재 동반 해결** 필요.

## 상속·다음
- **상속**: **051~060 전체** — 특히 **054(`agent_version`≠AI Agent)·059(비디오월≠Asset Twin) 배제 판정 유지** + **051(GPU/클러스터 부재)** + **057(`SystemMetrics` 관측 정본)** + **056(`SecurityAudit` 감사 정본)** + **EPIC 06-A**(`api_key` 비인간 identity) + 헌법 V4/V5 + `CHANGE_GATE` + Security(047~049) + 가용성(044/045/050) + API GW(042).
- **다음**: **MEA Part 062 — Enterprise Blockchain, Distributed Ledger & Smart Contract Architecture**(명세 지정). ★예상 조사 후보=**`SecurityAudit`**(append-only **해시체인**·prev_hash·`verify` — 056 확정 **유일 tamper-evident**)·`menu_audit_log`(★**tamper-evident 아님**·289차 116편 정정 확정)·`Crypto`(049)·`Paddle`(결제). ★**부재 예상은 반드시 grep 부재증명 후 판정**(053 선례). ★오흡수 사전 주의: **`SecurityAudit` 해시체인 ≠ Blockchain/DLT**(단일 노드·합의 없음·불변성은 append-only 코드 규율에 의존) · **`menu_audit_log.hash_chain` ≠ tamper-evident**([[reference_menu_audit_log_not_tamper_evident]] 재오염 금지) · 결제 트랜잭션 ≠ Smart Contract.

## ★AI Platform 진행 (Part 051~061)
051 AI Foundation(PARTIAL) · 052 ML/MLOps(ABSENT-heavy) · 053 GenAI/LLM(PARTIAL·**호출경로 2개 병존**) · 054 AI Agent(**PARTIAL-strong·최고 실재도**) · 055 Knowledge/RAG(weak) · 056 AI Governance(weak·**"규범은 문서에 있고 기계 집행이 없다"**) · 057 AI Observability(weak·**AI 미프로브**) · 058 Decision Intelligence(**PARTIAL**·**"결정 엔진 7개인데 Registry 없음"**) · 059 Digital Twin(weak·**`twin` 단어경계 0**) · 060 Hyperautomation(**PARTIAL**·**"마케팅 자동화는 있고 전사 BPA/RPA는 없음"**) · **061 IoT/Edge AI/Device(★PARTIAL-weak — 카메라 Device 관리·ONVIF 자동발견·자원 통제 실재 / Sensor·Telemetry·Edge AI·Firmware 전무)** → 다음 **062 Blockchain/DLT/Smart Contract**.
★★**Registry 부재 4연속**(058 Decision·059 Twin·060 Automation·**061 Device**)=**같은 구조적 병리**·처방 동일. ★**AI 시리즈 반복 결론**: 053(Gateway 부재)→056(감사 구멍)→057(AI 미프로브)=같은 뿌리·**053 Gateway 일원화가 실 구현 1순위**. ★**정직 미산출 3연속 모범**(057 null·058 `optimized:false`·059 null/422)=**저장소 최강 문화 자산**. ★**스코프 분리 표준 처리법 2연속 적용**(060 D-2 054↔EPIC06-A · 061 D-1 `WmsCctv` 054/059↔061).
