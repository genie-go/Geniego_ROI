# Session 154 placeholder triage v2 — summary

generated: 2026-05-24T02:55:22.704Z

scope: pages.marketingIntel.* (self-nest excluded)

scanned: 7043 keys across 15 locales


## Action distribution

- translate (≥3 locales placeholder): **770**
- review (1-2 locales): **113**
- skip (clean): **6160**

## Pattern auto-labels

| Pattern | Count | Description |
|---|---|---|
| PAT_A | 8 | influencer.actionPresets.guide.* — needs new copy authored across all 15 locales |
| PAT_B | 137 | ko PASS + ≥3 other locales fail — mechanical translation (ko→14) |
| PAT_C | 50 | influencerUGC.txt_* — ko source missing, others hold literal key as value |
| PAT_D | 3813 | key-parity drift — present in some locales, missing in ≥5 others |
| PAT_E | 9 | ko regression — ko fail while ≥10 other locales PASS (rare flag) |
| PAT_F | 11 | degenerate keys — leaf length ≤ 2 non-alphabetic (remove candidates, not translate) |
| PAT_X | 3015 | residual / mixed |

## Suggested next-session work splits

- **155 phase 1**: PAT_B (mechanical ko→14 translation). Lowest risk, highest leverage.
- **155 phase 2**: PAT_D (key-parity drift). Decide canonical key set per page section; remove orphans or add MISSING locales.
- **155 phase 3**: PAT_C (UGC ko-source authoring → propagate).
- **155 phase 4**: PAT_A (guide tour UX writing).
- **155 phase 5**: PAT_F (degenerate keys cleanup — rm not translate).
- **155 phase 6**: PAT_E spot-fixes (ko regression).
- **155 phase 7**: PAT_X residual triage.

## CSV columns

`keypath, pattern, action, ko_pass, n_locales_pass, n_locales_placeholder, n_locales_missing, {locale}_value, {locale}_class` for each locale.
