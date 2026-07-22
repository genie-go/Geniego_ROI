# ADR — MEA Part 062 Enterprise Blockchain, Distributed Ledger & Smart Contract Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` + 광의 히트 파일 단위 전수 분류**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 056 판정 상속·재판정 금지**(`SecurityAudit`=저장소 유일 tamper-evident) — **★단, 그것이 DLT라는 뜻은 아니다**(D-1).

## Context
MEA Part 062는 거래·공급망·물류 추적·계약·정산·디지털 자산을 블록체인/DLT/스마트컨트랙트로 신뢰 기반 교환하려 한다. 전수조사 결과:
① **블록체인 도메인은 단어 자체가 없다** — `blockchain`·`smart_contract`·`distributed_ledger`·`web3`·`ethereum`·`solidity`·`hyperledger`·`corda`·`merkle`·`nft`·`erc20/721`·`validator`·`cross_chain`·`pki`·`kms`·`hsm`·`key_management` **전부 0**.
② **겉보기 유사한 중앙집중 인접 자산이 있다** — **회계 원장 3종**(청구 `BillingMethod::ledger`:406~407·구독 이력+환불 소급 `UserAuth`:1993/:2039/:2091·정산 대사 `/recon/ledger` v400~403 `routes.php`:1963/:1977/:2008/:2069)·**append-only 해시체인+검증기**(`security_audit_log` prev_hash/hash_chain `SecurityAudit`:44~52·**`verify`:55~68**)·**HMAC API 서명**(`ChannelSync` 9·`NaverSms` 3·`DataExport` 3)·**앱 레벨 암호화**(`Crypto` 049)·결제(`Paddle`).
③ **광의 히트는 전량 오탐이었다** — `evm` 52=**PM Earned Value Management** · `consensus` 7=**어트리뷰션 모델 합의도** · `wallet` 1=**마케팅 카피** · `node` 423=**`graph_node`/Node.js/DOM** · `block` 375=**`blocked`/`blocking`**.

## D-1 ★★최대 결정 — `SecurityAudit` 해시체인은 Blockchain/DLT가 아니다
**결정**: 본 Part의 최대 위험은 "중복 신설"이 아니라 **인접 자산을 블록체인으로 오인하는 것**이다. `SecurityAudit`은 **append-only + prev_hash 해시체인 + `verify()`**(GENESIS부터 `sha256(prev|tenant|actor|action|details|created_at)` 재계산·`hash_equals` 비교·broken_at 반환:55~68)를 갖춘 **저장소 유일 tamper-evident 감사**(056 확정)다.
★**그러나 DLT가 아니다**: ⓐ**단일 노드**(단일 MySQL/SQLite 테이블) ⓑ**합의(consensus) 없음** ⓒ**분산 복제 없음** ⓓ**외부 검증자 없음** ⓔ**불변성은 append-only 코드 규율에 의존** — **DB 관리자는 여전히 UPDATE 가능하고, 해시체인은 그것을 탐지할 뿐 막지 못한다** ⓕ**best-effort**(감사 실패가 원 액션을 막지 않음 `SecurityAudit`:9)라 **블록체인의 강제 합의(합의 실패 시 트랜잭션 거부)와 정반대 성격**.
★따라서 §7 "모든 Ledger는 **변경 불가능한 기록**을 유지해야 한다"·§8 "모든 Ledger는 **분산 저장 구조**를 유지한다"는 **미충족**이며, 이는 **"미구현"이 아니라 "선행 개념(분산·합의) 부재"**다(059 D-1 판정 어휘 승계).
★**동시에 부재 축소도 금지**: `verify()`는 **실제로 동작하는 검증기**이고 회계 원장 3종은 **실 정산 SSOT**다 — 블록체인 부재로 **뭉뚱그려 감점하지 않는다**([[feedback_competitive_gap_verify]]).
★★**`menu_audit_log.hash_chain`은 tamper-evident가 아니다**([[reference_menu_audit_log_not_tamper_evident]]·289차 116편 정정 확정) — **본 Part는 해시체인이 주제라 재오염 위험이 가장 높다. 재오염 절대 금지.**

## D-2 ★광의 히트 전량 오탐 — 파일 단위 전수 분류가 필수였다
**결정**: 본 Part는 **광의 히트의 오탐 비율이 가장 높았다**. `evm` 52히트는 **PM Earned Value Management**(`PMPortfolio.jsx`·`PM/Enterprise.php`·`PMEvm.jsx`·`pmApi.js`)이지 **Ethereum Virtual Machine이 아니고**, `consensus` 7히트는 **어트리뷰션 모델 합의도**(6개 모델이 한 채널 share에 얼마나 동의하는지 % — `AttributionEngine`:1560·:1575)이지 **블록체인 합의 알고리즘이 아니다**. `wallet` 1히트는 `Landing.jsx`(:153) **마케팅 카피 "From warehouse to wallet"**이다.
★**단어경계만으로는 부족했고 파일 단위 전수 분류가 결정적이었다** — 059·060·061에서 확립한 규율이 본 Part에서 가장 큰 효과를 냈다.

