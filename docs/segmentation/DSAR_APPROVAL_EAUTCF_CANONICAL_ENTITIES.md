# DSAR — EAUTCF Canonical Entities Design & Judgment (Part 3-47 §2~§21)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Crypto/api_key/EnterpriseAuth 재사용·컴퓨팅주체 신뢰 aspirational.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_UNIVERSAL_TRUST | 부재(형식 Universal Trust) | — | ABSENT-aspirational |
| 2 | APPROVAL_TRUST_FABRIC | 부재(단일 노드) | — | ABSENT-aspirational |
| 3 | APPROVAL_DISTRIBUTED_TRUST | 부재(Multi-Node/Consensus) | — | ABSENT-aspirational |
| 4 | APPROVAL_DEVICE_TRUST | 부재(endpoint/secure-boot) | — | ABSENT-aspirational |
| 5 | APPROVAL_WORKLOAD_TRUST | 부재(container/K8s/VM) | — | ABSENT-aspirational |
| 6 | APPROVAL_SERVICE_TRUST | api_key(service identity)·mTLS 부재 | `index.php`·`ApiKeys.php` | PARTIAL(identity만) |
| 7 | APPROVAL_AGENT_TRUST | Part 3-46 참조 | — | 상위 Part 참조·ABSENT |
| 8 | APPROVAL_EDGE_TRUST | 온프렘 CCTV 브리지(seed) | `WmsCctv.php` | PARTIAL-seed |
| 9 | APPROVAL_CONTEXT_TRUST | IP/device_sig/session/MFA | `Geo.php`·`Attribution.php`·`UserAuth.php` | PARTIAL(형식 Engine 아님) |
| 10 | APPROVAL_TRUST_POLICY | RBAC/재검증 정책 | `index.php`·`AgencyPortal.php` | PARTIAL |
| 11 | APPROVAL_TRUST_TELEMETRY | auth_audit_log·이벤트 | `UserAuth.php`(auth_audit_log) | PARTIAL-informal |
| 12 | APPROVAL_TRUST_ANALYTICS | 부재(Global Trust Index) | — | ABSENT |
| 13 | APPROVAL_TRUST_SNAPSHOT | 부재 | — | ABSENT |
| 14 | APPROVAL_TRUST_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 15 | APPROVAL_TRUST_DIGEST | 부재 | — | ABSENT |
| 16 | APPROVAL_TRUST_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 17 | APPROVAL_TRUST_VERSION | git·API 버전 | git | PARTIAL |
| 18 | APPROVAL_TRUST_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 19 | APPROVAL_TRUST_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 20 | APPROVAL_TRUST_EXCEPTION | 부재 | — | ABSENT |

## 도메인 설계 계약(§3~§21 요지)
- **§14 Cryptographic Trust**: `Crypto.php:9,113`(AES-256-GCM·openssl_encrypt fail-closed) 승격. PKI/HSM/Post-Quantum=Part 3-23/3-41 미래. Key Rotation=수동([[reference_session_credentials]]).
- **§9 Service Trust / §15 Identity Correlation**: `api_key`(비인간)·`EnterpriseAuth`(인간 federation) 실재. mTLS/Service Mesh/Service Reputation=단일 호스트라 ABSENT. AI Identity=Part 3-46 참조.
- **§12 Continuous Trust / §6 Context**: 매 요청 재검증(Zero Trust)·컨텍스트 신호(IP/device_sig/session) 실재. Device/Runtime attestation=인프라 부재로 ABSENT.
- **§7 Device / §8 Workload / §11 Edge**: 단일 호스트라 endpoint/container/K8s/serverless/범용 edge 부재. `WmsCctv`=CCTV 온프렘 seed(범용 확대 금지).
- **§4 Fabric / §5 Distributed**: 단일 노드라 Universal Fabric/Multi-Node/Consensus 부재.

## 판정
**PARTIAL(§6·§8·§9·§10·§11·§14=identity/context/edge-seed/evidence 재사용) / ABSENT-aspirational(§1~5·§7 device·§8 workload=Universal Fabric·Distributed·Device·Workload·Service-Mesh — 인프라 전제).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 Crypto/api_key/EnterpriseAuth 승격·컴퓨팅주체 신뢰는 인프라(container/edge) 확보 후·상위 Part(3-45/3-46/3-23/3-41) 오흡수 금지.
