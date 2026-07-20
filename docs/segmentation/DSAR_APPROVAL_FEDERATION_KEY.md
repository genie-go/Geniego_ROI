# DSAR — Key Manager (Federation) (Part 3-18 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_KEY
Key Manager는 federation 자격/인증서/토큰 개인키의 at-rest 보호와 수명주기를 관리하는 거버넌스 계약이다. 대상:
- **HSM/KMS Integration** — 외부 하드웨어/클라우드 키 저장소 통합.
- **Key Rotation / Versioning / Revocation** — 버전형 회전, 무중단 dual-read, 폐기.

## 2. Substrate 매핑 (현행 코드 실측)
| SPEC 요구 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| 대칭 암호화 primitive | AES-256-GCM 봉투 암·복호 | `Crypto.php:108` · `:133` | 실재 |
| 버전형 KEK 회전 | 버전 태그 KEK dual-read 무중단 회전 | `Crypto.php:133` · `:148` | 실재(PARTIAL) |
| KEK 로딩/파생 | KEK 소스 로딩·키 파생 | `Crypto.php:45-74` · `:96` · `:121` | 실재 |
| federation 자격 재암호화 | SSO/SCIM 자격 at-rest 재봉투 | `EnterpriseAuth.php:466-473` · `:467` | 실재 |
| HSM/KMS 외부 통합 | 없음 | — | **ABSENT** |
| 명시적 Revocation 워크플로 | 없음(회전만) | — | **ABSENT** |

현행 `Crypto.php`는 **AES-256-GCM 봉투암호화**(`:108`·`:133`)에 **버전형 KEK 비파괴 회전**(`:133`·`:148`)을 갖추고, `EnterpriseAuth.php:466-473`에서 federation 자격을 at-rest 재봉투한다. 즉 로컬 KMS의 실체는 있으나 **HSM/외부 KMS 통합·명시적 폐기 워크플로가 부재**하다.

## 3. 설계 계약 (신설 시)
- **KMS Provider 추상화**: 현행 `Crypto.php` KEK 로딩(`:45-74`·`:96`)을 provider 인터페이스로 **확장**하여 HSM/클라우드 KMS를 dual-source로 결합. 병렬 암호 스택 신설 금지.
- **Key Versioning/Rotation**: 기존 버전형 KEK 회전(`Crypto.php:133`·`:148`)을 정본으로 삼아 federation cert 개인키(§12)까지 커버. dual-read로 무중단 보장.
- **Revocation**: 손상 키 즉시 폐기+재봉투 트리거, 이벤트는 감사 체인(`SecurityAudit.php:14-67`) 기록.
- Certificate Manager(§12) 개인키 보호는 본 Key Manager에 종속.

## 4. KEEP_SEPARATE
- **connector_token**(`Connectors.php:133-181`) — 외부 커넥터 자격 자체 저장 경로, federation KMS로 흡수 금지(★핵심).
- **SMS HMAC**(`NaverSms.php:94` · `:119`) — 발송 서명 시크릿.
- **cloud export creds**(`DataExport.php:131-156`) — 내보내기 자격.
- 위 3종은 Key Manager 관할 밖.

## 5. 판정
**PARTIAL (Crypto 확장)**. AES-256-GCM+버전형 KEK 비파괴 회전(`Crypto.php:108`·`:133`·`:148`)과 federation 자격 재봉투(`EnterpriseAuth.php:466-473`)가 실재하는 substrate를 **확장**하고, HSM/KMS 통합·명시적 Revocation은 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
