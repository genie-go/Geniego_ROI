# MEA Part 062 — Governance Mechanisms (§7~§17 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★**`SecurityAudit`**(해시체인·`verify`·**056 정본·체인 정본 하나**)·**회계 원장 3종**(청구·구독 이력·정산 대사)·**HMAC 서명**(`ChannelSync`·`NaverSms`·`DataExport`)·`Crypto`(049)·`api_key`(EPIC 06-A)·`SystemMetrics`(057)·`Compliance` SIEM(057)·`index.php` 재사용(★중복 감사 체인·원장·서명·키·identity·관측 신설 절대 금지=헌법 V4)·**블록체인 도메인 전량 순신설**·오흡수 금지·과대주장 금지·**부재 축소 금지**·**★★마케팅 AI/dev AI KEEP_SEPARATE**.
> ★★**본 Part 최대 위험 = 인접 자산을 블록체인으로 오인하는 것**(§9 참조).

## §7 Blockchain Lifecycle 거버넌스
Network Registration→Node Provisioning→Contract Deployment→Transaction Validation→Consensus→Ledger Update→Monitoring→Version Upgrade→Retirement→Archive. 현행=**전무**. ★전 항목 순신설.
★★"모든 Ledger는 **변경 불가능한 기록**을 유지해야 한다" → **미충족**: **회계 원장 3종은 UPDATE 가능**한 일반 테이블이고(청구 `BillingMethod::ledger`:406~407·구독 `UserAuth`:1993/:2039/:2091·정산 `/recon/ledger`), 불변성이 있는 것은 **`security_audit_log` 한 테이블뿐**(`SecurityAudit`:44~52)이며 그마저 **append-only 코드 규율 의존**이다.
★**Node Provisioning은 인프라 선행 종속**: 분산 노드는 **단일호스트 현실**(044/045/050)에서 성립하지 않는다 — **"미구현"이 아니라 "인프라 선행 종속"**(판정 어휘 4종).

## §8 Distributed Ledger 거버넌스
Ledger Management·Transaction Validation·Consensus Management·Block Generation·Block Verification·Distributed Replication·Ledger Synchronization·Ledger Recovery. 현행=**전무**. ★전 항목 순신설.
★★"모든 Ledger는 **분산 저장 구조**를 유지한다" → **단일 MySQL/SQLite·복제 없음** — **"미구현"이 아니라 "선행 개념(분산·합의) 부재"**(059 D-1 어휘 승계).
★**Block Verification 유사가 하나 있다(정직 병기)**: `SecurityAudit::verify`(:55~68)가 **GENESIS부터 `sha256(prev|tenant|actor|action|details|created_at)`를 재계산하고 `hash_equals`로 비교해 파손 지점(broken_at)을 반환**한다. **그러나 이는 블록이 아니라 로그 행 체인**이며 **검증자가 자기 자신(단일 노드)**이다.
★**LEDGER 확장 시 제약**: 회계 원장은 **정산·청구의 SSOT**다. 블록체인 원장을 별도로 만들어 **정산 값이 두 곳에서 갈라지면 즉시 회귀**([[feedback_no_regression_value_unification]]) — 온체인 도입 시 **기존 원장을 정본으로 두고 앵커링(해시만 온체인)**하는 설계가 1순위 검토.

## §9 Smart Contract Platform 거버넌스
Authoring·Deployment·Versioning·Execution·Validation·Upgrade·Monitoring·Analytics. 현행=**전무**(grep 0: `smart_contract`/`solidity`/`evm`(★PM EVM은 오탐)). ★전 항목 순신설.
★★**오흡수 금지(핵심)**: **결제 트랜잭션(`Paddle`)≠Smart Contract** · **`RuleEngine` 임계 규칙(058)≠Contract**(조건→액션이지 온체인 코드 아님) · **`JourneyBuilder` 노드 그래프(054)≠Contract** · **`action_request` 정족수 승인(054/056)≠Multi-sig**.
★"Smart Contract는 **검증 후 운영 환경에 배포**한다" → 도입 시 **058 D-3 Rule Simulation 드라이런 격리**·**056 모델 배포 승인 게이트** 패턴을 승계할 것(중복 게이트 신설 금지).

