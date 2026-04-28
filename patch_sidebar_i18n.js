const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/src/i18n/locales');

// We will inject keys into patch_xx objects at the bottom of the files, or replace them globally.
const patchLocales = () => {
    const files = ['ja.js', 'ko.js', 'en.js'];
    
    files.forEach(file => {
        const filePath = path.join(localesDir, file);
        if (!fs.existsSync(filePath)) return;
        
        let content = fs.readFileSync(filePath, 'utf8');

        const isJa = file === 'ja.js';
        const isKo = file === 'ko.js';
        const isEn = file === 'en.js';

        // Translations mapping
        const tr = {
            adPerformance: isJa ? "広告パフォーマンス" : isKo ? "광고 성과" : "Ad Performance",
            budgetTracker: isJa ? "予算管理トラッカー" : isKo ? "예산 관리" : "Budget Tracker",
            accountPerf: isJa ? "アカウント成果" : isKo ? "어카운트 성과" : "Account Performance",
            attribution: isJa ? "アトリビューション" : isKo ? "어트리뷰션 기여도" : "Attribution",
            channelKpi: isJa ? "チャネルKPI" : isKo ? "채널 KPI" : "Channel KPI",
            graphScore: isJa ? "グラフスコア" : isKo ? "그래프 스코어" : "Graph Score",
            marketingDesc: isJa ? "マーケティング分析" : isKo ? "마케팅 현황 분석" : "Marketing Analysis",
            
            // For AdStatusAnalysis/Marketing
            adMetaDetailDesc: isJa ? "広告の現状・分析" : isKo ? "광고 현황·분석" : "Marketing & Ads Analysis",
            adMetaDetailSub: isJa ? "広告統合インサイト・チャネル効果評価" : isKo ? "광고 통합 인사이트 및 채널 효과 평가 분석" : "Consolidated Ad Insights & Channel Eval",
            adMetaDynChart: isJa ? "動的パフォーマンストレンド" : isKo ? "다이내믹 성과 트렌드" : "Dynamic Performance Trends",
            totalLabel: isJa ? "合計" : isKo ? "합계" : "Total",
            
            goalAware: isJa ? "認知 (トップファネル)" : isKo ? "인지도 (Top Funnel)" : "Awareness (Top Funnel)",
            goalCons: isJa ? "検討 (ミッドファネル)" : isKo ? "고려 (Mid Funnel)" : "Consideration (Mid Funnel)",
            goalConv: isJa ? "コンバージョン (ボトムファネル)" : isKo ? "전환 (Bottom Funnel)" : "Conversion (Bottom Funnel)",
            
            metricImpr: isJa ? "インプレッション" : isKo ? "노출수" : "Impressions",
            metricReach: isJa ? "リーチ" : isKo ? "도달수" : "Reach",
            metricSpend: isJa ? "支出額" : isKo ? "지출 금액" : "Spend",
            metricClicks: isJa ? "クリック数" : isKo ? "클릭수" : "Clicks",
            metricCtr: isJa ? "CTR (%)" : isKo ? "CTR (%)" : "CTR (%)",
            metricCpc: isJa ? "CPC" : isKo ? "CPC" : "CPC",
            metricCpm: isJa ? "CPM" : isKo ? "CPM" : "CPM",
            metricConv: isJa ? "コンバージョン" : isKo ? "총 전환수" : "Conversions",
            metricRoas: isJa ? "ROAS" : isKo ? "ROAS" : "ROAS",

            adTableTitle: isJa ? "広告階層分析" : isKo ? "광고 계층 분석" : "Ad Hierarchy Analysis",
            adTableSub: isJa ? "キャンペーン別パフォーマンス" : isKo ? "캠페인별 세부 성과" : "Performance by Campaign",
            colStatus: isJa ? "ステータス" : isKo ? "상태" : "Status",
            colItemName: isJa ? "アイテム名" : isKo ? "항목명" : "Item Name",
            colResultConv: isJa ? "結果 (転換)" : isKo ? "결과 (전환)" : "Result (Conv)",
            colCpa: isJa ? "CPA" : isKo ? "CPA(전환단가)" : "CPA",
            colSpend: isJa ? "支出" : isKo ? "지출금액" : "Spend",
            colImpr: isJa ? "インプレッション" : isKo ? "노출" : "Impressions",
            colRoas: isJa ? "ROAS" : isKo ? "ROAS" : "ROAS",
            
            sidebarPerformanceMkt: isJa ? "パフォーマンスマーケティング" : isKo ? "퍼포먼스 마케팅" : "Performance Marketing",
            
        };

        // Create a patch object string
        const patchString = JSON.stringify(tr).slice(1, -1); // remove open and close brackets

        // We will append these properties to `patch_xx` if it exists, otherwise just global regex
        if (content.indexOf(`const patch_${isJa ? "ja" : isKo ? "ko" : "en"} = {`) !== -1) {
            content = content.replace(
                new RegExp(`(const patch_${isJa ? "ja" : isKo ? "ko" : "en"} = \\{)`),
                `$1${patchString},`
            );
        } else {
            // Append as a new patch
            content += `\n\n// Sidebar Patch Injection\nconst patch_sidebar_${file.split('.')[0]} = {${patchString}};\n`;
            content += `Object.keys(patch_sidebar_${file.split('.')[0]}).forEach(k => { ${file.split('.')[0]}["marketing"] = ${file.split('.')[0]}["marketing"] || {}; ${file.split('.')[0]}["marketing"][k] = patch_sidebar_${file.split('.')[0]}[k]; });\n`;
            
            // Also directly patch root properties since sidebar might access root
            content += `Object.keys(patch_sidebar_${file.split('.')[0]}).forEach(k => { ${file.split('.')[0]}[k] = patch_sidebar_${file.split('.')[0]}[k]; });\n`;
            content += `export default ${file.split('.')[0]};\n`;
            
            // Clean up double exports
            content = content.replace(/export default (ja|ko|en);\s*export default (ja|ko|en);/, 'export default $1;');
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
    });
};

patchLocales();
console.log("Locales patched successfully with ja/ko mappings.");
