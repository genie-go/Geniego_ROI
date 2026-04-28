const fs = require('fs');

const koTranslations = {
  accountPerf: {
    pageTitle: "어카운트(팀) 성과 분석",
    pageSub: "팀 및 계정별 퍼포먼스와 예산 요약",
    teamDashboard: "팀/어카운트 예산 대시보드"
  },
  acctPerf: {
    tabDashboard: "시각화 대시보드",
    tabDrilldown: "트리구조 계층 분석",
    objectiveAwareness: "브랜드 인지도 (Awareness)",
    objectiveConsideration: "고려도 (Consideration)",
    objectiveConversion: "퍼포먼스 전환 (Conversion)",
    kpiSpend: "누적 지출 (Spend Achieved)",
    avgRoas: "평균 ROAS",
    revenueTracking: "목표 기반 수익 트래킹",
    convRev: "전환(Conversion) 수익",
    awareRev: "인지도(Awareness) 수익",
    consRev: "고려도(Consideration) 수익",
    hierarchyTitle: "캠페인 ➔ 광고 세트 ➔ 광고 (계층 분석)",
    hierarchyDesc: "행을 클릭하여 마이크로 지표까지 즉시 드릴다운하세요."
  }
};

const jaTranslations = {
  accountPerf: {
    pageTitle: "アカウント(チーム)のパフォーマンス分析",
    pageSub: "チームとアカウント別の効率と予算ビュー",
    teamDashboard: "チーム/アカウントの予算ダッシュボード"
  },
  acctPerf: {
    tabDashboard: "可視化ダッシュボード",
    tabDrilldown: "ツリー構造のドリルダウン分析",
    objectiveAwareness: "ブランド認知度 (Awareness)",
    objectiveConsideration: "検討度 (Consideration)",
    objectiveConversion: "パフォーマンスコンバージョン (Conversion)",
    kpiSpend: "累積支出 (Spend Achieved)",
    avgRoas: "平均 ROAS",
    revenueTracking: "目標ベースの収益トラッキング",
    convRev: "コンバージョン(Conversion)収益",
    awareRev: "認知度(Awareness)収益",
    consRev: "検討度(Consideration)収益",
    hierarchyTitle: "キャンペーン ➔ 広告セット ➔ 広告 (階層分析)",
    hierarchyDesc: "行をクリックして、マイクロ指標まで即座にドリルダウンします。"
  }
};

function inject(file, trans) {
  let content = fs.readFileSync(file, 'utf8');
  let insertIndex = content.lastIndexOf('};');
  if(insertIndex === -1) return;
  
  let injection = '';
  // Convert object to string without brackets
  for (const [key, val] of Object.entries(trans)) {
    injection += `    ${key}: ${JSON.stringify(val, null, 4).replace(/^\{/g,'{\n      ').replace(/\n\s*\}/g,'\n    }')},\n`;
  }
  
  // Try to find if already injected
  if (content.includes('accountPerf: {')) {
    // Already has it, try to do a simple replace
    console.log("Already has accountPerf in " + file);
    return;
  }
  
  let newContent = content.slice(0, insertIndex) + (content[insertIndex-1] === ',' ? '' : ',') + '\n' + injection + content.slice(insertIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("Injected into " + file);
}

inject('frontend/src/i18n/locales/ko.js', koTranslations);
inject('frontend/src/i18n/locales/ja.js', jaTranslations);
