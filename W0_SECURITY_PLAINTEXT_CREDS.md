# W0 보안 의뢰서 — Plaintext Admin Credentials

> **작성**: 152차 검수자
> **대상**: 사용자 (GeniegoROI owner)
> **긴급도**: 🔴 Critical
> **종결 조건**: 비밀번호 rotation 완료 + 코드 제거 commit

---

## 1. 발견 사항

`frontend/src/auth/AuthContext.jsx` 라인 213~243 에 **plaintext admin credentials 6세트**가 bundled JS에 포함되어 production `roi.genie-go.com` 에 노출됨.

| Email | Password (plaintext) |
|---|---|
| admin@geniego.com | admin1234! |
| admin@genie-roi.com | admin1234! |
| master@geniego.com | master!@#1234 |
| ceo@ociell.com | geniego1721 |
| ceo@ociell.com | geniego172165 |
| ceo@ociell.com | GENIEGO-ADMIN |

**노출 경로**: Vite 빌드 산출물 (`dist/`) → CDN → 모든 브라우저 방문자가 View Source / DevTools 로 확인 가능.

**악용 조건**: 서버 `/auth/login` 실패 시 클라이언트 폴백 활성화 → 네트워크 차단, API 다운, 또는 의도적 차단 시 `plan: "admin"` 로 인증 우회 가능.

---

## 2. 노출 범위 추정

- **현재 production 번들**: 노출됨 ✓
- **과거 production 번들 (CDN 캐시)**: 노출됨 ✓ (제거 불가)
- **archive.org / wayback**: 잠재적 노출 (검증 필요)
- **git history**: 노출됨 ✓ (`git log -p --all -- frontend/src/auth/AuthContext.jsx`)
- **외부 스크래퍼 / 보안 스캐너**: 잠재적 노출 (Shodan, GitHub secret scan 등)

**결론**: 현재 비밀번호 6개는 **모두 compromised 가정** 하에 처리.

---

## 3. 사용자 작업 절차 (순서 엄수)

### Step 1: 백엔드 비밀번호 rotation

**6개 계정 모두 새 비밀번호로 변경.** 다음 기준 권장:

- 16자 이상
- 대소문자 + 숫자 + 특수문자 혼합
- 패스워드 매니저로 생성 (사람이 만든 패턴 금지)
- 6개 계정 **모두 다르게**

### Step 2: 백엔드 audit log 확인

다음 패턴의 의심 로그인 확인:
- 위 6개 이메일의 비정상 시간대 로그인 (새벽, 해외 IP)
- 위 6개 이메일로 짧은 시간 내 연속 로그인 시도
- `plan: "admin"` 권한으로 비정상 작업 수행 흔적 (관리자 설정 변경, 사용자 데이터 export 등)

### Step 3: 검수자에게 rotation 완료 통보

`"W0 rotation 완료, 코드 제거 진행"` 메시지로 통보.

### Step 4: 검수자 → CC 코드 제거 patch 발행 (153차)

검수자가 다음을 진행:
1. `AuthContext.jsx` 라인 213~243 local fallback 블록 제거
2. offline-demo 기능 필요 시 `VITE_DEMO_MODE` 빌드 플래그로 분리
3. 제거 후 commit + push

### Step 5: 추가 후속 (선택)

- **git history 정리**: `git filter-repo` 로 과거 commit에서 creds 제거 (force push 필요, 협업자 영향 큼 — **권장 안 함**, rotation 으로 충분)
- **GitHub secret scan 활성화**: Settings → Security → Secret scanning ON
- **production WAF 룰**: 위 이메일들로 `/auth/login` 시도 시 알림 트리거

---

## 4. 검수자 즉시 처리 가능 작업 (사용자 액션 불필요)

- ✅ 본 의뢰서 작성
- ✅ 152차 W1 / W2 / W3 / W4 / W5 (rotation 무관)
- ⏸ AuthContext.jsx 라인 213~243 제거 — **rotation 완료 후 153차**

**이유**: 코드 먼저 제거 시 비밀번호가 여전히 git history와 CDN 캐시에 남아있어 "고쳤다"는 잘못된 안심 발생. Rotation 이 진짜 fix.

---

## 5. 153차 진입 조건

- [ ] 사용자가 백엔드 6개 계정 비밀번호 rotation 완료
- [ ] 사용자가 backend audit log 확인 (의심 활동 없음 또는 후속 대응 결정)
- [ ] 사용자가 검수자에게 명시적 "W0 rotation 완료" 통보
- [ ] (선택) GitHub secret scanning 활성화

---

## 6. 참조

- **노출 파일**: `E:\project\GeniegoROI\frontend\src\auth\AuthContext.jsx` (lines 213~243)
- **빌드 산출물**: `dist/` (배포 직후 모든 사용자 다운로드)
- **production URL**: https://roi.genie-go.com
- **빌드 자동 트리거**: master push → GitHub Actions `.github/workflows/deploy.yml`

---

**문서 종결.** 본 의뢰서는 사용자가 보관, rotation 완료 시 153차에 검수자에게 통보.