## §10 Cross-Chain Integration 거버넌스
Gateway·Asset Transfer·Transaction Relay·Interoperability·Chain Discovery·Chain Validation·Monitoring·Analytics. 현행=**전무**. ★**체인이 0개이므로 "이기종 체인 간 상호운용"은 성립 불가**(선행 개념 부재)·전 항목 순신설.

## §11 Digital Asset Management 거버넌스
Asset Registration·Ownership·Tracking·Transfer·Token Lifecycle·Verification·Analytics·Audit. 현행=**전무**. ★전 항목 순신설.
★★**오흡수 금지**: **`MediaHost` content-addressed 저장(sha256·055 확정)**·**`Wms` 재고 8테이블(060)**·**`wms_cameras`(061)**·`CreativeStore` `brand_asset`은 **물리/미디어 자산**이지 **DIGITAL_ASSET(온체인 토큰화 자산)이 아니다**. ★"모든 Digital Asset은 **고유 식별자**를 가진다" → `MediaHost` sha256은 **콘텐츠 해시**(동일 내용=동일 ID)이지 **소유권 식별자가 아니다**(정직 구분).

## §12 Blockchain Governance
Consensus/Smart Contract/Node/Ledger/Identity/Compliance Policy·Security Validation·Audit Trail. 현행=**Audit Trail seed**(`SecurityAudit` 056)·**Compliance seed**(`Compliance` SIEM 057). ★**Policy 객체 6종·Security Validation·Blockchain 전용 Audit Trail**=순신설.
★**정책 원문 재정의 금지**(056 D-1 승계): 헌법 V5·`CHANGE_GATE`가 규범 정본.

## §13 Data Security 거버넌스
Node Authentication·Digital Signature·PKI Integration·Ledger Encryption·Key Management·Audit Logging. 현행=**Digital Signature 유사**(채널 API **HMAC 서명** `ChannelSync` 9히트·`NaverSms` 3·`DataExport` 3·`AdAdapters`·`Alerting` — ★**API 인증 서명**)·**Audit Logging**(`SecurityAudit` 056)·**암호화**(`Crypto` AES-256-GCM 049). ★**Node Authentication·PKI Integration·Ledger Encryption·중앙 KMS**=순신설(grep 0: `pki`/`kms`/`hsm`/`key_management`).
★★"암호키는 **중앙 Key Management System과 연동**하여 관리한다" → **미충족**: `Crypto`는 **애플리케이션 레벨 암호화**이며 **KMS/HSM 연동이 없다**(키가 앱 설정에 상주). ★**PKI/KMS 도입 시 `Crypto`를 대체가 아니라 상위 계층으로 감쌀 것** — **기존 암호문 복호 경로를 파괴하면 자격증명 전량 유실**(무회귀 절대·[[feedback_no_regression_value_unification]]).
★**Node identity는 `api_key` 위에**(EPIC 06-A Part3-6·별도 계정 체계 금지·061 D-4와 동일).
★**원장·감사 데이터는 테넌트 격리 절대**([[reference_platform_growth_actas_tenant_hijack]]) — **정산·청구 금액이 교차 노출되면 재무 기밀 유출**.

