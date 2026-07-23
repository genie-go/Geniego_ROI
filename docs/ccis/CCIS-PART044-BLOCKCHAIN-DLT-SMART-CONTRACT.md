# GeniegoROI Claude Code Implementation Specification

# CCIS Part044 — Enterprise Blockchain, Distributed Ledger, Smart Contract & Digital Asset Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Blockchain·DLT·Smart Contract·Digital Asset 표준을 수립한다.

> ★**성격(ABSENT-total·명백한 사업범위 밖 — 팔지도 않고 없다)**: 이 저장소는 **마케팅/커머스 ROI SaaS**이지
> **블록체인 플랫폼이 아니다**. 명세가 다루는 **블록체인/DLT(Hyperledger Fabric/Ethereum)·Smart Contract
> (Solidity/EVM)·Digital Asset/Tokenization/NFT·Digital Identity(DID)·Wallet·Consensus(PBFT/Raft/PoA)·
> Immutable Ledger(온체인)·On-chain/Off-chain**은 이 제품에 **전면 부재**한다(grep 0·MEA 062 Blockchain 최저·
> ABSENT-heavy). ★**MEA 062 판정 승계**: 063(ESG)은 **팔고 있는데 없었고**, 062(Blockchain)는 **팔지도 않고
> 없다** → 판정어휘 제5항 **"out of scope"**(정직한 부재·결함 아님). ★★**핵심 = 오흡수 차단(MEA 062 D-1)**:
> **`SecurityAudit` 해시체인 ≠ Blockchain/DLT**. `SecurityAudit`는 tamper-**evident**(탐지)이지 tamper-
> **proof**(방지)가 아니며, **단일 노드·합의 없음·분산 복제 없음·외부 검증자 없음·불변성은 append-only 코드
> 규율 의존**(DB 관리자는 UPDATE 가능·**해시체인은 탐지만 할 뿐 막지 못한다**·best-effort라 강제 합의와
> 정반대)이다. ★**MediaHost content-addressing(sha256)≠Tokenization/NFT**·**`SupplyChain`(발주/리스크)≠
> 블록체인 공급망 추적**·**정산 원장(`settlement`)≠분산 원장**(오흡수 주의). Part001 §4 에 따라 실측 →
> 블록체인 전면 부재증명 → out of scope 선언 + 오흡수 차단 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 블록체인 전면 부재 + 오흡수 경계

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Blockchain Architecture | Gateway→Contract→Ledger | **부재(out of scope)** — 블록체인 네트워크 없음(grep 0) |
| DLT(Permissioned/Consortium) | 분산 원장 | **부재(out of scope)** — 분산 원장 없음. `settlement`=중앙 DB 정산(**분산 원장 아님**·오흡수 주의) |
| Hyperledger Fabric | Channel/Chaincode | **부재(out of scope)** — Fabric 없음 |
| Ethereum(EVM/Solidity) | Smart Contract | **부재(out of scope)** — EVM/Solidity 없음 |
| Smart Contract | 배포/호출/이벤트 | **부재(out of scope)** — 스마트 컨트랙트 없음. `RuleEngine`(IF-THEN)은 서버 규칙(**컨트랙트 아님**) |
| Digital Asset | Asset ID/Owner/Ledger Ref | **부재(out of scope)** — 온체인 자산 없음. `MediaHost`(sha256 미디어)는 **content-addressing이지 자산 토큰 아님** |
| Tokenization | Mint/Burn/Transfer | **부재(out of scope)** — 토큰화 없음 |
| NFT(Enterprise) | Certificate/Provenance | **부재(out of scope)** — NFT 없음 |
| Digital Identity(DID/VC) | 분산 신원 | **부재(out of scope)** — DID/VC 없음. 신원=`api_key`/세션/SSO(중앙·Part030·**DID 아님**) |
| Wallet Integration | Custodial/Multi-Sig/HW | **부재(out of scope)** — 지갑 없음. 개인키 관리 대상 없음 |
| Consensus(PBFT/Raft/PoA) | 합의 | **부재(out of scope)** — 합의 메커니즘 없음. (`AttributionEngine`의 "consensus%"=모델 동의도·**블록체인 합의 아님**) |
| Immutable Ledger(온체인) | Block/Hash/Signature | **부재(대응물 아님)** — 온체인 원장 없음. ★**`SecurityAudit` 해시체인=tamper-evident(탐지)이지 blockchain(합의·분산·불변 강제) 아님** |
| On-chain/Off-chain | Hash 검증/동기화 | **부재(out of scope)** — 온체인 없음 |
| Supply Chain Traceability | Chain of Custody | **부재(대응물 아님)** — `SupplyChain`(발주/리스크·delayRate)은 **운영 공급망 관리이지 블록체인 추적 아님**(Chain of Custody 없음) |
| Blockchain Event | Block/Tx/Contract Event | **부재(out of scope)** — 블록체인 이벤트 없음. 이벤트=`omni_outbox`/pixel(중앙) |
| Monitoring | Node/Consensus Health | **부재(out of scope)** — 노드/합의 없음 |
| Logging | Tx/Block/Contract ID | **부분(대응물 아님)** — `SecurityAudit`(중앙 감사)·error_log. Tx/Block ID 대상 없음 |
| Security(개인키/HSM/Multi-Sig) | 키 관리 | **부분(대응물)** — `Crypto` AES-256-GCM(자격증명)·fail-closed. HSM/Multi-Sig/개인키=대상 없음 |
| Compliance(ISO 23257 Blockchain) | 블록체인 규정 | **부재(out of scope)** — 블록체인 인증 대상 아님 |
| Disaster Recovery | Node/Ledger 복구 | **부재(out of scope)** — 노드/온체인 원장 없음. DB 백업(중앙) |
| Performance(Tx Batching/Block Size) | 온체인 성능 | **부재(out of scope)** — 온체인 성능 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정 (전면 out of scope + 오흡수 경계)

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Trust by Design/Immutable/Cryptographic/Off-chain First/Auditable/Tenant Isolated) | **부분(중앙 대응)** | ★Auditable(`SecurityAudit`·**중앙**)·Cryptographic(`Crypto`)·Tenant Isolated. Immutable Record/Decentralization=out of scope |
| §4 Blockchain Architecture | **부재(out of scope)** | 블록체인 네트워크 없음 |
| §5~§7 DLT/Hyperledger/Ethereum | **부재(out of scope)** | 분산 원장/Fabric/EVM 없음 |
| §8 Smart Contract | **부재(out of scope)** | Solidity 컨트랙트 없음. `RuleEngine`≠컨트랙트 |
| §9~§11 Digital Asset/Tokenization/NFT | **부재(out of scope)** | 온체인 자산/토큰/NFT 없음. `MediaHost` sha256≠토큰 |
| §12 Digital Identity(DID/VC) | **부재(out of scope)** | DID/VC 없음. 신원=중앙(`api_key`/SSO) |
| §13 Wallet | **부재(out of scope)** | 지갑/개인키 없음 |
| §14 Consensus | **부재(out of scope)** | 합의 없음(AttributionEngine "consensus%"≠블록체인 합의) |
| §15 Immutable Ledger | **부재(오흡수 경계)** | ★**`SecurityAudit` 해시체인 ≠ blockchain**(단일 노드·합의 없음·탐지만·막지 못함) |
| §16 On-chain/Off-chain | **부재(out of scope)** | 온체인 없음 |
| §17 Supply Chain Traceability | **부재(오흡수 경계)** | `SupplyChain`=운영 관리이지 블록체인 Chain of Custody 아님 |
| §18 Blockchain Event | **부재(out of scope)** | 블록체인 이벤트 없음. 이벤트=중앙(`omni_outbox`) |
| §19 Monitoring | **부재(out of scope)** | 노드/합의 상태 없음 |
| §20 Logging | **부분(대응물 아님)** | `SecurityAudit`(중앙). Tx/Block ID 대상 없음 |
| §21 Security | **부분(대응물)** | `Crypto` AES·fail-closed. HSM/Multi-Sig/개인키=대상 없음 |
| §22 Compliance | **부재(out of scope)** | ISO 23257 블록체인 인증 대상 아님 |
| §23 Disaster Recovery | **부재(out of scope)** | 노드/온체인 원장 없음. DB 백업(중앙) |
| §24 Performance | **부재(out of scope)** | 온체인 성능 대상 없음 |
| §25~§26 PHP/Claude(Blockchain Gateway/Contract·Wallet Adapter/Ledger Verify) | **부재(out of scope)** | 블록체인 연동 계층 없음 |
| §27~§28 검증(blockchain:health/contract:verify/ledger:verify) | **대상 없음** | artisan 없음·블록체인 없음. `SecurityAudit::verify`(중앙 해시체인)로 대체 |