## D-3 ★원장 이원화 금지 — 온체인은 "해시 앵커링"이 1순위 검토
**결정**: 회계 원장 3종은 **정산·청구의 SSOT**다. 블록체인 원장을 별도로 만들어 **정산 값이 두 곳에서 갈라지면 즉시 회귀**다([[feedback_no_regression_value_unification]]).
★**온체인 도입 시 1순위 검토 설계**: **기존 원장을 정본으로 두고 해시만 온체인에 앵커링**한다(전체 원장 이관이 아니라). 이는 057~061에서 반복 확립한 **"고빈도 로그는 체인에 직접 넣지 말고 앵커링"** 규율과 같은 형태다.
★**감사 체인 이원화 금지**: BLOCKCHAIN_AUDIT을 새 해시체인으로 만들면 `SecurityAudit`와 두 개의 진실. **체인 정본은 하나**(056 D-3·057 D-4·058 D-6·059 D-6·060·061 승계).

## D-4 ★PKI/KMS는 `Crypto`를 대체가 아니라 감싸는 상위 계층
**결정**: 명세 §13 "암호키는 **중앙 Key Management System과 연동**하여 관리한다"는 **미충족**이다 — `Crypto`(049)는 **애플리케이션 레벨 AES-256-GCM 암호화**이며 **KMS/HSM 연동이 없다**(키가 앱 설정에 상주·grep 0: `pki`/`kms`/`hsm`/`key_management`).
★**PKI/KMS 도입 시 `Crypto`를 대체하지 말고 상위 계층으로 감쌀 것** — **기존 암호문 복호 경로를 파괴하면 자격증명(채널 API 키·카메라 자격·SIEM 토큰)이 전량 유실**된다. 무회귀 절대.
★**Node identity는 `api_key` 위에**(EPIC 06-A Part3-6 확정·별도 계정 체계 신설 금지·061 D-4와 동일 원칙).
★**Digital Signature 구분**: 실재하는 HMAC 서명(`ChannelSync` 9·`NaverSms` 3·`DataExport` 3·`AdAdapters`·`Alerting`)은 **API 인증 서명**이지 **블록체인 디지털 서명(비대칭 키·소유권 증명)이 아니다**.

## D-5 ★DIGITAL_ASSET 오흡수 금지 — 물리/미디어 자산은 온체인 자산이 아니다
**결정**: `MediaHost` **content-addressed 저장**(sha256·055 확정)·`Wms` 재고 8테이블(060)·`wms_cameras`(061)·`CreativeStore` `brand_asset`은 **물리/미디어 자산**이지 **DIGITAL_ASSET(온체인 토큰화 자산)이 아니다**.
★§11 "모든 Digital Asset은 **고유 식별자**를 가진다" → `MediaHost` sha256은 **콘텐츠 해시**(동일 내용=동일 ID)이지 **소유권 식별자가 아니다**(정직 구분).
★**Smart Contract 오흡수 금지**: 결제 트랜잭션(`Paddle`)·`RuleEngine` 임계 규칙(058)·`JourneyBuilder` 노드 그래프(054)·`action_request` 정족수(054/056)는 **각각 결제·규칙·워크플로·승인**이지 **온체인 코드가 아니다**(정족수는 Multi-sig가 아니다).

## D-6 ★Registry 부재 5연속 — 같은 구조적 병리
**결정**: §6 "모든 Blockchain 자산은 **Enterprise Blockchain Registry**를 기준으로 관리"는 **Registry 부재**로 미충족이다. ★이는 **058 Decision Registry · 059 Twin Registry · 060 Automation Registry · 061 Device Registry에 이은 5연속 동일 병리**다.
★단 본 Part는 앞의 넷과 다르다 — **058~061은 "엔진은 있는데 Registry가 없다"였으나, 062는 "엔진 자체가 없다"**. 따라서 처방도 다르다: 앞의 넷은 **기존 위의 얇은 통합 계층**이지만 **062는 전면 순신설**이며, **인프라(분산 노드)가 선행 종속**이다(044/045/050 단일호스트).
★**원장·감사 데이터는 테넌트 격리 절대**([[reference_platform_growth_actas_tenant_hijack]]) — **정산·청구 금액이 교차 노출되면 재무 기밀 유출**.

