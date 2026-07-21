# DSAR — EAUTCF Ground-Truth ① Existing Implementation (Part 3-47)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH). 상위 = Part 3-47 SPEC/ADR.

## 전수조사 방법
crypto/aes/openssl/pki/mtls/cert/key-rotation/hsm/api_key/service-account/workload/device/agent/edge/context 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (narrow·범용 컴퓨팅 신뢰 아님)
| EAUTCF 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Cryptographic Trust | AES-256-GCM 인증암호화·fail-closed | `Crypto.php:9,113`(openssl_encrypt) | PARTIAL(암호만·PKI/HSM 아님) |
| Machine/Service Identity | api_key SHA-256·RBAC role/scope | `index.php`(auth 미들웨어)·`ApiKeys.php` | PARTIAL(유일 실 비인간 identity·Part 3-6) |
| Human Identity Federation | SSO/SAML/OIDC | `EnterpriseAuth.php` | PARTIAL(Part 3-45 정합) |
| Continuous Trust Evaluation | ★매 요청 approved 재검증 fail-closed | `index.php`(agt_)·`AgencyPortal.php` | PARTIAL(Zero Trust 패턴) |
| Context Signals | clientIp·device_sig·session/MFA | `Geo.php`·`Attribution.php`·`UserAuth.php` | PARTIAL(형식 Context Engine 아님) |
| Edge/Offline(seed) | 온프렘 CCTV 브리지 | `WmsCctv.php` | PARTIAL-seed(범용 edge 아님) |
| Evidence/Isolation | 해시체인·격리 | `SecurityAudit.php`·`Db.php` | 실재(재사용) |

## 부재(ABSENT-aspirational) — 단일 호스트라 부재 (grep 0)
Universal Trust Fabric · Distributed/Multi-Node/Consensus/Federated Trust Engine · **Device Trust**(Endpoint Verification/Secure Boot/Patch Compliance/Device Risk) · **Workload Trust**(Container/Kubernetes/VM/Serverless/Runtime Integrity/Supply Chain) · **Service Mesh Trust/mTLS/Service Reputation** · **AI Agent Trust**(Agent Identity/Capability/Delegation·Part 3-46 참조) · **Edge Trust**(범용 Offline/Local Authorization/Regional Recovery) · HSM · **Post-Quantum**(Part 3-23/3-41) · Universal Identity Correlation(형식) · Trust Telemetry Manager(형식) · Global Trust Index/Executive Universal Trust Dashboard.

## 판정
**PARTIAL-narrow / ABSENT-aspirational.** `Crypto`(AES-256-GCM)·`api_key`(service identity)·`EnterpriseAuth`(federation)·매요청 재검증(Zero Trust)·컨텍스트 신호·`SecurityAudit`·`Db`는 실재하나, **컴퓨팅 주체 신뢰(device/workload/service-mesh/agent/edge)와 Universal Fabric/Distributed는 단일 호스트 PHP 앱이라 대부분 부재**. 상당수 인프라(container/K8s/edge/IoT) 전제라 aspirational. 실행은 선행 인증 + 인프라 전제 종속.
