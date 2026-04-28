const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

const KEYS = {
  ko: {
    // Units
    "unitCases": "건", "unitPersons": "명", "unitItems": "개",
    // Status labels
    "verified": "✓ 인증됨", "unverified": "미인증",
    "fixed": "고정", "performance": "성과", "fixedPerf": "고정+성과",
    "expired": "만료됨", "daysLeft": "일 남음",
    "signed": "✓ 서명완료", "pending": "⏳ 대기", "rejected": "✗ 거절",
    "stPaid": "완료", "stPartial": "일부지급", "stUnpaid": "미지급", "stOverpaid": "과지급",
    "perContract": "계약금액", "actualPaid": "실지급액", "difference": "차액",
    "recover": "회수", "payRemaining": "잔액 지급",
    "matchOk": "✓ 일치", "adReady": "광고 가능", "checkRights": "권한 확인",
    "adCreative": "광고 소재", "productPage": "상품 페이지",
    "engagement": "참여율", "viewsPerOrder": "조회/주문",
    "positive": "긍정", "neutral": "중립", "negative": "부정",
    "helpful": "명 도움됨",
    // Tabs
    "tab_identity": "🧑 크리에이터 통합", "tab_contract": "📝 계약·화이트리스트",
    "tab_settle": "💰 정산·감사", "tab_roi": "🏆 ROI 랭킹",
    "tab_ugc": "⭐ UGC 리뷰", "tab_ai_eval": "🤖 AI 평가",
    "tab_guide": "📖 가이드",
    "desc_identity": "정체성 · 중복 · 연결 채널", "desc_contract": "고정/성과 · 권한 · e-Sign",
    "desc_settle": "지급 · 감사 · 과지급", "desc_roi": "기여도 · 고조회/저구매",
    "desc_ugc": "리뷰 · 감성 · 이상", "desc_ai_eval": "점수 · 커미션 · 갱신",
    "desc_guide": "이용 가이드",
    // Guide tab
    "guideTitle": "인플루언서 & UGC 관리 가이드",
    "guideSub": "크리에이터 정체성 통합부터 계약 관리, 정산, ROI 분석, UGC 리뷰, AI 평가까지 전체 워크플로우를 안내합니다.",
    "guideStepsTitle": "인플루언서 관리 6단계",
    "guideStep1Title": "크리에이터 등록",
    "guideStep1Desc": "유튜브, 인스타그램, 틱톡 등 각 플랫폼 크리에이터를 등록하고 중복/사칭 계정을 자동 탐지합니다. 다중 핸들 통합으로 한 명의 크리에이터를 하나의 프로필로 관리하세요.",
    "guideStep2Title": "계약 체결",
    "guideStep2Desc": "고정비/성과비/혼합 계약을 설정하고, 권리 범위(광고 전환, 콘텐츠 재사용 등)를 정의합니다. e-Sign으로 전자 서명을 받고 화이트리스트 기간을 관리하세요.",
    "guideStep3Title": "콘텐츠 진행",
    "guideStep3Desc": "크리에이터의 콘텐츠 게시 현황을 추적하고, 각 콘텐츠의 조회수, 참여율, 주문 수, 매출 기여도를 실시간 모니터링합니다.",
    "guideStep4Title": "정산 처리",
    "guideStep4Desc": "계약 조건에 따라 자동으로 결제 금액을 산출합니다. 과지급/미지급을 자동 감지하고, 사업소득세(3.3%)/지방소득세(0.33%) 공제 후 실지급액을 계산합니다.",
    "guideStep5Title": "ROI 분석",
    "guideStep5Desc": "크리에이터별·콘텐츠별 ROI를 자동 산출하여 랭킹합니다. 고조회/저구매 콘텐츠를 식별하고, 재활용 가치가 높은 콘텐츠를 추천합니다.",
    "guideStep6Title": "AI 종합 평가",
    "guideStep6Desc": "Claude AI가 모든 크리에이터의 ROI, 전환율, 참여율, 콘텐츠 품질, 계약 준수도를 종합 분석하여 점수/등급을 산출하고, 적정 커미션과 계약 갱신 권고를 제공합니다.",
    "guideTabsTitle": "탭별 기능 안내",
    "guideIdentName": "크리에이터 통합", "guideIdentDesc": "다중 플랫폼 계정 통합 및 중복 탐지",
    "guideContractName": "계약 관리", "guideContractDesc": "계약 조건, e-Sign, 화이트리스트 관리",
    "guideSettleName": "정산 감사", "guideSettleDesc": "자동 정산 검증 및 이상 탐지",
    "guideRoiName": "ROI 랭킹", "guideRoiDesc": "크리에이터/콘텐츠 ROI 분석",
    "guideUgcName": "UGC 리뷰", "guideUgcDesc": "리뷰 감성 분석 및 부정 키워드 모니터링",
    "guideAiName": "AI 평가", "guideAiDesc": "AI 기반 종합 평가 및 커미션 추천",
    "guideTipsTitle": "팁 & 모범 사례",
    "guideTip1": "크리에이터 등록 시 모든 플랫폼 계정을 연결하면 중복 사칭을 자동 탐지할 수 있습니다.",
    "guideTip2": "화이트리스트 만료 90일 전 알림이 표시됩니다. 만료 전 갱신하여 광고 중단을 방지하세요.",
    "guideTip3": "정산 이상(과지급/미지급) 발생 시 즉시 알림이 표시되며, 정산 명세서 다운로드가 가능합니다.",
    "guideTip4": "ROI 5.0x 이상 크리에이터의 콘텐츠는 광고 소재로 재활용하면 높은 효율을 기대할 수 있습니다.",
    "guideTip5": "AI 평가는 실시간 데이터 기반으로 실행되므로, 최신 정산이 완료된 후 실행하면 더 정확한 결과를 얻을 수 있습니다."
  },
  en: {
    "unitCases": " cases", "unitPersons": " persons", "unitItems": " items",
    "verified": "✓ Verified", "unverified": "Unverified",
    "fixed": "Fixed", "performance": "Performance", "fixedPerf": "Fixed+Performance",
    "expired": "Expired", "daysLeft": "days left",
    "signed": "✓ Signed", "pending": "⏳ Pending", "rejected": "✗ Rejected",
    "stPaid": "Done", "stPartial": "Partial", "stUnpaid": "Unpaid", "stOverpaid": "Overpaid",
    "perContract": "Per contract", "actualPaid": "Actual Paid", "difference": "Difference",
    "recover": "Recover", "payRemaining": "Pay Remaining",
    "matchOk": "✓ Match", "adReady": "Ad Ready", "checkRights": "Check Rights",
    "adCreative": "Ad Creative", "productPage": "Product Page",
    "engagement": "Engagement", "viewsPerOrder": "views/order",
    "positive": "Positive", "neutral": "Neutral", "negative": "Negative",
    "helpful": "helpful",
    "tab_identity": "🧑 Creator Unified", "tab_contract": "📝 Contracts & Whitelist",
    "tab_settle": "💰 Settlement & Audit", "tab_roi": "🏆 ROI Ranking",
    "tab_ugc": "⭐ UGC Reviews", "tab_ai_eval": "🤖 AI Evaluation",
    "tab_guide": "📖 Guide",
    "desc_identity": "Identity · Duplicates · Channels", "desc_contract": "Fixed/Perf · Rights · e-Sign",
    "desc_settle": "Payouts · Audits · Overpayment", "desc_roi": "Attribution · High View/Low Sale",
    "desc_ugc": "Reviews · Sentiment · Anomalies", "desc_ai_eval": "Scoring · Comm Recs · Renewals",
    "desc_guide": "Usage Guide",
    "guideTitle": "Influencer & UGC Management Guide",
    "guideSub": "Complete workflow from creator identity unification, contract management, settlement, ROI analysis, UGC reviews, to AI evaluation.",
    "guideStepsTitle": "Influencer Management 6 Steps",
    "guideStep1Title": "Creator Registration",
    "guideStep1Desc": "Register creators from YouTube, Instagram, TikTok and other platforms. Automatically detect duplicate/impersonation accounts. Manage multiple handles under a single profile.",
    "guideStep2Title": "Contract Setup",
    "guideStep2Desc": "Configure fixed/performance/hybrid contracts, define rights scope (ad conversion, content reuse), collect e-signatures, and manage whitelist periods.",
    "guideStep3Title": "Content Tracking",
    "guideStep3Desc": "Track creator content publishing status. Monitor views, engagement rate, orders, and revenue attribution in real-time for each piece of content.",
    "guideStep4Title": "Settlement Processing",
    "guideStep4Desc": "Automatically calculate payment amounts based on contract terms. Detect overpayment/underpayment, and compute net payable after tax deductions (Business Income Tax 3.3%, Local Tax 0.33%).",
    "guideStep5Title": "ROI Analysis",
    "guideStep5Desc": "Automatically calculate and rank ROI by creator and content. Identify high-view/low-purchase content and recommend high-reuse-value content for ad creatives.",
    "guideStep6Title": "AI Comprehensive Evaluation",
    "guideStep6Desc": "Claude AI analyzes all creators' ROI, conversion rates, engagement, content quality, and contract compliance to generate scores/grades, optimal commission recommendations, and renewal advice.",
    "guideTabsTitle": "Tab Features",
    "guideIdentName": "Creator Unified", "guideIdentDesc": "Multi-platform account unification and duplicate detection",
    "guideContractName": "Contracts", "guideContractDesc": "Contract terms, e-Sign, whitelist management",
    "guideSettleName": "Settlement", "guideSettleDesc": "Auto-verified payments and anomaly detection",
    "guideRoiName": "ROI Ranking", "guideRoiDesc": "Creator and content ROI analysis",
    "guideUgcName": "UGC Reviews", "guideUgcDesc": "Review sentiment analysis and negative keyword monitoring",
    "guideAiName": "AI Evaluation", "guideAiDesc": "AI-powered scoring and commission recommendations",
    "guideTipsTitle": "Tips & Best Practices",
    "guideTip1": "Link all platform accounts when registering creators to enable automatic duplicate and impersonation detection.",
    "guideTip2": "Whitelist expiry alerts appear 90 days before expiration. Renew before expiry to prevent ad interruptions.",
    "guideTip3": "Settlement anomalies (overpayment/underpayment) trigger instant alerts. Download settlement statements for review.",
    "guideTip4": "Content from creators with ROI 5.0x+ delivers excellent results when repurposed as ad creatives.",
    "guideTip5": "Run AI evaluations after the latest settlements are complete for the most accurate scoring results."
  },
  ja: {
    "unitCases": "件", "unitPersons": "人", "unitItems": "個",
    "verified": "✓ 認証済み", "unverified": "未認証",
    "fixed": "固定", "performance": "成果", "fixedPerf": "固定+成果",
    "expired": "期限切れ", "daysLeft": "日残り",
    "signed": "✓ 署名完了", "pending": "⏳ 待機", "rejected": "✗ 拒否",
    "stPaid": "完了", "stPartial": "一部払い", "stUnpaid": "未払い", "stOverpaid": "過払い",
    "perContract": "契約金額", "actualPaid": "実支払額", "difference": "差額",
    "recover": "回収", "payRemaining": "残額支払い",
    "matchOk": "✓ 一致", "adReady": "広告可能", "checkRights": "権限確認",
    "adCreative": "広告素材", "productPage": "商品ページ",
    "engagement": "エンゲージメント", "viewsPerOrder": "閲覧/注文",
    "positive": "肯定", "neutral": "中立", "negative": "否定",
    "helpful": "人が参考になった",
    "tab_identity": "🧑 クリエイター統合", "tab_contract": "📝 契約・ホワイトリスト",
    "tab_settle": "💰 精算・監査", "tab_roi": "🏆 ROIランキング",
    "tab_ugc": "⭐ UGCレビュー", "tab_ai_eval": "🤖 AI評価",
    "tab_guide": "📖 ガイド",
    "desc_identity": "アイデンティティ・重複・チャネル", "desc_contract": "固定/成果・権利・e-Sign",
    "desc_settle": "支払い・監査・過払い", "desc_roi": "貢献・高閲覧/低購入",
    "desc_ugc": "レビュー・感性・異常", "desc_ai_eval": "スコア・コミッション・更新",
    "desc_guide": "利用ガイド",
    "guideTitle": "インフルエンサー＆UGC管理ガイド",
    "guideSub": "クリエイタのアイデンティティ統合から契約管理、精算、ROI分析、UGCレビュー、AI評価まで全ワークフローをご案内します。",
    "guideStepsTitle": "インフルエンサー管理6ステップ",
    "guideStep1Title": "クリエイター登録", "guideStep1Desc": "YouTube、Instagram、TikTok等のクリエイターを登録し、重複・なりすましアカウントを自動検出。複数ハンドルを一つのプロフィールで管理。",
    "guideStep2Title": "契約締結", "guideStep2Desc": "固定費/成果費/ハイブリッド契約を設定。権利範囲を定義し、電子署名を取得。ホワイトリスト期間を管理。",
    "guideStep3Title": "コンテンツ追跡", "guideStep3Desc": "クリエイターのコンテンツ公開状況を追跡。閲覧数、エンゲージメント率、注文数、売上貢献度をリアルタイム監視。",
    "guideStep4Title": "精算処理", "guideStep4Desc": "契約条件に基づき支払額を自動算出。過払い/未払いを自動検出し、税引後の実支払額を計算。",
    "guideStep5Title": "ROI分析", "guideStep5Desc": "クリエイター別・コンテンツ別ROIを自動算出しランキング。高閲覧/低購入コンテンツを特定し、再利用価値の高いコンテンツを推薦。",
    "guideStep6Title": "AI総合評価", "guideStep6Desc": "Claude AIが全クリエイターのROI、コンバージョン率、エンゲージメント、品質、契約遵守度を総合分析してスコア/グレードを算出。",
    "guideTabsTitle": "タブ機能案内",
    "guideIdentName": "クリエイター統合", "guideIdentDesc": "マルチプラットフォームアカウント統合と重複検出",
    "guideContractName": "契約管理", "guideContractDesc": "契約条件、e-Sign、ホワイトリスト管理",
    "guideSettleName": "精算監査", "guideSettleDesc": "自動精算検証と異常検出",
    "guideRoiName": "ROIランキング", "guideRoiDesc": "クリエイター/コンテンツROI分析",
    "guideUgcName": "UGCレビュー", "guideUgcDesc": "レビュー感性分析とネガティブキーワード監視",
    "guideAiName": "AI評価", "guideAiDesc": "AI基盤総合評価とコミッション推薦",
    "guideTipsTitle": "ヒント＆ベストプラクティス",
    "guideTip1": "クリエイター登録時に全プラットフォームアカウントを連携すると重複・なりすましを自動検出できます。",
    "guideTip2": "ホワイトリスト期限切れ90日前にアラートが表示されます。期限前に更新して広告中断を防止しましょう。",
    "guideTip3": "精算異常(過払い/未払い)発生時は即時アラートが表示され、精算明細のダウンロードが可能です。",
    "guideTip4": "ROI 5.0x以上のクリエイターコンテンツは広告素材として再利用すると高い効率が期待できます。",
    "guideTip5": "AI評価は最新の精算完了後に実行すると、より正確な結果が得られます。"
  },
  zh: {
    "unitCases": "件", "unitPersons": "人", "unitItems": "个",
    "verified": "✓ 已认证", "unverified": "未认证",
    "fixed": "固定", "performance": "绩效", "fixedPerf": "固定+绩效",
    "expired": "已过期", "daysLeft": "天剩余",
    "signed": "✓ 已签署", "pending": "⏳ 待处理", "rejected": "✗ 已拒绝",
    "stPaid": "已完成", "stPartial": "部分支付", "stUnpaid": "未支付", "stOverpaid": "多付",
    "perContract": "合同金额", "actualPaid": "实际支付", "difference": "差额",
    "recover": "追回", "payRemaining": "支付余额",
    "matchOk": "✓ 匹配", "adReady": "可投广告", "checkRights": "检查权限",
    "adCreative": "广告素材", "productPage": "产品页面",
    "engagement": "参与率", "viewsPerOrder": "浏览/订单",
    "positive": "正面", "neutral": "中性", "negative": "负面",
    "helpful": "人觉得有用",
    "tab_identity": "🧑 创作者统一", "tab_contract": "📝 合同与白名单",
    "tab_settle": "💰 结算与审计", "tab_roi": "🏆 ROI排名",
    "tab_ugc": "⭐ UGC评论", "tab_ai_eval": "🤖 AI评估",
    "tab_guide": "📖 指南",
    "desc_identity": "身份·重复·频道", "desc_contract": "固定/绩效·权利·电子签名",
    "desc_settle": "支付·审计·多付", "desc_roi": "贡献·高浏览/低购买",
    "desc_ugc": "评论·情感·异常", "desc_ai_eval": "评分·佣金·续约",
    "desc_guide": "使用指南",
    "guideTitle": "网红与UGC管理指南",
    "guideSub": "从创作者身份统一、合同管理、结算、ROI分析、UGC评论到AI评估的完整工作流程指南。",
    "guideStepsTitle": "网红管理6步骤",
    "guideStep1Title": "创作者注册", "guideStep1Desc": "注册YouTube、Instagram、TikTok等平台创作者，自动检测重复/冒充账户。将多个账号统一管理。",
    "guideStep2Title": "签订合同", "guideStep2Desc": "设置固定/绩效/混合合同，定义权利范围，收集电子签名，管理白名单期限。",
    "guideStep3Title": "内容跟踪", "guideStep3Desc": "跟踪创作者内容发布状态，实时监控浏览量、参与率、订单数和收入贡献。",
    "guideStep4Title": "结算处理", "guideStep4Desc": "根据合同条款自动计算付款金额，自动检测多付/少付，计算税后实际支付金额。",
    "guideStep5Title": "ROI分析", "guideStep5Desc": "按创作者和内容自动计算并排名ROI，识别高浏览/低购买内容，推荐高复用价值内容。",
    "guideStep6Title": "AI综合评估", "guideStep6Desc": "Claude AI综合分析所有创作者的ROI、转化率、参与度、内容质量和合同合规性，生成评分/等级和最优佣金建议。",
    "guideTabsTitle": "标签功能", "guideIdentName": "创作者统一", "guideIdentDesc": "多平台账户统一和重复检测", "guideContractName": "合同管理", "guideContractDesc": "合同条款、电子签名、白名单", "guideSettleName": "结算审计", "guideSettleDesc": "自动结算验证和异常检测", "guideRoiName": "ROI排名", "guideRoiDesc": "创作者/内容ROI分析", "guideUgcName": "UGC评论", "guideUgcDesc": "评论情感分析和负面关键词监控", "guideAiName": "AI评估", "guideAiDesc": "AI驱动评分和佣金推荐",
    "guideTipsTitle": "提示与最佳实践",
    "guideTip1": "注册创作者时关联所有平台账户可自动检测重复和冒充。", "guideTip2": "白名单到期前90天显示提醒，请及时续期以防止广告中断。", "guideTip3": "结算异常时即时提醒，可下载结算明细。", "guideTip4": "ROI 5.0x以上创作者的内容作为广告素材复用效果极佳。", "guideTip5": "在最新结算完成后运行AI评估可获得更准确的结果。"
  },
  "zh-TW": {
    "unitCases": "件", "unitPersons": "人", "unitItems": "個",
    "verified": "✓ 已認證", "unverified": "未認證",
    "fixed": "固定", "performance": "績效", "fixedPerf": "固定+績效",
    "expired": "已過期", "daysLeft": "天剩餘",
    "signed": "✓ 已簽署", "pending": "⏳ 待處理", "rejected": "✗ 已拒絕",
    "stPaid": "已完成", "stPartial": "部分支付", "stUnpaid": "未支付", "stOverpaid": "多付",
    "perContract": "合約金額", "actualPaid": "實際支付", "difference": "差額",
    "recover": "追回", "payRemaining": "支付餘額",
    "matchOk": "✓ 匹配", "adReady": "可投廣告", "checkRights": "檢查權限",
    "adCreative": "廣告素材", "productPage": "產品頁面",
    "engagement": "參與率", "viewsPerOrder": "瀏覽/訂單",
    "positive": "正面", "neutral": "中性", "negative": "負面",
    "helpful": "人覺得有用",
    "tab_identity": "🧑 創作者統一", "tab_contract": "📝 合約與白名單", "tab_settle": "💰 結算與審計", "tab_roi": "🏆 ROI排名", "tab_ugc": "⭐ UGC評論", "tab_ai_eval": "🤖 AI評估", "tab_guide": "📖 指南",
    "desc_identity": "身份·重複·頻道", "desc_contract": "固定/績效·權利·電子簽名", "desc_settle": "支付·審計·多付", "desc_roi": "貢獻·高瀏覽/低購買", "desc_ugc": "評論·情感·異常", "desc_ai_eval": "評分·佣金·續約", "desc_guide": "使用指南",
    "guideTitle": "網紅與UGC管理指南", "guideSub": "從創作者身份統一、合約管理、結算、ROI分析、UGC評論到AI評估的完整工作流程指南。",
    "guideStepsTitle": "網紅管理6步驟",
    "guideStep1Title": "創作者註冊", "guideStep1Desc": "註冊各平台創作者，自動偵測重複/冒充帳戶，多帳號統一管理。",
    "guideStep2Title": "簽訂合約", "guideStep2Desc": "設定固定/績效/混合合約，定義權利範圍，收集電子簽名，管理白名單期限。",
    "guideStep3Title": "內容追蹤", "guideStep3Desc": "追蹤創作者內容發布狀態，即時監控瀏覽量、參與率、訂單數和收入貢獻。",
    "guideStep4Title": "結算處理", "guideStep4Desc": "根據合約條款自動計算付款金額，自動偵測多付/少付，計算稅後實際支付金額。",
    "guideStep5Title": "ROI分析", "guideStep5Desc": "按創作者和內容自動計算並排名ROI，識別高瀏覽/低購買內容。",
    "guideStep6Title": "AI綜合評估", "guideStep6Desc": "Claude AI綜合分析所有創作者的ROI、轉化率、參與度、內容品質和合約合規性。",
    "guideTabsTitle": "標籤功能", "guideIdentName": "創作者統一", "guideIdentDesc": "多平台帳戶統一和重複偵測", "guideContractName": "合約管理", "guideContractDesc": "合約條款、電子簽名、白名單", "guideSettleName": "結算審計", "guideSettleDesc": "自動結算驗證和異常偵測", "guideRoiName": "ROI排名", "guideRoiDesc": "創作者/內容ROI分析", "guideUgcName": "UGC評論", "guideUgcDesc": "評論情感分析和負面關鍵字監控", "guideAiName": "AI評估", "guideAiDesc": "AI驅動評分和佣金推薦",
    "guideTipsTitle": "提示與最佳實踐",
    "guideTip1": "註冊時關聯所有平台帳戶可自動偵測重複和冒充。", "guideTip2": "白名單到期前90天顯示提醒。", "guideTip3": "結算異常時即時提醒，可下載結算明細。", "guideTip4": "ROI 5.0x以上創作者的內容作為廣告素材複用效果極佳。", "guideTip5": "在最新結算完成後運行AI評估可獲得更準確的結果。"
  },
  de: {
    "unitCases": " Fälle", "unitPersons": " Personen", "unitItems": " Elemente",
    "verified": "✓ Verifiziert", "unverified": "Nicht verifiziert",
    "fixed": "Fest", "performance": "Leistung", "fixedPerf": "Fest+Leistung",
    "expired": "Abgelaufen", "daysLeft": "Tage übrig",
    "signed": "✓ Unterzeichnet", "pending": "⏳ Ausstehend", "rejected": "✗ Abgelehnt",
    "stPaid": "Erledigt", "stPartial": "Teilzahlung", "stUnpaid": "Unbezahlt", "stOverpaid": "Überzahlt",
    "perContract": "Vertragsbetrag", "actualPaid": "Tatsächlich bezahlt", "difference": "Differenz",
    "recover": "Rückfordern", "payRemaining": "Restbetrag zahlen",
    "matchOk": "✓ Übereinstimmung", "adReady": "Werbefertig", "checkRights": "Rechte prüfen",
    "adCreative": "Werbematerial", "productPage": "Produktseite",
    "engagement": "Engagement", "viewsPerOrder": "Aufrufe/Bestellung",
    "positive": "Positiv", "neutral": "Neutral", "negative": "Negativ",
    "helpful": "fanden hilfreich",
    "tab_identity": "🧑 Creator Unified", "tab_contract": "📝 Verträge & Whitelist", "tab_settle": "💰 Abrechnung", "tab_roi": "🏆 ROI-Ranking", "tab_ugc": "⭐ UGC-Bewertungen", "tab_ai_eval": "🤖 AI-Bewertung", "tab_guide": "📖 Leitfaden",
    "desc_identity": "Identität · Duplikate · Kanäle", "desc_contract": "Fest/Leistung · Rechte · e-Sign", "desc_settle": "Zahlungen · Audits · Überzahlung", "desc_roi": "Attribution · Hohe Aufrufe/Niedrige Verkäufe", "desc_ugc": "Bewertungen · Stimmung · Anomalien", "desc_ai_eval": "Bewertung · Provision · Verlängerung", "desc_guide": "Nutzungsanleitung",
    "guideTitle": "Influencer & UGC Management Leitfaden", "guideSub": "Kompletter Workflow von Creator-Identitätsvereinheitlichung bis AI-Bewertung.",
    "guideStepsTitle": "Influencer-Management 6 Schritte",
    "guideStep1Title": "Creator-Registrierung", "guideStep1Desc": "Creator von YouTube, Instagram, TikTok registrieren. Duplikat-/Identitätsbetrug automatisch erkennen.",
    "guideStep2Title": "Vertragseinrichtung", "guideStep2Desc": "Fest-/Leistungs-/Hybridverträge konfigurieren, Rechteumfang definieren, e-Signaturen sammeln.",
    "guideStep3Title": "Content-Tracking", "guideStep3Desc": "Creator-Content-Status verfolgen. Aufrufe, Engagement, Bestellungen und Umsatzzuordnung in Echtzeit.",
    "guideStep4Title": "Abrechnungsverarbeitung", "guideStep4Desc": "Zahlungsbeträge basierend auf Vertragsbedingungen automatisch berechnen. Über-/Unterzahlung erkennen.",
    "guideStep5Title": "ROI-Analyse", "guideStep5Desc": "ROI nach Creator und Content automatisch berechnen und ranken.",
    "guideStep6Title": "AI-Gesamtbewertung", "guideStep6Desc": "Claude AI analysiert ROI, Konversionsraten, Engagement, Qualität und Vertragstreue aller Creator.",
    "guideTabsTitle": "Tab-Funktionen", "guideIdentName": "Creator Unified", "guideIdentDesc": "Multi-Plattform-Kontenvereinheitlichung", "guideContractName": "Verträge", "guideContractDesc": "Vertragsbedingungen und e-Sign", "guideSettleName": "Abrechnung", "guideSettleDesc": "Auto-Verifizierung und Anomalie-Erkennung", "guideRoiName": "ROI-Ranking", "guideRoiDesc": "Creator/Content ROI-Analyse", "guideUgcName": "UGC-Bewertungen", "guideUgcDesc": "Sentiment-Analyse und Keyword-Monitoring", "guideAiName": "AI-Bewertung", "guideAiDesc": "AI-basierte Bewertung und Provisionsempfehlung",
    "guideTipsTitle": "Tipps & Best Practices",
    "guideTip1": "Verknüpfen Sie alle Plattform-Konten bei der Registrierung zur automatischen Duplikaterkennung.", "guideTip2": "Whitelist-Ablauf-Alerts erscheinen 90 Tage vor Ablauf.", "guideTip3": "Bei Abrechnungsanomalien werden sofort Alerts ausgelöst.", "guideTip4": "Content von Creators mit ROI 5.0x+ liefert als Werbematerial hervorragende Ergebnisse.", "guideTip5": "AI-Bewertungen nach abgeschlossener Abrechnung liefern genauere Ergebnisse."
  },
  th: {
    "unitCases": " รายการ", "unitPersons": " คน", "unitItems": " รายการ",
    "verified": "✓ ยืนยันแล้ว", "unverified": "ยังไม่ยืนยัน",
    "fixed": "คงที่", "performance": "ผลงาน", "fixedPerf": "คงที่+ผลงาน",
    "expired": "หมดอายุ", "daysLeft": "วันเหลือ",
    "signed": "✓ เซ็นแล้ว", "pending": "⏳ รอดำเนินการ", "rejected": "✗ ปฏิเสธ",
    "stPaid": "เสร็จ", "stPartial": "จ่ายบางส่วน", "stUnpaid": "ยังไม่จ่าย", "stOverpaid": "จ่ายเกิน",
    "perContract": "ยอดสัญญา", "actualPaid": "จ่ายจริง", "difference": "ส่วนต่าง",
    "recover": "เรียกคืน", "payRemaining": "จ่ายที่เหลือ",
    "matchOk": "✓ ตรงกัน", "adReady": "พร้อมลงโฆษณา", "checkRights": "ตรวจสอบสิทธิ์",
    "adCreative": "ชิ้นงานโฆษณา", "productPage": "หน้าสินค้า",
    "engagement": "การมีส่วนร่วม", "viewsPerOrder": "ยอดดู/คำสั่งซื้อ",
    "positive": "เชิงบวก", "neutral": "เป็นกลาง", "negative": "เชิงลบ",
    "helpful": "คนว่ามีประโยชน์",
    "tab_identity": "🧑 รวมครีเอเตอร์", "tab_contract": "📝 สัญญา", "tab_settle": "💰 การชำระ", "tab_roi": "🏆 ROI", "tab_ugc": "⭐ รีวิว UGC", "tab_ai_eval": "🤖 AI ประเมิน", "tab_guide": "📖 คู่มือ",
    "desc_identity": "ตัวตน·ซ้ำ·ช่อง", "desc_contract": "คงที่/ผลงาน·สิทธิ์·e-Sign", "desc_settle": "จ่าย·ตรวจ·จ่ายเกิน", "desc_roi": "การมีส่วนร่วม·ยอดดูสูง/ซื้อน้อย", "desc_ugc": "รีวิว·อารมณ์·ผิดปกติ", "desc_ai_eval": "คะแนน·ค่าคอม·ต่อสัญญา", "desc_guide": "คู่มือใช้งาน",
    "guideTitle": "คู่มือจัดการอินฟลูเอนเซอร์และ UGC", "guideSub": "เวิร์คโฟลว์ครบจากการรวมตัวตนครีเอเตอร์ไปจนถึงการประเมิน AI",
    "guideStepsTitle": "6 ขั้นตอนจัดการอินฟลูเอนเซอร์",
    "guideStep1Title": "ลงทะเบียนครีเอเตอร์", "guideStep1Desc": "ลงทะเบียนจาก YouTube, Instagram, TikTok ตรวจจับบัญชีซ้ำ/ปลอมอัตโนมัติ",
    "guideStep2Title": "ตั้งค่าสัญญา", "guideStep2Desc": "ตั้งค่าสัญญาแบบคงที่/ผลงาน/ผสม กำหนดขอบเขตสิทธิ์ รับลายเซ็นอิเล็กทรอนิกส์",
    "guideStep3Title": "ติดตามเนื้อหา", "guideStep3Desc": "ติดตามสถานะการโพสต์ ดูยอด Engagement คำสั่งซื้อ และรายได้แบบเรียลไทม์",
    "guideStep4Title": "การชำระเงิน", "guideStep4Desc": "คำนวณยอดชำระอัตโนมัติตามสัญญา ตรวจจับจ่ายเกิน/จ่ายขาด",
    "guideStep5Title": "วิเคราะห์ ROI", "guideStep5Desc": "คำนวณและจัดอันดับ ROI ตามครีเอเตอร์และเนื้อหาอัตโนมัติ",
    "guideStep6Title": "AI ประเมินผลรวม", "guideStep6Desc": "Claude AI วิเคราะห์ ROI, อัตราแปลง, Engagement, คุณภาพเนื้อหา ให้คะแนนและแนะนำค่าคอม",
    "guideTabsTitle": "ฟีเจอร์แต่ละแท็บ", "guideIdentName": "รวมครีเอเตอร์", "guideIdentDesc": "รวมบัญชีหลายแพลตฟอร์ม", "guideContractName": "สัญญา", "guideContractDesc": "เงื่อนไข e-Sign ไวท์ลิสต์", "guideSettleName": "การชำระ", "guideSettleDesc": "ตรวจสอบการชำระอัตโนมัติ", "guideRoiName": "ROI", "guideRoiDesc": "วิเคราะห์ ROI ครีเอเตอร์", "guideUgcName": "รีวิว UGC", "guideUgcDesc": "วิเคราะห์อารมณ์รีวิว", "guideAiName": "AI ประเมิน", "guideAiDesc": "ประเมินด้วย AI และแนะนำค่าคอม",
    "guideTipsTitle": "เคล็ดลับ", "guideTip1": "เชื่อมทุกบัญชีแพลตฟอร์มเพื่อตรวจจับซ้ำอัตโนมัติ", "guideTip2": "แจ้งเตือนก่อนไวท์ลิสต์หมดอายุ 90 วัน", "guideTip3": "แจ้งเตือนทันทีเมื่อพบการชำระผิดปกติ", "guideTip4": "เนื้อหาจากครีเอเตอร์ ROI 5.0x+ ใช้ซ้ำเป็นโฆษณาได้ผลดี", "guideTip5": "รัน AI หลังชำระล่าสุดเสร็จเพื่อผลลัพธ์แม่นยำ"
  },
  vi: {
    "unitCases": " vụ", "unitPersons": " người", "unitItems": " mục",
    "verified": "✓ Đã xác minh", "unverified": "Chưa xác minh",
    "fixed": "Cố định", "performance": "Hiệu suất", "fixedPerf": "Cố định+Hiệu suất",
    "expired": "Đã hết hạn", "daysLeft": "ngày còn lại",
    "signed": "✓ Đã ký", "pending": "⏳ Chờ xử lý", "rejected": "✗ Đã từ chối",
    "stPaid": "Hoàn tất", "stPartial": "Thanh toán một phần", "stUnpaid": "Chưa thanh toán", "stOverpaid": "Thanh toán thừa",
    "perContract": "Theo hợp đồng", "actualPaid": "Đã thanh toán", "difference": "Chênh lệch",
    "recover": "Thu hồi", "payRemaining": "Thanh toán còn lại",
    "matchOk": "✓ Khớp", "adReady": "Sẵn sàng quảng cáo", "checkRights": "Kiểm tra quyền",
    "adCreative": "Chất liệu QC", "productPage": "Trang sản phẩm",
    "engagement": "Tương tác", "viewsPerOrder": "lượt xem/đơn",
    "positive": "Tích cực", "neutral": "Trung lập", "negative": "Tiêu cực",
    "helpful": "thấy hữu ích",
    "tab_identity": "🧑 Hợp nhất Creator", "tab_contract": "📝 Hợp đồng", "tab_settle": "💰 Thanh toán", "tab_roi": "🏆 Xếp hạng ROI", "tab_ugc": "⭐ Đánh giá UGC", "tab_ai_eval": "🤖 Đánh giá AI", "tab_guide": "📖 Hướng dẫn",
    "desc_identity": "Danh tính·Trùng lặp·Kênh", "desc_contract": "Cố định/Hiệu suất·Quyền·e-Sign", "desc_settle": "Thanh toán·Kiểm toán·Thừa", "desc_roi": "Đóng góp·Xem nhiều/Mua ít", "desc_ugc": "Đánh giá·Cảm xúc·Bất thường", "desc_ai_eval": "Điểm·Hoa hồng·Gia hạn", "desc_guide": "Hướng dẫn sử dụng",
    "guideTitle": "Hướng dẫn quản lý Influencer & UGC", "guideSub": "Quy trình từ hợp nhất creator, quản lý hợp đồng, thanh toán, phân tích ROI, đánh giá UGC đến đánh giá AI.",
    "guideStepsTitle": "6 bước quản lý Influencer",
    "guideStep1Title": "Đăng ký Creator", "guideStep1Desc": "Đăng ký creator từ YouTube, Instagram, TikTok. Tự động phát hiện tài khoản trùng lặp/mạo danh.",
    "guideStep2Title": "Thiết lập hợp đồng", "guideStep2Desc": "Cấu hình hợp đồng cố định/hiệu suất/kết hợp, xác định phạm vi quyền, thu thập chữ ký điện tử.",
    "guideStep3Title": "Theo dõi nội dung", "guideStep3Desc": "Theo dõi nội dung creator. Giám sát lượt xem, tỷ lệ tương tác, đơn hàng và doanh thu theo thời gian thực.",
    "guideStep4Title": "Xử lý thanh toán", "guideStep4Desc": "Tự động tính toán số tiền thanh toán. Phát hiện thanh toán thừa/thiếu, tính số tiền thực nhận sau thuế.",
    "guideStep5Title": "Phân tích ROI", "guideStep5Desc": "Tự động tính và xếp hạng ROI theo creator và nội dung.",
    "guideStep6Title": "Đánh giá AI toàn diện", "guideStep6Desc": "Claude AI phân tích tổng hợp ROI, tỷ lệ chuyển đổi, tương tác, chất lượng và tuân thủ hợp đồng.",
    "guideTabsTitle": "Tính năng tab", "guideIdentName": "Hợp nhất Creator", "guideIdentDesc": "Hợp nhất tài khoản đa nền tảng", "guideContractName": "Hợp đồng", "guideContractDesc": "Điều khoản, e-Sign, whitelist", "guideSettleName": "Thanh toán", "guideSettleDesc": "Xác minh tự động và phát hiện bất thường", "guideRoiName": "ROI", "guideRoiDesc": "Phân tích ROI creator/nội dung", "guideUgcName": "Đánh giá UGC", "guideUgcDesc": "Phân tích cảm xúc đánh giá", "guideAiName": "Đánh giá AI", "guideAiDesc": "Chấm điểm AI và đề xuất hoa hồng",
    "guideTipsTitle": "Mẹo & Thực hành tốt nhất", "guideTip1": "Liên kết tất cả tài khoản nền tảng để tự động phát hiện trùng lặp.", "guideTip2": "Cảnh báo whitelist hết hạn hiển thị trước 90 ngày.", "guideTip3": "Cảnh báo tức thời khi phát hiện bất thường thanh toán.", "guideTip4": "Nội dung từ creator ROI 5.0x+ cho kết quả tuyệt vời khi tái sử dụng.", "guideTip5": "Chạy đánh giá AI sau khi thanh toán mới nhất hoàn tất."
  },
  id: {
    "unitCases": " kasus", "unitPersons": " orang", "unitItems": " item",
    "verified": "✓ Terverifikasi", "unverified": "Belum verifikasi",
    "fixed": "Tetap", "performance": "Kinerja", "fixedPerf": "Tetap+Kinerja",
    "expired": "Kedaluwarsa", "daysLeft": "hari tersisa",
    "signed": "✓ Ditandatangani", "pending": "⏳ Menunggu", "rejected": "✗ Ditolak",
    "stPaid": "Selesai", "stPartial": "Sebagian", "stUnpaid": "Belum dibayar", "stOverpaid": "Kelebihan bayar",
    "perContract": "Per kontrak", "actualPaid": "Dibayar", "difference": "Selisih",
    "recover": "Pulihkan", "payRemaining": "Bayar sisa",
    "matchOk": "✓ Cocok", "adReady": "Siap iklan", "checkRights": "Periksa hak",
    "adCreative": "Materi iklan", "productPage": "Halaman produk",
    "engagement": "Engagement", "viewsPerOrder": "tayangan/pesanan",
    "positive": "Positif", "neutral": "Netral", "negative": "Negatif",
    "helpful": "merasa terbantu",
    "tab_identity": "🧑 Creator Terpadu", "tab_contract": "📝 Kontrak", "tab_settle": "💰 Pembayaran", "tab_roi": "🏆 Peringkat ROI", "tab_ugc": "⭐ Ulasan UGC", "tab_ai_eval": "🤖 Evaluasi AI", "tab_guide": "📖 Panduan",
    "desc_identity": "Identitas·Duplikat·Saluran", "desc_contract": "Tetap/Kinerja·Hak·e-Sign", "desc_settle": "Pembayaran·Audit·Kelebihan", "desc_roi": "Atribusi·Tayangan tinggi/Penjualan rendah", "desc_ugc": "Ulasan·Sentimen·Anomali", "desc_ai_eval": "Skor·Komisi·Perpanjangan", "desc_guide": "Panduan penggunaan",
    "guideTitle": "Panduan Manajemen Influencer & UGC", "guideSub": "Alur kerja lengkap dari penyatuan identitas kreator hingga evaluasi AI.",
    "guideStepsTitle": "6 Langkah Manajemen Influencer",
    "guideStep1Title": "Pendaftaran Creator", "guideStep1Desc": "Daftarkan creator dari YouTube, Instagram, TikTok. Deteksi otomatis akun duplikat/palsu.",
    "guideStep2Title": "Pengaturan Kontrak", "guideStep2Desc": "Konfigurasi kontrak tetap/kinerja/hybrid, tentukan lingkup hak, kumpulkan tanda tangan elektronik.",
    "guideStep3Title": "Pelacakan Konten", "guideStep3Desc": "Lacak status penerbitan konten. Monitor tayangan, engagement, pesanan, dan pendapatan secara real-time.",
    "guideStep4Title": "Pemrosesan Pembayaran", "guideStep4Desc": "Hitung otomatis jumlah pembayaran berdasarkan kontrak. Deteksi kelebihan/kekurangan bayar.",
    "guideStep5Title": "Analisis ROI", "guideStep5Desc": "Hitung dan rangking ROI otomatis per kreator dan konten.",
    "guideStep6Title": "Evaluasi AI Komprehensif", "guideStep6Desc": "Claude AI menganalisis ROI, konversi, engagement, kualitas, dan kepatuhan kontrak semua kreator.",
    "guideTabsTitle": "Fitur Tab", "guideIdentName": "Creator Terpadu", "guideIdentDesc": "Penyatuan akun multi-platform", "guideContractName": "Kontrak", "guideContractDesc": "Ketentuan, e-Sign, whitelist", "guideSettleName": "Pembayaran", "guideSettleDesc": "Verifikasi otomatis dan deteksi anomali", "guideRoiName": "ROI", "guideRoiDesc": "Analisis ROI kreator/konten", "guideUgcName": "Ulasan UGC", "guideUgcDesc": "Analisis sentimen ulasan", "guideAiName": "Evaluasi AI", "guideAiDesc":"Penilaian AI dan rekomendasi komisi",
    "guideTipsTitle": "Tips & Praktik Terbaik", "guideTip1": "Hubungkan semua akun platform saat pendaftaran untuk deteksi duplikat otomatis.", "guideTip2": "Peringatan whitelist kedaluwarsa muncul 90 hari sebelumnya.", "guideTip3": "Peringatan instan saat terdeteksi anomali pembayaran.", "guideTip4": "Konten dari kreator ROI 5.0x+ memberikan hasil luar biasa sebagai materi iklan.", "guideTip5": "Jalankan evaluasi AI setelah pembayaran terbaru selesai untuk hasil paling akurat."
  }
};