---

## 4. 확립된 표준 (오흡수 차단 + 향후 도입 시 원칙)

- ★★**오흡수 절대 금지(MEA 062 D-1)**: **`SecurityAudit` 해시체인을 "blockchain/DLT"로 표기·홍보·주장하지 않는다**. 이는 **tamper-evident(탐지)**이지 tamper-proof(방지)가 아니며 — **단일 노드·합의 없음·분산 복제 없음·외부 검증자 없음·불변성은 append-only 코드 규율 의존**(DB 관리자 UPDATE 가능·best-effort). blockchain 의 강제 합의·분산 신뢰와 **정반대**다.
- ★**대응물 경계(오흡수 주의)**: **`MediaHost` content-addressing(sha256) ≠ Tokenization/NFT** · **`SupplyChain`(발주/리스크) ≠ 블록체인 공급망 추적(Chain of Custody)** · **정산 원장(`settlement`/`*_ledger`) ≠ 분산 원장** · **`api_key`/SSO 신원 ≠ DID/VC** · **`AttributionEngine` "consensus%" ≠ 블록체인 합의**. 이름·개념이 겹쳐도 블록체인 실체 아님.
- ★**향후 도입 시(제품 결정 후) 원칙**: ★★**온체인 트랜잭션은 롤백 불가 → 사전 승인이 유일한 방어선**(HITL `action_request`·high-value 게이트 필수). Off-chain First(대용량 off-chain·해시만 온체인)·개인키 코드 하드코딩 금지(HSM/Multi-Sig)·Gateway 계층 분리·테넌트 격리·PII 미저장(온체인 불변=개인정보 삭제권과 상충·GDPR Art.17 주의).
- ★**현행 신뢰 정본**: 무결성·감사=**중앙 `SecurityAudit`**(해시체인·유일 정본·재오염 금지)·`Crypto` AES·RBAC·테넌트 격리. 블록체인 없이 이 컨트롤로 신뢰 확보.
- ★**사업범위 원칙**: **블록체인/DLT/Smart Contract/NFT/Wallet 은 이 제품 범위 밖** — 팔지도 않고 필요도 증명되지 않았다. 요구·제품결정·인프라 선행 없이 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 전면 out of scope)

