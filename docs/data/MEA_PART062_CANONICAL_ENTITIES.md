# MEA Part 062 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★**`SecurityAudit`**(해시체인·`verify`·056 정본)·**회계 원장 3종**·**HMAC 서명**·`Crypto`(049)·`api_key`(EPIC 06-A)·`SystemMetrics`(057)·`Compliance` SIEM 재사용·**블록체인 도메인 전량 순신설**·오흡수 금지·과대주장 금지·**부재 축소 금지**·**★★마케팅 AI/dev AI KEEP_SEPARATE**.
> ★★**본 Part 최대 위험 = 인접 자산을 블록체인으로 오인하는 것**(`SecurityAudit` 해시체인 ≠ DLT).

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | BLOCKCHAIN_NETWORK | **없음** | (grep 0) | ABSENT |
| 2 | BLOCK | **없음**(`block` 375=`blocked`/UI) | (오탐) | ABSENT |
| 3 | TRANSACTION | 결제·DB 트랜잭션(블록체인 아님) | `Paddle`·PDO | ABSENT-formal |
| 4 | **LEDGER** | **회계 원장 3종**(청구·구독 이력·정산 대사) | `BillingMethod::ledger`(:406~407)·`UserAuth`(:1993·:2039·:2091)·`routes.php`(:1963·:1977·:2008·:2069·:670~671) | **PARTIAL-weak(중앙집중)** |
| 5 | SMART_CONTRACT | **없음** | (grep 0) | ABSENT |
| 6 | DIGITAL_ASSET | 물리/미디어 자산만(`Wms`·`MediaHost`·060/061) | (오흡수 금지) | ABSENT |
| 7 | TOKEN | JWT·`api_key`·재생/pair 토큰(인증) | (053/061 확정) | ABSENT-formal |
| 8 | CONSENSUS_POLICY | **없음**(`consensus` 7=모델 합의도) | `AttributionEngine`(:1560·:1575·오탐) | ABSENT |
| 9 | NODE | **없음**(`node` 423=`graph_node`/Node.js/DOM) | (오탐) | ABSENT |
| 10 | VALIDATOR | 없음 | (grep 0) | ABSENT |
| 11 | CHAIN_EVENT | 없음 | (grep 0) | ABSENT |
| 12 | CROSS_CHAIN_TRANSACTION | 없음 | (grep 0) | ABSENT |
| 13 | BLOCKCHAIN_POLICY | 없음 | (grep 0) | ABSENT |
| 14 | BLOCKCHAIN_ANALYTICS | 없음 | (grep 0) | ABSENT |
| 15 | **BLOCKCHAIN_AUDIT** | **append-only 해시체인 + 검증기**(★**단일 노드**) | `SecurityAudit`(:44~52·**`verify`:55~68**) | **PARTIAL-weak(중앙집중)** |

