# 203차 인계서 — 대기 활성화 2건 + 모바일 M2~M4 로드맵

> 코드/인프라는 모두 준비 완료. 아래는 **사용자 입력/외부 적용이 있어야 활성화**되는 잔여 항목.

## ⏳ 대기 1 — 네이버 SENS SMS 자격증명 (비밀번호찾기·MFA 문자)

모듈·연동 완료(`NaverSms.php`, admin `/auth/admin/sms`, MFA·비번찾기 배선). **아래 4종만 입력하면 즉시 활성**.

**입력 경로** (둘 중 하나):
1. 관리자 로그인 → Topbar/관리자 설정 → SMS 설정 UI(있으면), 또는
2. `POST /auth/admin/sms` (admin 토큰) Body:
   ```json
   { "access_key":"...", "secret_key":"...", "service_id":"ncp:sms:kr:...:서비스명", "from":"01012345678" }
   ```

**필요 값**(네이버 클라우드 콘솔):
- `access_key` / `secret_key` — 마이페이지 → 계정관리 → 인증키 관리 (Access Key ID / Secret Key)
- `service_id` — Console → Simple & Easy Notification Service(SENS) → SMS → 프로젝트 → 서비스 ID
- `from` — SENS에 사전 등록·승인된 **발신번호**

입력 후: `POST /auth/admin/sms/test {"to":"01000000000"}` 로 실발송 검증.
※ secret_key는 AES-256-GCM 암호화 저장. 기존 SmsMarketing(NHN Toast)와 별개.

## ⏳ 대기 2 — 전용 메일서버 도달률 DNS/PTR

Postfix+OpenDKIM 가동·플랫폼 연동·실발송(Mailplug 250) 검증 완료. **Gmail/네이버 정상 도달**을 위해 아래 적용 필요.

**genie-go.com DNS 추가**:
| 타입 | 호스트 | 값 |
|------|--------|-----|
| TXT(SPF) | `@` | `v=spf1 ip4:1.201.177.46 ~all` (기존 SPF 있으면 ip4만 병합) |
| TXT(DKIM) | `geniemail._domainkey` | `v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6M+XFmj/kuEfUMf2sN6S/8uIYPA6r+lCLn/LPKMBVNoRqGqYQrXr2+nVjVKy9eJzPsB1r707tkzsiCkbJh9rRrjYSm4J9nUq/YqZnwIwmMPUOOSj6A0R59ONaVte5pMMFEJ33Z+rPA7U1nkR9ERf+Wda46GpOv/ilb7PRS2JRNNb+IsPRL7EKSZ5tWgd03BPk15SWnVBWDbJkbNg0J1kKoQlkHNsx3Glhl3AS7nYvGRmEkgdoqGmRXrrvB14DjPfn7m24X5/gRBhz/X+gqbne51Lv4jKACuQudRxV6YarfsIWTMXqUBCrv5/V7y9Zfkj9ACbMdix+zbjREUaN7OtpwIDAQAB` |
| TXT(DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:postmaster@genie-go.com; fo=1` |
| A | `mail` | `1.201.177.46` |

**호스팅사(서버 IP 제공처)에 PTR(역DNS) 요청 — ★필수**: `1.201.177.46` → `mail.genie-go.com`
(PTR 없으면 Gmail/네이버 스팸/거부)

적용(전파 수십분~수시간) 후: Gmail/네이버로 실발송 → "원본 보기"에서 SPF/DKIM/DMARC = PASS 확인, 또는 mail-tester.com 점수.

## 🗺️ 모바일 앱 — M2~M4 로드맵 (M1 완료, 차수 분리)

M1(셸 부트스트랩) 완료: Capacitor 6, android/ios 프로젝트, 절대 API URL, CORS, safe-area, 빌드 파이프라인(`docs/MOBILE_BUILD.md`).

- **M2 네이티브 통합**: `@capacitor/push-notifications`(FCM/APNs — Firebase 프로젝트+APNs 인증서 필요), 생체로그인(`capacitor-native-biometric`, 로그인 게이트 연동), `@capacitor/haptics`, `@capacitor/share`+`@capacitor/filesystem`(리포트 다운로드/공유). 플러그인 배선은 코드, 실검증은 기기 필요.
- **M3 UX 하드닝**: 모바일 하단 탭바 컴포넌트(.cap-native 분기), 스와이프 제스처, 모바일 번들 경량화(라우트 프리페치·차트 lazy), 전환 60fps.
- **M4 스토어 배포**: Android keystore 서명+AAB / iOS 서명(Apple Developer 인증서·provisioning), 권한·개인정보 컴플라이언스(Info.plist/AndroidManifest), TestFlight/내부테스트 업로드 → 심사. 대부분 Apple/Google 콘솔 작업(macOS 필요).

빌드 환경: 실 APK/IPA는 **Android Studio(+SDK) / Xcode(macOS+CocoaPods)** 필요. 현재 Windows 개발기에선 파이프라인까지 검증.

---
관련 커밋: 어트리뷰션엔진 8d43~ · SMS모듈 c5bb2c243db · 가이드i18n 24deb7d873d · M1 197cc61a8d5. 메모리 [[reference_mail_sms_infra]] [[project_n203_attribution_engine]].