const LANGS = ['ko','en','ja','zh','zh-TW','de','th','vi','id'];

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = KEYS[lang] || KEYS.en;

  // Find "influencer" block
  const blockStart = code.indexOf('"influencer":{');
  if (blockStart < 0) { console.log(`❌ ${lang}: influencer block not found, creating...`);
    // Find a good insertion point - before the last }
    const lastBrace = code.lastIndexOf('}');
    const insertStr = ',"influencer":{' + Object.entries(keys).map(([k,v]) => `"${k}":"${v.replace(/"/g,'\\"')}"`).join(',') + '}';
    code = code.substring(0, lastBrace) + insertStr + code.substring(lastBrace);
    fs.writeFileSync(file, code, 'utf8');
    console.log(`✅ ${lang}: created influencer block with ${Object.keys(keys).length} keys`);
    return;
  }

  // Find end of influencer block
  let depth = 0, endIdx = -1;
  for (let i = blockStart + 13; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  if (endIdx < 0) { console.log(`❌ ${lang}: influencer block end not found`); return; }

  const block = code.substring(blockStart, endIdx);
  let insertStr = '';
  let added = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (block.includes(`"${k}"`)) continue;
    const safeV = v.replace(/"/g, '\\"');
    insertStr += `,"${k}":"${safeV}"`;
    added++;
  }

  if (insertStr) {
    code = code.substring(0, endIdx) + insertStr + code.substring(endIdx);
    fs.writeFileSync(file, code, 'utf8');
  }
  console.log(`✅ ${lang}: ${added} keys added`);
});

console.log('\n🎉 Influencer i18n patch complete!');
