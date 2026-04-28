# V236 Runbook

## 1) Vault-aware Google discovery
- SecretRef가 vault_ref인 경우에도 API가 Vault에서 실토큰(access_token)을 읽어 discovery를 수행합니다.
- 필요한 환경변수:
  - VAULT_ADDR + (VAULT_TOKEN 또는 VAULT_ROLE_ID/VAULT_SECRET_ID)
  - GOOGLE_DEVELOPER_TOKEN, GOOGLE_CUSTOMER_ID, (optional) GOOGLE_LOGIN_CUSTOMER_ID

## 2) Bulk mapping
- POST /v1/google/discover_and_map_bulk
  - body: { campaign_ids?: [..], dry_run?: bool }
- 동작:
  - tenant의 google 캠페인을 대상으로 GAQL 조회
  - 성공한 캠페인은 google_budget_mappings에 저장(또는 dry_run이면 저장 안 함)
  - 일부 실패는 errors 배열로 반환

## 3) UI
- Google Mapping 카드에 Bulk Discover+Map 버튼 추가(원클릭).