## §14 Runtime 규칙 거버넌스
Transaction Validation·Smart Contract 실행·Consensus 수행·Ledger Update·Event 생성·Monitoring·Audit 기록. 현행=**Audit 기록**(`SecurityAudit`)·Monitoring 부분(`SystemMetrics` 057). ★나머지 5종=순신설.
★★**정직 병기(설계 철학 차이)**: `SecurityAudit`은 **감사 실패가 원 액션을 막지 않는 best-effort**(:9)다 — **블록체인의 강제 합의(합의 실패 시 트랜잭션 거부)와 정반대 성격**이며, 이는 **가용성 우선 선택**이지 결함이 아니다. 온체인 도입 시 **이 철학이 충돌**한다는 점을 설계 전제로 명시할 것.
★**성능(§18)**: Transaction Validation ≤500ms·Smart Contract ≤1s·Ledger 조회 ≤300ms·Block 생성 ≤5s·99.99%는 **측정 대상 자체가 없음**(선행 개념 부재). 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).

## §15 API 거버넌스 (8)
Register Blockchain Network·Deploy Smart Contract·Execute Transaction·Query Ledger·Query Digital Asset·Query Blockchain Status·Query Contract Version·Query Blockchain Audit. 현행=**8종 전량 부재**. ★단 **회계 원장 조회 API 실재**(`/v427/billing/ledger` `routes.php`:670~671·:3378 · **`/recon/ledger`** v400~403:1963·:1977·:2008·:2069) — **중앙 원장 조회**이지 체인 조회가 아니다.
★신규 API는 **`/api` 접두 동시 등재**([[reference_api_prefix_routing]]) + **인증 필수 접두**(**원장=재무 기밀**·053 D-5·057 D-7·058 D-6·059 D-6·060·061 승계).

## §16 Event 거버넌스 (8)
BlockchainRegistered·NodeJoined·TransactionCommitted·BlockGenerated·SmartContractExecuted·AssetTransferred·ConsensusCompleted·BlockchainAudited. 현행=**전량 부재**. ★`SecurityAudit` INSERT는 **동기 기록**이지 이벤트 버스가 아니다(오흡수 금지·Part 046/057 정합)·**Event 표준 8종 전부 순신설**.