## §6~§17 표준 판정
- **§6 Domain(10)**: ★**전 항목 ABSENT**(Supply Chain Ledger·Logistics Ledger·Financial Settlement(블록체인)·Smart Contract·Digital Asset·**Distributed Identity**·**Tokenization**·**Cross-Chain**·Enterprise Trust Network·Enterprise Blockchain). ★★"모든 Blockchain 자산은 **Enterprise Blockchain Registry**를 기준으로 관리" → **Registry 자체 부재**(★**058 Decision·059 Twin·060 Automation·061 Device에 이은 Registry 부재 5연속**·**같은 구조적 병리**). ★단 **회계 원장(청구·구독·정산 대사)은 중앙집중으로 실재**하므로 "Financial Settlement 데이터 자체가 없다"는 아니다(정직 병기).
- **§7 Lifecycle(10)**: ★**전 항목 ABSENT**(Network Registration·Node Provisioning·Contract Deployment·Transaction Validation·**Consensus**·Ledger Update(분산)·Monitoring(체인)·Version Upgrade·Retirement·Archive). ★★"모든 Ledger는 **변경 불가능한 기록**을 유지해야 한다" → **미충족**: **회계 원장은 UPDATE 가능**하고, 불변성이 있는 것은 **`security_audit_log` 한 테이블뿐**이며 그마저 **append-only 코드 규율 의존**이다(§D-1).
- **§8 Distributed Ledger(8)**: ★**전 항목 ABSENT**(Ledger Management(분산)·Transaction Validation·**Consensus Management**·**Block Generation**·**Block Verification**·**Distributed Replication**·**Ledger Synchronization**·Ledger Recovery). ★★"모든 Ledger는 **분산 저장 구조**를 유지한다" → **단일 MySQL/SQLite·복제 없음**(044/045/050 단일호스트 승계) — **"미구현"이 아니라 "선행 개념(분산·합의) 부재"**(059 D-1 어휘). ★**Block Verification 유사**는 `SecurityAudit::verify`(:55~68)가 유일하나 **블록이 아니라 로그 행 체인**이다.
- **§9 Smart Contract Platform(8)**: ★**전 항목 ABSENT**(Authoring·Deployment·**Versioning**·Execution·Validation·Upgrade·Monitoring·Analytics). ★오흡수 금지: **결제 트랜잭션(`Paddle`)≠Smart Contract** · **`RuleEngine` 임계 규칙(058)≠Contract** · **`JourneyBuilder` 노드 그래프(054)≠Contract**.
- **§10 Cross-Chain Integration(8)**: ★**전 항목 ABSENT**(Gateway·Asset Transfer·Transaction Relay·Interoperability·Chain Discovery·Chain Validation·Monitoring·Analytics). ★체인이 0개이므로 **"이기종 체인 간 상호운용"은 성립 불가**.
- **§11 Digital Asset Management(8)**: ★**전 항목 ABSENT**(Asset Registration·Ownership·Tracking·Transfer·**Token Lifecycle**·Verification·Analytics·Audit). ★★**오흡수 금지**: `MediaHost` **content-addressed 자산**(055 확정 sha256)·`Wms` 재고(060)·`wms_cameras`(061)는 **물리/미디어 자산**이지 **DIGITAL_ASSET(온체인 토큰화 자산)이 아니다**. ★"모든 Digital Asset은 **고유 식별자**를 가진다" → `MediaHost` sha256은 **콘텐츠 해시**이지 소유권 식별자가 아니다(정직 구분).
- **§12 Blockchain Governance(8)**: ★**전 항목 ABSENT**(Consensus/Smart Contract/Node/Ledger/Identity/Compliance **Policy 객체**·Security Validation·Audit Trail 전용). ★단 **Audit Trail seed 실재**(`SecurityAudit` 056)·**Compliance seed**(`Compliance` SIEM 057).
- **§13 Security(6)**: 실재=**Digital Signature 유사**(채널 API **HMAC 서명** `ChannelSync` 9·`NaverSms` 3·`DataExport` 3·`AdAdapters`·`Alerting` — ★**API 인증 서명**)·**Audit Logging**(`SecurityAudit` 056)·암호화(`Crypto` AES-256-GCM 049). ★**Node Authentication**·**PKI Integration**·**Ledger Encryption**·**중앙 KMS**=ABSENT(grep 0: `pki`/`kms`/`hsm`/`key_management`). ★★"암호키는 **중앙 Key Management System과 연동**하여 관리한다" → **미충족**: `Crypto`는 **애플리케이션 레벨 암호화**이며 **KMS/HSM 연동이 없다**. ★PKI/KMS 도입 시 **`Crypto`를 대체가 아니라 상위 계층으로 감쌀 것**(기존 암호문 복호 경로 파괴 금지=무회귀).
- **§14 Runtime 규칙(7)**: 실재=**Audit 기록**(`SecurityAudit`)·Monitoring 부분(`SystemMetrics` 057). ★**Transaction Validation·Smart Contract 실행·Consensus 수행·Ledger Update(분산)·Event 생성**=ABSENT. ★★**정직 병기**: `SecurityAudit`은 **감사 실패가 원 액션을 막지 않는 best-effort**(:9)다 — **블록체인의 강제 합의(합의 실패 시 트랜잭션 거부)와 정반대 성격**이며, 이 설계 차이는 **가용성 우선 선택**이지 결함이 아니다.
- **§15 API(8)**: ★**8종 전량 ABSENT**(Register Blockchain Network·Deploy Smart Contract·Execute Transaction·Query Ledger(체인)·Query Digital Asset·Query Blockchain Status·Query Contract Version·Query Blockchain Audit). ★단 **회계 원장 조회 API 실재**(`/v427/billing/ledger` `routes.php`:670~671·`/recon/ledger` v400~403:1963·:1977·:2008·:2069) — **중앙 원장 조회**이지 체인 조회가 아니다. ★순신설 시 **`/api` 접두 동시 등재**[[reference_api_prefix_routing]]·**인증 필수 접두**(원장=재무 기밀).
- **§16 Event(8)**: ★**8종 전량 ABSENT**(BlockchainRegistered·NodeJoined·TransactionCommitted·BlockGenerated·SmartContractExecuted·AssetTransferred·ConsensusCompleted·BlockchainAudited). ★`SecurityAudit` INSERT는 **동기 기록**이지 이벤트 버스가 아니다(오흡수 금지·Part 046/057 정합).
- **§17 AI Integration(8)**: ★**전 항목 ABSENT**(Fraud Detection(블록체인)·Smart Contract Verification·Consensus Optimization·Transaction Risk Analysis·Asset Intelligence·Network Health Prediction·Compliance Recommendation·Explainable Trust Analytics). ★★명세 §17 말미 **"AI는 승인 없이 Smart Contract를 자동 수정하거나 Ledger 데이터를 변경하지 않는다"** → **현행이 구조적으로 충족**: ⓐ**Smart Contract 개념 자체가 없다**(수정 대상 부재) ⓑ**AI가 회계 원장을 쓰는 경로가 없다**(원장은 결제·구독·정산 파이프라인이 기록) ⓒ**`security_audit_log`는 append-only**로 AI든 사람이든 **코드 경로상 UPDATE/DELETE가 없다**(:5) ⓓ파괴적 액션은 **제안-only+HITL**·기본값 approval(054 D-2). ★헌법 V5+`CHANGE_GATE`. **★후퇴 금지 자산** — 향후 온체인 도입 시 **원장 쓰기는 승인 게이트 경유 필수**이며, **금전 원장 변경은 물리 제어(061)와 같은 급의 최고 수위 게이트**를 적용할 것.

