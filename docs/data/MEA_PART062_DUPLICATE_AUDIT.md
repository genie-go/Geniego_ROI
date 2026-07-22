# MEA Part 062 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Blockchain/DLT/Smart Contract 계층 신설이 기존 **`SecurityAudit`**(해시체인·유일 tamper-evident)·**회계 원장 3종**(`BillingMethod::ledger`·`UserAuth` 구독 이력·`/recon/ledger`)·**HMAC 서명**(`ChannelSync`·`NaverSms`·`DataExport`)·`Crypto`(049)·`Paddle`(결제)·`Compliance`(SIEM)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★★**본 Part 최대 위험은 "중복 신설"이 아니라 "인접 자산을 블록체인으로 오인하는 것"**이다(§D-1).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **감사 해시체인(유일 tamper-evident)** | ★**MEA Part 056**(`SecurityAudit::verify`) | ★**재정의 금지·재판정 금지**(★단 **DLT 아님**·D-1) |
| **`menu_audit_log`는 tamper-evident 아님** | ★[[reference_menu_audit_log_not_tamper_evident]](289차 116편 정정) | ★**재오염 금지** |
| 감사 체인 앵커링 규율 | ★MEA Part 057 D-4·058 D-6·059 D-6·060·061 | ★재정의 금지(고빈도 로그 직접 유입 금지) |
| 자격 암호화 | ★MEA Part 049(`Crypto` AES-256-GCM) | ★재정의 금지·재사용(★**KMS 아님**) |
| SIEM 외부 전달 | ★MEA Part 057(`Compliance` 포워더 정본) | ★재정의 금지 |
| 비인간 identity | ★EPIC 06-A Part3-6(`api_key` 유일) | ★재정의 금지(Node identity는 그 위에) |
| 테넌트·RBAC | ★MEA Part 047/048 | ★재정의 금지·재사용 |
| 가용성·SLA·단일호스트 | ★MEA Part 044/045/050 | ★재정의 금지(**분산 노드=인프라 선행 종속**) |
| 결제·구독 | ★224/263차 Paddle | ★재정의 금지(★결제≠Smart Contract) |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★본 Part는 오탐 비율 최고)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| **LEDGER** | 청구 원장 | `BillingMethod::ledger`(:406~407)·`routes.php`(:670~671) | ★재사용·★**오흡수 금지**(중앙 회계 원장≠분산 원장) |
| LEDGER(구독) | 구독 이력+환불 소급 | `UserAuth`(:1993·:2039·:2091) | ★재사용·오흡수 금지 |
| LEDGER(정산) | `/recon/ledger` v400~403 | `routes.php`(:1963·:1977·:2008·:2069) | ★재사용·오흡수 금지 |
| **BLOCKCHAIN_AUDIT / 불변성** | append-only 해시체인+검증기 | `SecurityAudit`(:44~52·**`verify`:55~68**) | ★**재사용(정본)**·★★**오흡수 금지**(**단일 노드·합의 없음**) |
| tamper-evident(가짜) | `menu_audit_log.hash_chain` | ([[reference_menu_audit_log_not_tamper_evident]]) | ★**재오염 금지**(verify 0·검증 불가능한 장식) |
| **Digital Signature** | 채널 API **HMAC 서명** | `ChannelSync`(9)·`NaverSms`(3)·`DataExport`(3)·`AdAdapters`·`Alerting` | ★재사용·★**오흡수 금지**(API 인증≠블록체인 서명) |
| **Key Management** | `Crypto` AES-256-GCM | (049) | ★재사용·★**오흡수 금지**(앱 레벨 암호화≠KMS/HSM/PKI) |
| TRANSACTION | 결제(Paddle)·DB 트랜잭션 | (224/263차)·PDO | ★**오흡수 금지** |
| TOKEN | JWT·`api_key`·재생토큰·pair 토큰 | (053/061 확정) | ★**오흡수 금지**(인증 토큰≠블록체인 TOKEN) |
| **NODE** | `graph_node`(마케팅 기여도·055)·Node.js·DOM node | (`node` 423히트) | ★**완전 오흡수 금지** |
| **BLOCK** | `blocked`/`blocking`/UI 블록 | (`block` 375히트) | ★**완전 오흡수 금지** |
| **EVM** | **PM Earned Value Management** | `PMPortfolio.jsx`·`PM/Enterprise.php`·`PMEvm.jsx`·`pmApi.js` | ★**완전 오탐**(≠Ethereum VM) |
| **CONSENSUS** | **어트리뷰션 모델 합의도**(6개 모델 share 동의도 %) | `AttributionEngine`(:1560·:1575)·`Attribution.jsx`(:1187·:1200·:1277) | ★**완전 오흡수 금지** |
| Wallet | 마케팅 카피 "From warehouse to wallet" | `Landing.jsx`(:153) | ★**완전 오탐** |
| Immutable | JS 불변 객체·플랜 문구 | `plans.js`·`MediaHost`·`Decisioning`·`PlanPricing` | ★오흡수 금지 |
| Fabric | 텍스트 | (1히트) | ★오탐(≠Hyperledger Fabric) |
| Asset Tracking | 창고 재고·자산(`Wms`·`MediaHost`) | (060/061 확정) | ★오흡수 금지(물리 자산≠DIGITAL_ASSET) |
| Ledger Monitoring | 플랫폼 메트릭 | `SystemMetrics`(057 정본) | ★재사용(중복 수집기 금지) |

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **감사 체인 이원화 금지**: BLOCKCHAIN_AUDIT을 새 해시체인으로 만들면 `SecurityAudit`와 **두 개의 진실**. **체인 정본은 하나**([[reference_menu_audit_log_not_tamper_evident]]·056 D-3·057~061 승계).
2. **원장 이원화 금지**: LEDGER는 **기존 회계 원장 3종**(청구·구독·정산 대사)이 정본. 블록체인 원장을 별도로 만들면 **정산 값이 두 곳에서 갈라진다**(값 분산=회귀·[[feedback_no_regression_value_unification]]).
3. **서명·키 이원화 금지**: 서명은 `ChannelSync` HMAC 패턴, 키는 `Crypto`(049)가 정본. **PKI/KMS 도입 시 `Crypto`를 대체가 아니라 상위 계층으로 감쌀 것**(기존 암호문 복호 경로 파괴 금지=무회귀).
4. **identity 이원화 금지**: Node identity는 **`api_key` 위에**(EPIC 06-A Part3-6·별도 계정 체계 금지·061 D-4와 동일).
5. **관측·SIEM 이원화 금지**: Ledger Monitoring=`SystemMetrics`(057 D-1)·외부 전달=`Compliance` SIEM(057 D-3).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. **블록체인 자산은 없으나 감사 체인·회계 원장·서명·암호화가 실재** → **중복 신설 금지·기존 심화**. 헌법 V4.
- ★★[[feedback_competitive_gap_verify]]: **부재증명이 명확한 만큼 과대주장 유혹도 크다** — `SecurityAudit` 해시체인을 "블록체인급 불변성"으로 기술하면 **명백한 과대주장**이다(단일 노드·합의 없음·DB 관리자 UPDATE 가능·해시체인은 **탐지만** 한다). **동시에 실재분(검증기 `verify`·회계 원장 3종·HMAC 서명)을 부재로 뭉뚱그리는 것도 금지**.
- ★[[feedback_no_regression_value_unification]]: **회계 원장 값은 정산·청구의 SSOT**다. 블록체인 원장 도입이 **정산 값을 이원화하면 즉시 회귀**.
- ★[[reference_menu_audit_log_not_tamper_evident]]: **`menu_audit_log.hash_chain`을 tamper-evident로 재오염시키지 말 것**(289차 116편 정정 확정). 본 Part는 **해시체인 주제이므로 재오염 위험이 가장 높다**.
- ★[[feedback_minimize_new_menus]]: Ledger Monitoring Dashboard는 신규 사이드바가 아니라 **기존 정산/청구 메뉴**(`/recon`·`/v427/billing`) 편입 우선.
- ★[[feedback_real_value_autoderive]]: Ledger Analytics 지표는 **실 원장 파생만**(`billing ledger`·`recon ledger`·`security_audit_log`). ★**산출 불가 시 0이 아니라 null·명시적 사유**(057·058·059 **3연속 모범** 승계).
- ★[[reference_platform_growth_actas_tenant_hijack]]: 원장·감사 데이터는 **테넌트 격리 절대**(정산·청구 금액이 교차 노출되면 재무 기밀).
- ★[[reference_api_prefix_routing]]: 신규 Blockchain API는 `/api` 접두 동시 등재 + **인증 필수 접두**.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 없이 Smart Contract를 자동 수정하거나 Ledger 데이터를 변경 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: BLOCKCHAIN_AUDIT seed=**`SecurityAudit` 해시체인**(체인 정본 하나) · LEDGER seed=**회계 원장 3종**(청구·구독·정산 대사) · Digital Signature seed=**HMAC 서명 패턴**(`ChannelSync`) · Key Management seed=**`Crypto`**(049·PKI/KMS는 상위 계층으로 감쌈) · Node identity=**`api_key`**(EPIC 06-A) · Monitoring=`SystemMetrics`(057) · 외부 전달=`Compliance` SIEM(057) · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★**Blockchain 도메인 전량** — BLOCKCHAIN_NETWORK·BLOCK·SMART_CONTRACT·DIGITAL_ASSET·TOKEN·CONSENSUS_POLICY·NODE·VALIDATOR·CHAIN_EVENT·CROSS_CHAIN_TRANSACTION·BLOCKCHAIN_POLICY/ANALYTICS/AUDIT **엔티티 13종**·**Enterprise Blockchain Registry**·**Distributed Ledger Engine**(합의·블록 생성/검증·분산 복제·동기화·복구)·**Smart Contract Platform**(작성·배포·버저닝·실행·검증·업그레이드·모니터링·분석)·**Digital Asset Registry**(등록·소유권·추적·이전·**Token Lifecycle**·검증)·**Blockchain Gateway**·**Cross-Chain Integration**·**Distributed Identity**·**Tokenization**·**PKI·KMS/HSM·Node Authentication·Ledger Encryption**·**API 8종·Event 8종**·**§17 AI 8종**.

