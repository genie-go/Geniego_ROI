# ADR — DSAR Authorization Universal Trust Computing (Part 3-47 · EAUTCF)

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②(EAUTCF EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
Part 3-47은 모든 컴퓨팅 주체(device/workload/service/agent/edge)를 Universal Trust Fabric으로. 그러나 GeniegoROI는 **단일 호스트 PHP/Slim 앱**(container/K8s/service-mesh/edge/IoT 인프라 부재)이라 컴퓨팅 주체 신뢰 대부분이 aspirational. 실재하는 것은 암호(Crypto)·비인간 identity(api_key)·인간 federation(EnterpriseAuth)·컨텍스트 신호·Zero Trust 재검증뿐. 상위 Part 3-45(Digital Trust·조직/파트너)·3-46(AI agent)과 축이 겹치므로 KEEP_SEPARATE.

## 결정
- **D-1 (Cryptographic Trust = Crypto 재사용·중복 금지):** PKI/Certificate/Signature substrate = `Crypto.php`(AES-256-GCM·`openssl_encrypt` fail-closed). HSM/Post-Quantum은 Part 3-23(Quantum-Ready)/3-41 미래. 중복 암호 유틸 신설 금지.
- **D-2 (Machine/Service Identity = api_key 승격):** Service Trust·Machine Identity = `api_key`(SHA-256·RBAC role/scope·유일 실 비인간 identity·Part 3-6). AI Agent Identity=Part 3-46 EAINGA 참조(중복 금지). Service Mesh/mTLS=단일 호스트라 ABSENT.
- **D-3 (Continuous Trust = Zero Trust 재검증 재사용):** Continuous Trust Evaluation = 매 요청 approved 재검증 fail-closed(`AgencyPortal`·`index.php` agt_·Part 3-45 §10 정합). Device/Runtime Validation은 그 위에 신설(단 device attestation infra 부재).
- **D-4 (Device/Workload/Agent/Edge = ABSENT-aspirational · 조기구현 금지):** 단일 호스트에 endpoint/secure-boot/container/K8s/serverless/service-mesh 부재. `WmsCctv`(온프렘 브리지) = 유일 edge/offline seed(그러나 CCTV용·범용 edge trust 아님). 인프라 없이 device/workload trust 조기 신설 금지(블라인드 스켈레톤 방지).
- **D-5 (Evidence/Isolation = 기존 정본 재사용):** Immutable Trust History·Evidence Integrity=`SecurityAudit::verify`(유일 append-only 체인·[[reference_menu_audit_log_not_tamper_evident]]). Tenant Isolation·Cross-Tenant Trust Leakage=`Db.php`+위임 tenant 서버바인딩([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. 실행은 선행 Part1~3-46 인증 + 컴퓨팅 인프라(container/edge) 전제 종속(BLOCKED_PREREQUISITE·상당수 aspirational).
