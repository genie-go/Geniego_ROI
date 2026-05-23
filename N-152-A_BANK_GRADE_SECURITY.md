# N-152-A — 은행급 초엔터프라이즈 보안 운영 원칙

> **확정**: 152차
> **적용 시점**: 152차 이후 모든 작업
> **상위 문서**: NEXT_SESSION.md (153차 인계서 1.3에 통합)

---

## 1. 기본 원칙

**모든 구현은 은행급 이상 초엔터프라이즈 보안 기준 적용.**

대상 영역:
- 코드 (frontend / backend)
- 인프라 (CI/CD, 배포, 빌드)
- 데이터 처리 (입력 검증, 출력 인코딩, 저장)
- 인증 / 권한 (auth, RBAC, session, token)
- 감사 / 로깅 (audit log, telemetry, observability)
- 비밀 관리 (credentials, API keys, certificates)

---

## 2. 구체 적용 기준

### 2.1 코드 (Frontend / Backend)

| 항목 | 기준 |
|---|---|
| **입력 검증** | 모든 외부 입력은 type-check + range-check + sanitize 후 사용 |
| **출력 인코딩** | XSS 방어 (React 자동 escape 신뢰 + dangerouslySetInnerHTML 금지) |
| **에러 처리** | try-catch 필수, fail-secure (실패 시 권한 거부 / 데이터 비노출) |
| **무결성 검증** | 중요 상수 (plan, role) 는 런타임 변조 감지 (예: plans.js 의 _verifyIntegrity) |
| **의존성** | npm audit 통과 + critical/high 취약점 0건 유지 |
| **타입 안전** | JSDoc / TypeScript 점진 도입, 권한 관련 함수는 필수 |
| **시크릿 노출** | 클라이언트 번들에 plaintext 시크릿 금지 (W0 패턴 재발 방지) |

### 2.2 인증 / 권한

| 항목 | 기준 |
|---|---|
| **Session** | HttpOnly + Secure + SameSite=Strict cookie |
| **토큰** | 짧은 만료 (15분 이내) + refresh token + revocation 가능 |
| **권한 비교** | 명시적 helper 사용 (planAtLeast, adminRoleAtLeast), 직접 `>=` 금지 |
| **권한 폴백** | 미정의 / 불명 plan/role 은 항상 최저 권한 (free / 권한 없음) |
| **다중 검증** | 클라이언트 + 서버 양쪽 권한 검증 (클라이언트 단독 신뢰 금지) |
| **권한 변경 감사** | 모든 role 변경 / plan upgrade 는 audit log 기록 |
| **2FA / MFA** | super_admin 은 필수, admin 은 권장 (가능하면 강제) |
| **세션 timeout** | inactivity 30분 + absolute 8시간 (조정 가능) |

### 2.3 감사 / 로깅

| 항목 | 기준 |
|---|---|
| **audit_log 영속화** | DB 별도 테이블, append-only, 삭제 금지 |
| **민감 작업 기록** | 권한 변경, 데이터 export, 시스템 설정 변경 100% 기록 |
| **로그 무결성** | append-only + 주기적 해시 체인 (tamper-evident) |
| **PII 처리** | 로그에 PII 직접 기록 금지, 식별자만 사용 |
| **로그 보관** | 최소 1년, 규제 도메인은 7년 (KISA / GDPR 기준) |
| **실시간 알람** | 권한 위반 / 비정상 로그인 즉시 알람 |
| **observability** | Sentry / DataDog / 자체 모니터링 도입 |

### 2.4 데이터 보호

| 항목 | 기준 |
|---|---|
| **전송 암호화** | TLS 1.3 (1.2 최소), HSTS 활성화 |
| **저장 암호화** | 민감 필드 (PII, 결제정보) AES-256 암호화 |
| **백업 암호화** | 백업 파일도 동일 기준 암호화 |
| **DB 접근** | least privilege, prepared statement (SQLi 방어) |
| **CSV / Export** | injection 방어 (149차 OrderHub 검증 완료 패턴) |
| **upload 검증** | 확장자 + MIME + magic byte 3중 검증 |

