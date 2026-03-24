# V393 Sprint Backlog (Executable Units)

목표: V392 기능을 그대로 유지하면서 **상품등록/피드/신디케이션(루브릭 5번)**을 9점대로 끌어올리고,
글로벌 확장/운영성/거버넌스까지 함께 강화합니다.

## Epic A. 오픈마켓 Provider 구현 (인증/서명/업로드/에러처리)

### 우선순위 원칙
1) **Amazon SP-API**: 글로벌 핵심 + 인증/서명 난이도 높음(레퍼런스가 많고 ROI 큼)
2) **Shopee**: SEA 핵심 + 셀러 수요 높음
3) **Qoo10**: KR/JP 싱가포르 등 지역 수요
4) **Rakuten**: JP 강자, 속성/카테고리 룰이 까다로움(피드/검증 성숙 필요)

### Sprint 1 (2주): Provider Skeleton + 공통 오류 분류
- [x] Provider 인터페이스(BaseMarketplaceProvider) 정의
- [x] channel별 Provider 스텁(Amazon/Shopee/Qoo10/Rakuten)
- [x] Validation 실패를 provider 레벨에서 “rejected”로 표준화
- [ ] (다음) Provider 별 인증키/토큰 모델(암호화 저장) 설계 + DB 마이그레이션

### Sprint 2 (2주): Amazon SP-API 실구현 (MVP)
- [ ] LWA OAuth 토큰 발급/갱신
- [ ] AWS SigV4 서명
- [ ] Listings Items API (create/update) 최소 기능
- [ ] 429/5xx 재시도 + idempotency
- [ ] 에러코드 매핑 (invalid_attribute / throttled / auth_failed / temporary)

### Sprint 3 (2주): Shopee API 실구현 (MVP)
- [ ] OAuth/서명(파트너/샵 토큰)
- [ ] 상품 업로드/수정/가격/재고 업데이트
- [ ] 에러코드 표준화 및 UI 표시

### Sprint 4 (2주): Qoo10/Rakuten MVP + 운영 안정화
- [ ] Qoo10 상품등록/수정 기본
- [ ] Rakuten 상품등록/수정 기본
- [ ] 대량 업로드 배치/부분 실패 리포트(라인 아이템 단위)

## Epic B. 카테고리별 속성 매핑 룰 확장 (템플릿 v2)

### Sprint 1
- [x] Template v2 포맷 도입 (category_rules/allowed_values/max_length/aliases)
- [x] /v393/templates/v2 CRUD
- [x] /v393/validate/v2 제공

### Sprint 2
- [ ] 카테고리 매핑(내부 카테고리 -> 채널 카테고리) 룰
- [ ] 채널별 “필수 속성 세트” 라이브러리(버전 관리)
- [ ] 룰 적용 우선순위(카테고리>브랜드>상품군>기본)

### Sprint 3
- [ ] 속성 변환(단위/규격) DSL: 예) cm<->inch, g<->lb
- [ ] 다국어 필드(타이틀/설명) 번역 파이프라인 연결(옵션)

## Epic C. 매핑/검증 UI(룰 편집기)

### Sprint 1 (V393에서 반영)
- [x] Rules Editor 화면(템플릿 로딩/수정/저장)
- [x] 샘플 SKU 입력 -> Validate 결과 즉시 확인

### Sprint 2
- [ ] 필드 매핑 UI(드래그/드롭) + 룰 미리보기
- [ ] 검증 오류를 “수정 액션”으로 변환(예: title 길이 자동 축약 제안)

### Sprint 3
- [ ] 변경 이력/승인(거버넌스): 누가 룰을 바꿨는지 AuditLog에 남김
- [ ] 룰 배포(스테이징->프로덕션) 흐름

## Done in V393 (This Release)
- Template v2 + validation 엔진
- Provider 레이어(스텁) + writeback 실행 연결
- Rules Editor UI(초기 버전)