1. **블록체인/DLT(Hyperledger/Ethereum)·Smart Contract·Consensus** — 안 함. **사업 범위 밖**(블록체인 플랫폼 아님·마케팅/커머스 ROI SaaS). ★**팔지도 않고 없다**(MEA 062·정직한 부재). 도입=런타임·인프라·합의 네트워크 전면 신설.
2. **Digital Asset/Tokenization/NFT/Wallet/DID** — 안 함. **사업 범위 밖**. `MediaHost`(sha256)·`api_key`/SSO 는 대응물이 아니다(오흡수 금지).
3. **Immutable Ledger(온체인)** — 안 함. ★**`SecurityAudit` 해시체인은 blockchain 이 아니다**(단일 노드·탐지 only·막지 못함). 무결성은 중앙 tamper-evident 감사로 확보.
4. **Supply Chain Traceability(블록체인)** — 안 함. `SupplyChain`(발주/리스크)은 운영 관리이지 Chain of Custody 아님.
5. **HSM/Multi-Signature/개인키 관리** — 대상 없음(지갑 없음). `Crypto` AES(자격증명)는 블록체인 키가 아니다.
6. **ISO 23257(Blockchain) 규정** — 대상 아님(블록체인 없음).
7. **artisan `blockchain:*`/`contract:*`/`wallet:*`/`ledger:verify` 명령** — 없음(Slim·블록체인 없음). `SecurityAudit::verify`(중앙 해시체인)로 대체.

★**준수하는 실 원칙**: **오흡수 차단(SecurityAudit≠blockchain·MediaHost sha256≠NFT·SupplyChain≠공급망 추적·정산≠분산원장·consensus%≠합의)·중앙 tamper-evident 감사(SecurityAudit)·Crypto AES·테넌트 격리·PII 미저장**. ★**out of scope 정직 선언**: 블록체인/DLT/Smart Contract/NFT/Wallet 은 이 제품 범위 밖이며 부재는 결함이 아니다(팔지도 않고 없다).

