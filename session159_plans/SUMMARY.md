# Session 159 — P5 non-ko locale dry-run summary

Generated: 2026-05-25T02:25:35.355Z
Plan count: 12

| locale | pre_collisions | delete | est Δ | block del | leaf del | demoted | pre_leaves | pre_size |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ar | 0 | 0 | 0 | 0 | 0 | 0 | 24,045 | 1,120,437 |
| de | 0 | 0 | 0 | 0 | 0 | 0 | 26,904 | 1,209,323 |
| en | 0 | 0 | 0 | 0 | 0 | 0 | 24,967 | 1,122,433 |
| es | 0 | 0 | 0 | 0 | 0 | 0 | 24,967 | 1,123,320 |
| fr | 0 | 0 | 0 | 0 | 0 | 0 | 24,967 | 1,123,353 |
| hi | 0 | 0 | 0 | 0 | 0 | 0 | 24,044 | 1,123,225 |
| id | 0 | 0 | 0 | 0 | 0 | 0 | 29,734 | 1,314,593 |
| pt | 0 | 0 | 0 | 0 | 0 | 0 | 24,044 | 1,113,978 |
| ru | 0 | 0 | 0 | 0 | 0 | 0 | 24,044 | 1,120,233 |
| th | 0 | 0 | 0 | 0 | 0 | 0 | 29,690 | 1,499,897 |
| vi | 0 | 0 | 0 | 0 | 0 | 0 | 26,885 | 1,209,057 |
| zh-TW | 0 | 0 | 0 | 0 | 0 | 0 | 28,248 | 1,239,703 |
| **TOTAL** | **0** | **0** | **0** | **0** | **0** | **0** | **312,539** | **14,319,552** |

## 검수자 노트

- 본 표는 **dry-run** 결과. apply 는 사용자 canonical 결정 후 별도 트랙.
- delete count = 0 인 locale 은 detector 가 collision 미발견 (또는 CSV 가 header-only).
- estimated Δ ≠ 0 인 항목은 patch03 case 3 (no same-path survivor, no shadow) 의 실손실 추정.