## 판정
**중복 위험 低(블록체인 자산 자체가 없어 중복할 대상이 없음) / ★★대신 "인접 자산 오인 위험"이 최고**. ★핵심=**`SecurityAudit`**(해시체인+`verify`·**체인 정본 하나**)·**회계 원장 3종**(`BillingMethod::ledger`·`UserAuth` 구독 이력·`/recon/ledger`)·**HMAC 서명**(`ChannelSync`·`NaverSms`·`DataExport`)·`Crypto`(049)·`api_key`(EPIC 06-A)·`SystemMetrics`(057)·`Compliance` SIEM(057)·`index.php`는 **재사용/승격**(★중복 감사 체인·원장·서명·키·identity·관측 신설 절대 금지=헌법 V4). 헌법 V4/V5·Part 044/045/047/048/049/**056**/057·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=**블록체인 도메인 전량**(엔티티 13종·Registry·DLT Engine·Smart Contract Platform·Digital Asset Registry·Gateway·Cross-Chain·Distributed Identity·Tokenization·PKI/KMS·API 8종·Event 8종·§17 AI 8종). ★★**본 Part의 성격**=**"블록체인이 부실하다"가 아니라 "블록체인 개념이 아예 없고, 겉보기 유사한 중앙집중 인접 자산만 있다"**. ★★**최대 위험=`SecurityAudit` 해시체인을 DLT로 오인하는 것** — **단일 노드·합의 없음·분산 복제 없음·외부 검증자 없음·불변성은 append-only 코드 규율 의존(DB 관리자는 UPDATE 가능하고 해시체인은 그것을 탐지할 뿐 막지 못한다)·감사 실패가 원 액션을 막지 않는 best-effort로 블록체인의 강제 합의와 정반대**. ★오흡수 금지(**`evm` 52=PM Earned Value Management 완전 오탐** · **`consensus` 7=어트리뷰션 모델 합의도** · **`wallet` 1=마케팅 카피** · `fabric` 1=텍스트 · **`node` 423=`graph_node`/Node.js/DOM** · **`block` 375=`blocked`/`blocking`** · `immutable` 13=JS 불변 객체·플랜 문구 · **`ledger` 31=중앙 회계 원장** · **`signature` 84=API HMAC 인증 서명** · `Crypto`=앱 레벨 암호화≠KMS/HSM/PKI · 결제·DB 트랜잭션≠블록체인 TRANSACTION · JWT/API 토큰≠TOKEN · 물리 자산(`Wms`/`MediaHost`)≠DIGITAL_ASSET · **`menu_audit_log.hash_chain`≠tamper-evident 재오염 금지**). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 Smart Contract 자동 수정·Ledger 데이터 변경 불가(V5+CHANGE_GATE).
