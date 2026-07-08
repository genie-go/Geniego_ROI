
## 272차 (2026-07-08~09) — 대행사 콘솔 + 통합 데이터 플랫폼 1~2단계

### 무엇을 / 왜
- **전수 초정밀 감사 18건 수정**(정합/보안/데이터·i18n 회귀): 커밋 eecee901450. P0 번들 5.9→0.67MB(1888a744a05).
- **대행사 멀티클라이언트 콘솔**(3e954118c43): 은행급 격리·클라이언트 승인 게이트·전기능 운영 브릿지(97e5146d52c). agency_account/client_link/session·agt_ 토큰·매요청 approved 재검증(철회 즉시 403).
- **통합 데이터 플랫폼 1단계**(686a500dd28): tenant_business_profile(구독사 프로필)·data_source 레지스트리(구독등록 vs 외부수집 구분·외부는 channel_credential 자동유도)·DataAssets/AgencyManager 화면.
- **2단계**(fb549da3327): dataQuality(레코드 스캔·범용 reliability_score)·dataLineage(원천추적)·DataTrustDashboard 실배선.

### 데이터/테이블
- 신설: tenant_business_profile, data_source, agency_account, agency_client_link, agency_session.
- 재사용(중복 신설 0): channel_orders·performance_metrics·raw_vendor_event·connector_sync_log·Rollup SSOT·cancelExclusion·fxToKrw.

### API
- /api/data/business-profile(GET/PUT)·/api/data-sources(GET/POST·/subscriber-owned·/external-channels)·/api/data-quality·/api/data-lineage.
- /api/agency/*(login/me/clients/switch/exit/brand)·/auth/agencies(CRUD·master)·/v423/agency-access/*(승인/철회).

### 사용 금지 데이터
- 목/더미/샘플은 운영 분석 미사용(IS_DEMO 게이트). 무데이터 테넌트는 honest null+안내(가짜숫자 0).

### 테스트/검증
- 백엔드 E2E(대행사 격리·승인·철회·데이터플랫폼 프로필/소스/품질/계보 전 200)·로컬+데모+운영 헤드리스(회귀0·화이트스크린0·JS에러0)·php-l·route check·빌드 EXIT0.

### 리스크/잔여
- 결제(Paddle) 운영키 미설정=상용 과금 비활성. 라이브 채널 자격증명 미등록=실데이터 0(등록 즉시 실행 구현완료). 출처 메타 행레벨·계보 end-to-end 그래프=관측성 강화 후보(정합 결함 아님).

### 완료 기준(다음 개발자)
docs/data/DATA_ARCHITECTURE.md 의 "구현됨" 재구현 금지. 대행사·데이터소스·품질·계보는 배선 완료·배포됨.