## 판정
**ABSENT-heavy (Canonical Entity 15종 중 13종 완전 부재 / ★LEDGER·BLOCKCHAIN_AUDIT만 중앙집중 인접 자산으로 PARTIAL-weak).** 코드 0.
★**실 자산(정직 인정·평가절하 금지 — 단 전부 "중앙집중 인접 자산")**: ① **회계 원장 3종** — 청구(`BillingMethod::ledger`:406~407)·구독 이력+환불 1개월 소급 차감(`UserAuth`:1993·:2039·:2091)·정산 대사(`/recon/ledger` v400~403 `routes.php`:1963·:1977·:2008·:2069) ② **append-only 해시체인 + 검증기** — `security_audit_log`(**prev_hash CHAR(64)·hash_chain CHAR(64)** `SecurityAudit`:44~52)·**`verify`가 GENESIS부터 `sha256(prev|tenant|actor|action|details|created_at)` 재계산·`hash_equals` 비교·broken_at 반환**(:55~68)=**저장소 유일 tamper-evident**(056 확정) ③ **HMAC API 서명**(`ChannelSync` 9·`NaverSms` 3·`DataExport` 3·`AdAdapters`·`Alerting`) ④ **애플리케이션 레벨 암호화**(`Crypto` AES-256-GCM 049) ⑤ 결제(`Paddle`)·테넌트 격리·전역 writeGuard·SIEM 포워딩(057).
★**부재(grep 0·부재증명 완료·축소 금지)**: **블록체인 도메인 전량** — 엔티티 13종·**Enterprise Blockchain Registry**·**§6 Domain 10종·§7 Lifecycle 10종·§8 Distributed Ledger 8종·§9 Smart Contract 8종·§10 Cross-Chain 8종·§11 Digital Asset 8종·§12 Governance 8종·§14 Runtime 5종·§15 API 8종·§16 Event 8종·§17 AI 8종**·**PKI·KMS/HSM·Node Authentication·Ledger Encryption**·성능 SLA.
★★**핵심 판별(본 Part 최대 오흡수 위험)**: **`SecurityAudit` 해시체인은 Blockchain/DLT가 아니다** — ⓐ**단일 노드**(단일 테이블) ⓑ**합의 없음** ⓒ**분산 복제 없음** ⓓ**외부 검증자 없음** ⓔ불변성은 **append-only 코드 규율**에 의존(**DB 관리자는 여전히 UPDATE 가능하고 해시체인은 그것을 탐지할 뿐 막지 못한다**) ⓕ**best-effort**(감사 실패가 원 액션을 막지 않음:9)라 **블록체인의 강제 합의와 정반대**. 따라서 §7 "변경 불가능한 기록"·§8 "분산 저장 구조"는 **미충족**이며 **"미구현"이 아니라 "선행 개념(분산·합의) 부재"**다.
★**오흡수 금지**: **`evm` 52히트=PM Earned Value Management**(`PMPortfolio.jsx`·`PM/Enterprise.php`·`PMEvm.jsx`·`pmApi.js`)**≠Ethereum Virtual Machine·완전 오탐** · **`consensus` 7히트=어트리뷰션 모델 합의도**(`AttributionEngine`:1560·:1575)**≠블록체인 합의** · **`wallet` 1히트=`Landing.jsx`(:153) 마케팅 카피** · `fabric` 1=텍스트 · **`node` 423=`graph_node`(055)/Node.js/DOM** · **`block` 375=`blocked`/`blocking`** · `immutable` 13=JS 불변·플랜 문구 · **`ledger` 31=중앙 회계 원장**(분산 원장 아님) · **`signature` 84=API HMAC 인증 서명** · `Crypto`=**앱 레벨 암호화**≠KMS/HSM/PKI · 결제·DB 트랜잭션≠블록체인 TRANSACTION · JWT/API/재생 토큰≠TOKEN · **`MediaHost` sha256 content-addressed(055)·`Wms` 재고(060)·`wms_cameras`(061)=물리/미디어 자산**≠DIGITAL_ASSET · **`menu_audit_log.hash_chain`≠tamper-evident**([[reference_menu_audit_log_not_tamper_evident]] **재오염 금지**·본 Part는 해시체인 주제라 **재오염 위험 최고**).
`SecurityAudit`/회계 원장 3종/`ChannelSync` HMAC/`Crypto`/`api_key`/`SystemMetrics`/`Compliance`/`index.php` 재사용(★중복 감사 체인·원장·서명·키·identity·관측 신설 절대 금지=헌법 V4)·★★마케팅 AI/dev AI KEEP_SEPARATE·Part 044/045/047/048/049/**056**/057·EPIC 06-A 상속·**재판정 금지**·★AI의 Smart Contract 자동 수정·Ledger 데이터 변경 불가(V5+CHANGE_GATE).