## §17 AI Integration 거버넌스
Fraud Detection·Smart Contract Verification·Consensus Optimization·Transaction Risk Analysis·Asset Intelligence·Network Health Prediction·Compliance Recommendation·Explainable Trust Analytics. 현행=**전무**(★`Risk`(056)는 **판매자 사업 리스크**·`AnomalyDetection`(046)은 **데이터 이상**이며 **온체인 사기 탐지 아님**). ★전 항목 순신설.
★★명세 §17 말미 **"AI는 승인 없이 Smart Contract를 자동 수정하거나 Ledger 데이터를 변경하지 않는다" → 현행이 구조적으로 충족**: ⓐ**Smart Contract 개념 자체가 없다**(수정 대상 부재) ⓑ**AI가 회계 원장을 쓰는 경로가 없다**(원장은 결제·구독·정산 파이프라인이 기록) ⓒ**`security_audit_log`는 append-only**로 **AI든 사람이든 코드 경로상 UPDATE/DELETE가 없다**(:5) ⓓ파괴적 액션은 **제안-only+HITL**·기본값 **approval**(054 D-2). ★헌법 V5+`CHANGE_GATE`+배포 승인([[feedback_deploy_approval_mandatory]]).
★★**후퇴 금지 + 최고 수위 게이트**: 향후 온체인 도입 시 **원장 쓰기는 승인 게이트 경유 필수**이며, **금전 원장 변경은 물리 제어(061 D-7)와 같은 급의 최고 수위 게이트**를 적용한다 — **승인 정족수 + 킬스위치 + 롤백 경로**. ★특히 **온체인은 롤백이 불가능**하므로(불변성의 이면) **사전 승인이 유일한 방어선**이다.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★**실 인접 자산**=**회계 원장 3종**(청구 `BillingMethod::ledger`:406~407·구독 이력+환불 소급 `UserAuth`:1993/:2039/:2091·정산 대사 `/recon/ledger` v400~403)+**append-only 해시체인+검증기**(`security_audit_log` prev_hash/hash_chain:44~52·**`verify` GENESIS 재계산·`hash_equals`·broken_at**:55~68=**저장소 유일 tamper-evident**·056 확정)+**HMAC API 서명**(`ChannelSync` 9·`NaverSms` 3·`DataExport` 3)+**앱 레벨 암호화**(`Crypto` 049)+결제(`Paddle`)+테넌트 격리·전역 writeGuard·SIEM 포워딩(057)=**후퇴 금지 자산**. ★**블록체인 도메인 전량**(엔티티 13종·**Enterprise Blockchain Registry**·**Distributed Ledger Engine**·**Smart Contract Platform**·**Digital Asset Registry**·**Blockchain Gateway**·**Cross-Chain Integration**·**Distributed Identity**·**Tokenization**·**PKI·KMS/HSM·Node Authentication·Ledger Encryption**·§6~§12 전량·**API 8종·Event 8종·§17 AI 8종**·성능 SLA)**=순신설**(부재·grep 0·**분산 노드는 단일호스트 인프라 선행 종속**·044/045/050). ★★**본 Part의 성격**=**"블록체인이 부실하다"가 아니라 "블록체인 개념이 아예 없고, 겉보기 유사한 중앙집중 인접 자산만 있다"**. ★★**최대 위험=`SecurityAudit` 해시체인을 DLT로 오인**(단일 노드·**합의 없음**·분산 복제 없음·외부 검증자 없음·불변성은 **append-only 코드 규율 의존**으로 **DB 관리자는 UPDATE 가능하고 해시체인은 탐지만 할 뿐 막지 못한다**·**best-effort라 강제 합의와 정반대**). ★★**Registry 부재 5연속**(058 Decision·059 Twin·060 Automation·061 Device·**062 Blockchain**)=**같은 구조적 병리**. ★★**설계 제약**=ⓐ**감사 체인 이원화 금지**(`SecurityAudit` 정본 하나) ⓑ**원장 이원화 금지**(회계 원장=정산 SSOT·**온체인은 해시 앵커링**이 1순위 검토) ⓒ**PKI/KMS는 `Crypto`를 감싸는 상위 계층**(복호 경로 파괴=자격증명 전량 유실) ⓓ**Node identity는 `api_key` 위에** ⓔ**관측=`SystemMetrics`·외부 전달=`Compliance` SIEM** ⓕ**원장·감사는 테넌트 격리 절대**(재무 기밀) ⓖ**온체인 원장 쓰기는 최고 수위 게이트**(★**온체인은 롤백 불가**이므로 **사전 승인이 유일한 방어선**) ⓗ**best-effort 감사 철학 vs 강제 합의 철학의 충돌**을 설계 전제로 명시. ★오흡수 금지(**`evm` 52=PM Earned Value Management 완전 오탐**·**`consensus` 7=어트리뷰션 모델 합의도**·**`wallet` 1=마케팅 카피**·`fabric` 1=텍스트·**`node` 423=`graph_node`/Node.js/DOM**·**`block` 375=`blocked`/`blocking`**·`immutable` 13=JS 불변·플랜 문구·**`ledger` 31=중앙 회계 원장**·**`signature` 84=API HMAC 인증**·`Crypto`≠KMS/HSM/PKI·결제·DB 트랜잭션≠블록체인 TRANSACTION·JWT/API 토큰≠TOKEN·**`MediaHost` sha256/`Wms` 재고/`wms_cameras`=물리·미디어 자산**≠DIGITAL_ASSET·`RuleEngine`/`JourneyBuilder`≠Smart Contract·`action_request` 정족수≠Multi-sig·`Risk`/`AnomalyDetection`≠온체인 사기 탐지·**`menu_audit_log.hash_chain`≠tamper-evident 재오염 금지**). 헌법 Volume 4/5·Part 044/045/047/048/049/**056**/057·EPIC 06-A 상속·**재판정 금지**·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 Smart Contract 자동 수정·Ledger 데이터 변경 불가(V5+CHANGE_GATE).
