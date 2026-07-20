# DSAR — Authorization Control Mapping Engine (Part 3-17 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_CONTROL_MAPPING`(SPEC §5 Control Mapping Engine)은 규제·정책·인가 요소를 Control(Library §4)에 연결하는 매핑 엔진이다. 매핑 소스 8종→Control:

| # | 매핑 소스 | 의미 | 실존 매핑 대상 |
|---|---|---|---|
| 1 | Regulation | 규제→Control | §3 Regulatory Catalog |
| 2 | Policy | 보안정책→Control | `UserAuth.php:3681-3686` tenant_security_policy |
| 3 | Role | 역할→Control | `TeamPermissions.php:715-731` ORG_PRESET |
| 4 | Permission | 권한→Control | `TeamPermissions.php:695-701` PDP |
| 5 | SoD | 직무분리→Control | Part3-9 인증 후(선행의존) |
| 6 | JIT | 임시권한→Control | Part3-10 인증 후(선행의존) |
| 7 | Audit | 감사이벤트→Control | `Compliance.php:143-190` |
| 8 | Evidence | 증적→Control | `SecurityAudit.php:14-68` |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 매핑축 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Control Mapping Engine(매핑 데이터모델) | **ABSENT(grep 0)** | 매핑엔진 전무(GT② §2)·`Compliance.php:93-113` 정적 SOC2/ISO 문자열 라벨만 |
| Regulation→Control | **ABSENT** | `Compliance.php:93`·`:102`·`:104` 프레임워크 태그는 하드코딩·Regulation 엔티티 참조 아님 |
| Policy/Role/Permission→Control | **PARTIAL(대상 실재·매핑 없음)** | PDP `TeamPermissions.php:695-701`·`:715-731`·정책 `UserAuth.php:3681-3686` 실재하나 control 연결 계층 없음(GT① §F) |
| SoD→Control | **ABSENT(선행부재)** | SoD grep 0·근접=`Mapping.php:267-269` self-approval 차단(maker≠checker)뿐(GT① §D). Part3-9 인증 후 매핑 |
| JIT→Control | **ABSENT(선행부재)** | JIT grep 0(GT① §3). Part3-10 인증 후 매핑 |
| Audit/Evidence→Control | **PRESENT-generic(연결 없음)** | `Compliance.php:143-190` 감사 UNION·`SecurityAudit.php:14-68` 해시체인 실재하나 control-scoped 매핑 없음(GT① §B·§E) |
| PEP 집행점 | **PRESENT** | `index.php:600-619`·`:436-439` 서버도출 강제(GT① §F) |

★핵심: 현행은 SOC2/ISO를 control 배열에 **정적 라벨**로 박아둔 것(`Compliance.php:93-113`)일 뿐, Regulation/Policy/Role/Permission을 Control에 동적으로 연결하는 매핑 엔진은 순신설.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§5): `mapping_id`·`tenant_id`·`source_kind`(regulation|policy|role|permission|sod|jit|audit|evidence)·`source_ref`·`control_id`(§4 참조)·`coverage`(full|partial|planned)·`created_at`.
- **매핑 대상 substrate**(ADR): PEP=`index.php:600-619`·`:600-604`·`:611-612`(집행점)·PDP=`TeamPermissions.php:695-701`·`:704-712`·`:715-731`(권한결정·ORG_PRESET resource→action)·정책=`UserAuth.php:3681-3686`. 규제/정책/역할/권한을 Control Library(§4)에 연결·후퇴 없이 재배선.
- **★SoD/JIT 선행의존**: SoD·JIT는 grep 0(GT① §3)·현행 최근접은 `Mapping.php:267-269` maker≠checker(SoD-근접·compliance scope 아님). **Part3-9(SoD)·Part3-10(JIT) 인증 후** 매핑 소스로 배선(BLOCKED_PREREQUISITE).
- **증적**(§20): 매핑 생성/변경은 `SecurityAudit::log`(`SecurityAudit.php:14-33`) 확장으로 tamper-evident·`verify()`(`:56-68`).
- **네임스페이스**: `/v424/compliance/*`(`routes.php:1108-1118`) EXTEND·`Compliance.php` 확장(신규 핸들러 금지).
- **제약**: Tenant Isolation(`Compliance.php:198-209`·`index.php:600-619`)·매핑 쓰기 enterprise+tenantSecurityWrite(`:269-300`).

## 4. KEEP_SEPARATE (마케팅 매핑·정산 매핑 흡수금지)

★Control Mapping ≠ 도메인 매핑. `Mapping.php`(`:31`·`:183`·`:209`·`:238-291`)의 maker-checker는 **매핑 변경 승인 워크플로 패턴**(재사용 가능)이지 규제-control 매핑 엔진이 아니다(GT① §D). `KrChannel.php:244-297`=정산 컬럼 매핑·`AttributionEngine.php`=마케팅 attribution credit·`RuleEngine.php:10-12`=마케팅 IF-THEN으로 전부 control 매핑 아님(GT② §B-2·§B-4). 흡수·개명 금지. 데이터품질 매핑(`DataPlatform.php:282-287`·`:288-291`)도 별개.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Control Mapping Engine = **ABSENT(매핑엔진 grep 0·순신설)**. 현행=정적 SOC2/ISO 라벨(`Compliance.php:93-113`)만. Policy/Role/Permission 매핑 대상(PDP/PEP)은 PRESENT하나 연결 계층 없음(PARTIAL).
- **재활용(흡수 아님·재배선)**: `Compliance.php`(정본 EXTEND)·PEP `index.php:600-619`·PDP `TeamPermissions.php:695-701`·`:715-731`·정책 `UserAuth.php:3681-3686`·SecurityAudit 증적·`Mapping.php:238-291` 승인 패턴(워크플로 재사용).
- **KEEP_SEPARATE**: Mapping 도메인 매핑·KrChannel 정산·AttributionEngine/RuleEngine 마케팅·DataPlatform 데이터품질 흡수 금지.
- **선행의존**: Part 1~3-16 인증 + ★SoD(Part3-9)·JIT(Part3-10) 인증 후 실 매핑(BLOCKED_PREREQUISITE). 코드 변경 0.