---

## 6. Claude Code 구현 규칙

1. ★★**`SecurityAudit` 해시체인을 blockchain/DLT/immutable ledger 로 표기·주장 금지**(tamper-evident≠tamper-proof·단일 노드·탐지 only). 오흡수 절대 금지.
2. ★**대응물 오흡수 금지**: `MediaHost` sha256≠토큰/NFT·`SupplyChain`≠블록체인 추적·`settlement`≠분산원장·`api_key`/SSO≠DID·`AttributionEngine` consensus%≠합의.
3. 무결성/감사=중앙 `SecurityAudit`(해시체인·재오염 금지·한계 정직)·`Crypto` AES·테넌트 격리로 확보. 블록체인 없이.
4. ★**블록체인/Smart Contract/NFT/Wallet/DID 를 선이식하지 않는다** — 사업 범위 밖(팔지도 않음·요구·제품결정·인프라 선행).
5. ★향후 도입 시(제품 결정 후): **온체인=롤백 불가 → 사전 승인(HITL) 유일 방어선**·Off-chain First·개인키 하드코딩 금지(HSM)·**온체인 PII 금지**(GDPR 삭제권 상충).
6. Hyperledger/Ethereum/Solidity/Web3 를 "명세에 있다"는 이유로 이식하지 않는다(중앙 `SecurityAudit`+`Crypto` 로 신뢰 확보).

---

## 7. Completion Criteria

- [x] 블록체인 스택 **실측**(blockchain/DLT/Hyperledger/Ethereum/Smart Contract/NFT/Wallet/DID/Consensus 전면 부재·grep 0)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(블록체인 전면 **out of scope** 증명·MEA 062 "팔지도 않고 없다")
- [x] ★★**오흡수 차단** 성문화(§4) — `SecurityAudit`≠blockchain·`MediaHost` sha256≠NFT·`SupplyChain`≠공급망 추적·정산≠분산원장·consensus%≠합의
- [x] 향후 도입 시 원칙(온체인 롤백 불가→사전 승인·Off-chain First·온체인 PII 금지) 명시
- [x] 의도적 미적용 + 사유(§5) — 블록체인/Smart Contract/NFT/Wallet/DID/HSM(전면 out of scope)
- [x] Claude Code 규칙(§6) · `SecurityAudit`(중앙·≠blockchain)·`Crypto` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **블록체인 전면 부재**의 정직한 성문화이지 Hyperledger/Ethereum
> 이식이 아니다. ★★**핵심 = 오흡수 차단(MEA 062 D-1)**: **`SecurityAudit` 해시체인은 blockchain 이 아니다**
> (tamper-evident 탐지·단일 노드·합의 없음·막지 못함). ★**out of scope 정직 선언(MEA 062)**: 블록체인은 이
> 마케팅/커머스 SaaS 가 **팔지도 않고 없으며** 부재는 결함이 아니다 — 도입 시 **온체인은 롤백 불가라 사전
> 승인이 유일한 방어선**이다.

---

## 다음 Part

**CCIS Part045 — Enterprise FinOps, Cloud Cost Optimization & Resource Governance** — ★사전 실측 예고: 형식 FinOps 도구(CloudHealth/Kubecost)·Multi-Cloud 비용 분석·Reserved Instance/Savings Plan·Tag Governance 는 **부재/부분**(단일 서버·nginx/php-fpm·Part016 Docker/k8s 부재)이나, 비용/거버넌스 실체는 **`PlanLimits`(플랜 쿼터)·`ai_call_log`(LLM 토큰 비용)·구독 빌링(Paddle/Stripe)·php-fpm 풀 튜닝(Part006)·리소스 격리(테넌트)**로 부분 실재. Part045 도 실측→CloudHealth/Kubecost/Multi-Cloud 부재증명→PlanLimits+ai_call_log+빌링 성문화. ★주의: 클라우드 비용은 대체로 사업범위 밖(단일 VPS)·`Mmm`(광고예산 최적화)≠클라우드 FinOps(오흡수 주의).
