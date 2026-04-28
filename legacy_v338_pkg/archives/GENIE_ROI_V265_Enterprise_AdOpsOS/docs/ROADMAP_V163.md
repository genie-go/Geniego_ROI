# V163 Roadmap (A/B/C)

## (A) Naver: AdGroup 단위 예산/입찰 확장 로드맵
1. **API 스키마 확정**
   - 고객 계정/상품(SearchAd 타입)에 따라 AdGroup 필드명이 다를 수 있어 `NAVER_ADGROUP_BUDGET_FIELD`, `NAVER_ADGROUP_BID_FIELD`로 가변 처리.
   - 1주차: Sandbox 계정으로 GET /ncc/adgroups/{id} 응답에서 필드 검증.
2. **최소 기능(MVP)**
   - AdGroup 예산/입찰 변경(PUT with fields) + 스냅샷 + 롤백(스냅샷 기반)
   - Idempotency guard(변경 전/후 동일 시 스킵)
3. **운영 강화**
   - 부분 실패 시 **보상 롤백** (이미 반영된 adgroup 역순 복구)
   - 429/5xx 재시도 + 헤더 기반 rate-limit 관찰 지표
4. **확장**
   - 입찰전략/노출제한/키워드 단위까지 확장

## (B) 테넌트별 키/쿼터/승인정책을 제품 옵션으로 만드는 멀티테넌시 설계
- DB: tenants / api_keys / tenant_quotas / tenant_policies
- Gateway: X-API-Key → tenant_id/user_id/role 매핑
- Quota: per-minute(Redis) + daily(Postgres)
- Policy: YAML 기본값 + tenant_policies(JSON) merge
- 제품 옵션 예시:
  - **Basic**: daily 50, 승인 필수, 채널 2개 제한
  - **Pro**: daily 200, auto-execute 제한적 허용, 채널 5개
  - **Enterprise**: 무제한(계약), RBAC, 감사/증빙 Export, 커스텀 가드레일

## (C) Shadow uplift → 실험/가드레일/자동중단 프레임워크화
1. **Experiment registry**
   - experiments(status RUNNING/STOPPED) + experiment_guardrails
2. **Guardrails**
   - max_daily_spend
   - max_negative_uplift_pct
   - min_confidence
3. **Auto-stop**
   - guardrail 위반 시 STOPPED로 전환 + incidents 생성 + webhook 알림
4. **통계/품질**
   - n_control/n_treatment/variance 입력 시 유의성 계산(간이) → 이후 CUPED/베이지안/Sequential로 고도화