## D-7 ★Ledger 자동 변경 금지는 현행이 구조적으로 충족 — 온체인은 롤백 불가라 사전 승인이 유일한 방어선
**결정**: 명세 §17 말미 "AI는 **승인 없이 Smart Contract를 자동 수정**하거나 **Ledger 데이터를 변경**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ**Smart Contract 개념 자체가 없다**(수정 대상 부재) ⓑ**AI가 회계 원장을 쓰는 경로가 없다**(원장은 결제·구독·정산 파이프라인이 기록) ⓒ**`security_audit_log`는 append-only**로 **AI든 사람이든 코드 경로상 UPDATE/DELETE가 없다**(:5) ⓓ파괴적 액션은 **제안-only+HITL**·기본값 **approval**(054 D-2).
★★**후퇴 금지 + 최고 수위 게이트**: 향후 온체인 도입 시 **원장 쓰기는 승인 게이트 경유 필수**이며 **금전 원장 변경은 물리 제어(061 D-7)와 같은 급**으로 다룬다 — **승인 정족수 + 킬스위치 + 롤백 경로**.
★★**단 결정적 차이**: **온체인은 롤백이 불가능하다**(불변성의 이면). 물리 제어는 되돌릴 여지가 있지만 **온체인 기록은 되돌릴 수 없으므로 사전 승인이 유일한 방어선**이다. 게이트 설계 시 이 비대칭을 반드시 반영할 것.
★**설계 철학 충돌 명시**: `SecurityAudit`의 **best-effort**(감사 실패가 원 액션을 막지 않음)는 **가용성 우선 선택**이고, 블록체인의 **강제 합의**는 **정합성 우선**이다. 온체인 도입은 이 철학이 충돌하는 지점이므로 **설계 전제로 명시**할 것.
★**성능(§18)**: **측정 대상 자체가 없음**(선행 개념 부재). 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**ABSENT-heavy** — Canonical Entity 15종 중 **13종 완전 부재**·**LEDGER·BLOCKCHAIN_AUDIT만 중앙집중 인접 자산으로 PARTIAL-weak**.
- ★중복 금지 재사용: **`SecurityAudit`**(해시체인·`verify`·**체인 정본 하나**)·**회계 원장 3종**·**HMAC 서명**(`ChannelSync`·`NaverSms`·`DataExport`)·`Crypto`(049)·`api_key`(EPIC 06-A)·`SystemMetrics`(057)·`Compliance` SIEM(057)·`index.php`.
- ★순신설: **블록체인 도메인 전량** — 엔티티 13종·**Enterprise Blockchain Registry**·**Distributed Ledger Engine**·**Smart Contract Platform**·**Digital Asset Registry**·**Blockchain Gateway**·**Cross-Chain Integration**·**Distributed Identity**·**Tokenization**·**PKI·KMS/HSM·Node Authentication·Ledger Encryption**·§6~§12 전량·**API 8종·Event 8종·§17 AI 8종**(★분산 노드는 **단일호스트 인프라 선행 종속**).
- ★오흡수 금지: **`evm` 52=PM Earned Value Management 완전 오탐** · **`consensus` 7=어트리뷰션 모델 합의도**(`AttributionEngine`:1560·:1575) · **`wallet` 1=`Landing.jsx`(:153) 마케팅 카피** · `fabric` 1=텍스트 · **`node` 423=`graph_node`(055)/Node.js/DOM** · **`block` 375=`blocked`/`blocking`** · `immutable` 13=JS 불변·플랜 문구 · **`ledger` 31=중앙 회계 원장**(분산 원장 아님) · **`signature` 84=API HMAC 인증 서명** · `Crypto`=앱 레벨 암호화≠KMS/HSM/PKI · 결제(`Paddle`)·DB 트랜잭션≠블록체인 TRANSACTION · JWT/API/재생 토큰≠TOKEN · **`MediaHost` sha256(055)·`Wms` 재고(060)·`wms_cameras`(061)=물리/미디어 자산**≠DIGITAL_ASSET · `RuleEngine`(058)/`JourneyBuilder`(054)≠Smart Contract · `action_request` 정족수≠Multi-sig · `Risk`(056)/`AnomalyDetection`(046)≠온체인 사기 탐지 · **`menu_audit_log.hash_chain`≠tamper-evident**(재오염 금지).
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI의 Smart Contract 자동 수정·Ledger 데이터 변경 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 044/045/047/048/049/**056**/057·EPIC 06-A 상속·**재판정 금지**.
