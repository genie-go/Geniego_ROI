# GENIE_ROI V339 (실무 결제 기능 중심) – 설계/구현 패키지

## V339 목표 (요약)
V339는 “커넥터 폭 확장”보다 **실무 고객이 즉시 비용을 지불하는 운영 기능**에 집중합니다.

(A) SmartStore/Coupang: **등록/수정/품절/배송정책**까지 운영 가능한 수준  
(B) 룰 엔진 고도화: **카테고리 매핑 / 금지어 / 품질점수(품질지표)**  
(C) 엔터프라이즈 운영: **감사로그 / 승인 워크플로우 / 권한(RBAC) / 테넌트 분리**

## 포함 소스(이 ZIP)
- backend (FastAPI): 표준 상품, 룰 평가, 승인/감사, 채널 푸시(모의 어댑터)
- dashboard (Streamlit): 초보자용 “한 화면 운영 대시보드”
- infra (docker-compose): Postgres/Redis/API/Worker/Dashboard

## 빠른 실행
1) Docker 설치 후
2) `cd infra && docker compose up --build`
3) 브라우저
- API: http://localhost:8000/docs
- Dashboard: http://localhost:8501

## 실제 API 연동 시 주의
- SmartStore/쿠팡은 인증/권한/쿼터/계약 조건이 필요합니다.
- V339는 “어댑터 인터페이스 + 승인/감사/룰/대시보드”까지 제공하고,
  실제 채널 API 연동은 각 사 정책에 맞춰 키/서명/리트라이/쿼터를 추가하면 됩니다.


## V342 UI 고급화 & Role-based Onboarding
- 다크모드/라이트모드 토글(대시보드 CSS 테마)
- 역할별(대행사/유통/제조/셀러) 가입 유형에 따라 기본 KPI/체크리스트/화면 우선순위 자동 적용
- 아이콘/카드 UI/컴팩트 KPI, 고급 보기(전문가) 토글 제공
- PDF 리포트 출력(대시보드 스냅샷)
- 마케팅 데이터(지역/성별/연령 등) 수집 파이프라인/인사이트(데모) 추가