### 2.5 인프라 / 배포

| 항목 | 기준 |
|---|---|
| **빌드 무결성** | npm ci (lock 강제), SBOM 생성, supply chain 검증 |
| **시크릿 관리** | GitHub Secrets / HashiCorp Vault / AWS Secrets Manager |
| **CI 권한** | least privilege, production deploy 는 별도 승인 단계 |
| **rollback** | 모든 배포는 1-click rollback 가능 |
| **WAF** | rate limit + bot 차단 + 알려진 공격 패턴 차단 |
| **DDoS** | CDN 단계 보호 (Cloudflare / AWS Shield) |
| **secret scanning** | GitHub Advanced Security 활성화 |
| **dependency scanning** | Dependabot / Snyk 활성화 |

### 2.6 비밀 관리

| 항목 | 기준 |
|---|---|
| **plaintext 금지** | 코드 / config / 환경변수 외 모든 곳에서 plaintext 시크릿 금지 |
| **rotation 주기** | 비밀번호 90일, API key 180일, 인증서 자동 갱신 |
| **노출 시 즉시 대응** | 의심 노출 시 즉시 rotation, audit log 전수 조사 |
| **개발자 접근** | 개발자도 production 시크릿 직접 접근 금지 (vault 통해서만) |

---

## 3. 152차에 적용된 구체 사례

### 3.1 plans.js (W1)
- Object.freeze + 무결성 해시 검증 (_verifyIntegrity)
- audit hook (window.__GENIE_AUDIT_HOOK) 인터페이스 정의
- fail-secure 폴백 (미정의 plan → rank 0)
- 입력 검증 (type-check)
- legacy compat (점진 마이그레이션)

### 3.2 W0 보안 의뢰서
- plaintext credentials 6개 발견
- rotation 절차 + audit log 확인 + 코드 제거 순서 명문화
- git history 정리 위험성 명시
- secret scanning 활성화 권장

### 3.3 T3 메뉴 토글 (설계)
- audit_log 테이블 append-only
- moderator / admin / super_admin 3단계 권한
- 권한별 작업 매트릭스 명시
- default 복원은 super_admin only

---

## 4. 검수자 작업 원칙 (N-152-A 운영)

검수자는 모든 작업 진행 시:

1. **보안 영향 사전 평가**: 모든 코드 변경 / 신규 기능은 위 2장 기준 충족 여부 검토
2. **위반 발견 즉시 사용자 통보**: 발견된 보안 이슈는 작업 우선순위 격상 (다른 작업 보류)
3. **rotation 필요 시 의뢰서**: 사용자가 직접 수행할 보안 작업은 W0 패턴으로 의뢰서 작성
4. **commit 메시지 보안 표시**: 보안 작업은 `security:` prefix, audit log 보존

---

## 5. CC (Claude Code) 작업 시 보안 원칙

- 보안 코드 작성 시 검수자가 작성한 안전한 버전 사용
- CC 자체 즉흥 작성 금지 (검수자 작성 → CC가 적용)
- 시크릿 / 비밀 출력 시 자동 마스킹
- 보안 commit 은 사용자 명시 승인 (N-145-G) 후에만 push

---

## 6. 153차 이후 강제 적용 영역

- [ ] frontend 모든 권한 비교를 planAtLeast / adminRoleAtLeast 로 통일
- [ ] backend API 모든 endpoint에 권한 검증 + audit log
- [ ] CSP (Content Security Policy) 강화
- [ ] HSTS / X-Frame-Options / X-Content-Type-Options 헤더 검증
- [ ] secret scanning 활성화
- [ ] dependency scanning 활성화
- [ ] WAF 룰 적용
- [ ] 정기 침투 테스트 (분기별)

---

**본 원칙은 152차 인계서 1.3에 통합되며, 153차 이후 모든 작업의 기본 baseline.**
