#!/usr/bin/env node
/**
 * P0 i18n — attrData.* P3 ConfidenceTab 신규 14키 15개국 주입.
 * acorn 위치탐색 + 문자열 splice(재직렬화 없이 포맷 보존, sacred ja/zh 최소변경).
 * 기존 키(colChannel 등)는 skip. 멱등.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('acorn');

const LOCDIR = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'locales');

// 14 new keys; KEY ORDER fixed. ko = source-of-truth (JSX fallback와 동일).
const KEYS = ['tabConfLabel','tabConfDesc','overallConf','bootstrapNote','explainTitle','explainNarrative','colCredit','colCI','colRemoval','colStability','stbHigh','stbMed','stbLow','noData'];

const T = {
  ko: {
    tabConfLabel: '🎯 신뢰도·설명',
    tabConfDesc: '부트스트랩 신뢰구간',
    overallConf: '전체 신뢰도 (안정 채널 비율)',
    bootstrapNote: '부트스트랩 30회 재표본 · 90% 신뢰구간',
    explainTitle: '왜 이 채널인가 (설명가능성)',
    explainNarrative: '{ch} 제거 시 전환이 약 {rem}% 감소 — 가장 영향이 큰 채널입니다. 기여도 {share}% (신뢰구간 {lo}~{hi}%, 안정성 {stb}).',
    colCredit: '기여도 %',
    colCI: '90% 신뢰구간',
    colRemoval: '제거효과 %',
    colStability: '안정성',
    stbHigh: '높음',
    stbMed: '보통',
    stbLow: '낮음',
    noData: '전환 여정 데이터가 없습니다.',
  },
  en: {
    tabConfLabel: '🎯 Confidence · Explainability',
    tabConfDesc: 'Bootstrap confidence intervals',
    overallConf: 'Overall confidence (stable channel ratio)',
    bootstrapNote: 'Bootstrap 30 resamples · 90% confidence interval',
    explainTitle: 'Why this channel (explainability)',
    explainNarrative: 'Removing {ch} reduces conversions by ~{rem}% — the most impactful channel. Credit {share}% (CI {lo}–{hi}%, stability {stb}).',
    colCredit: 'Credit %',
    colCI: '90% CI',
    colRemoval: 'Removal effect %',
    colStability: 'Stability',
    stbHigh: 'High',
    stbMed: 'Medium',
    stbLow: 'Low',
    noData: 'No conversion journey data available.',
  },
  ja: {
    tabConfLabel: '🎯 信頼度・説明',
    tabConfDesc: 'ブートストラップ信頼区間',
    overallConf: '全体信頼度（安定チャネル比率）',
    bootstrapNote: 'ブートストラップ30回再標本 · 90%信頼区間',
    explainTitle: 'なぜこのチャネルか（説明可能性）',
    explainNarrative: '{ch} を除外するとコンバージョンが約{rem}%減少 — 最も影響の大きいチャネルです。貢献度{share}%（信頼区間{lo}〜{hi}%、安定性{stb}）。',
    colCredit: '貢献度 %',
    colCI: '90% 信頼区間',
    colRemoval: '除外効果 %',
    colStability: '安定性',
    stbHigh: '高',
    stbMed: '中',
    stbLow: '低',
    noData: 'コンバージョン経路データがありません。',
  },
  zh: {
    tabConfLabel: '🎯 置信度·解释',
    tabConfDesc: '自助法置信区间',
    overallConf: '整体置信度（稳定渠道占比）',
    bootstrapNote: '自助重采样30次 · 90%置信区间',
    explainTitle: '为何是该渠道（可解释性）',
    explainNarrative: '移除 {ch} 后转化约下降{rem}% — 影响最大的渠道。贡献度{share}%（置信区间{lo}~{hi}%，稳定性{stb}）。',
    colCredit: '贡献度 %',
    colCI: '90% 置信区间',
    colRemoval: '移除效应 %',
    colStability: '稳定性',
    stbHigh: '高',
    stbMed: '中',
    stbLow: '低',
    noData: '暂无转化路径数据。',
  },
  'zh-TW': {
    tabConfLabel: '🎯 信賴度·解釋',
    tabConfDesc: '自助法信賴區間',
    overallConf: '整體信賴度（穩定通路占比）',
    bootstrapNote: '自助重抽樣30次 · 90%信賴區間',
    explainTitle: '為何是該通路（可解釋性）',
    explainNarrative: '移除 {ch} 後轉換約下降{rem}% — 影響最大的通路。貢獻度{share}%（信賴區間{lo}~{hi}%，穩定性{stb}）。',
    colCredit: '貢獻度 %',
    colCI: '90% 信賴區間',
    colRemoval: '移除效應 %',
    colStability: '穩定性',
    stbHigh: '高',
    stbMed: '中',
    stbLow: '低',
    noData: '暫無轉換路徑資料。',
  },
  de: {
    tabConfLabel: '🎯 Konfidenz · Erklärbarkeit',
    tabConfDesc: 'Bootstrap-Konfidenzintervalle',
    overallConf: 'Gesamtkonfidenz (Anteil stabiler Kanäle)',
    bootstrapNote: 'Bootstrap 30 Resamples · 90 % Konfidenzintervall',
    explainTitle: 'Warum dieser Kanal (Erklärbarkeit)',
    explainNarrative: 'Das Entfernen von {ch} senkt die Conversions um ~{rem} % — der einflussreichste Kanal. Beitrag {share} % (KI {lo}–{hi} %, Stabilität {stb}).',
    colCredit: 'Beitrag %',
    colCI: '90 % KI',
    colRemoval: 'Removal-Effekt %',
    colStability: 'Stabilität',
    stbHigh: 'Hoch',
    stbMed: 'Mittel',
    stbLow: 'Niedrig',
    noData: 'Keine Conversion-Pfad-Daten verfügbar.',
  },
  th: {
    tabConfLabel: '🎯 ความเชื่อมั่น · การอธิบาย',
    tabConfDesc: 'ช่วงความเชื่อมั่นแบบบูตสแตรป',
    overallConf: 'ความเชื่อมั่นโดยรวม (สัดส่วนช่องทางที่เสถียร)',
    bootstrapNote: 'บูตสแตรปสุ่มซ้ำ 30 ครั้ง · ช่วงความเชื่อมั่น 90%',
    explainTitle: 'ทำไมจึงเป็นช่องทางนี้ (การอธิบายได้)',
    explainNarrative: 'การนำ {ch} ออกทำให้คอนเวอร์ชันลดลงประมาณ {rem}% — ช่องทางที่มีผลมากที่สุด การมีส่วนร่วม {share}% (ช่วงความเชื่อมั่น {lo}–{hi}% ความเสถียร {stb})',
    colCredit: 'การมีส่วนร่วม %',
    colCI: 'ช่วงเชื่อมั่น 90%',
    colRemoval: 'ผลการนำออก %',
    colStability: 'ความเสถียร',
    stbHigh: 'สูง',
    stbMed: 'ปานกลาง',
    stbLow: 'ต่ำ',
    noData: 'ไม่มีข้อมูลเส้นทางคอนเวอร์ชัน',
  },
  vi: {
    tabConfLabel: '🎯 Độ tin cậy · Giải thích',
    tabConfDesc: 'Khoảng tin cậy bootstrap',
    overallConf: 'Độ tin cậy tổng thể (tỷ lệ kênh ổn định)',
    bootstrapNote: 'Bootstrap lấy mẫu lại 30 lần · khoảng tin cậy 90%',
    explainTitle: 'Vì sao là kênh này (khả năng giải thích)',
    explainNarrative: 'Loại bỏ {ch} làm giảm chuyển đổi khoảng {rem}% — kênh có ảnh hưởng lớn nhất. Đóng góp {share}% (KTC {lo}–{hi}%, độ ổn định {stb}).',
    colCredit: 'Đóng góp %',
    colCI: 'KTC 90%',
    colRemoval: 'Hiệu ứng loại bỏ %',
    colStability: 'Độ ổn định',
    stbHigh: 'Cao',
    stbMed: 'Trung bình',
    stbLow: 'Thấp',
    noData: 'Không có dữ liệu hành trình chuyển đổi.',
  },
  id: {
    tabConfLabel: '🎯 Keyakinan · Keterjelasan',
    tabConfDesc: 'Interval keyakinan bootstrap',
    overallConf: 'Keyakinan keseluruhan (rasio kanal stabil)',
    bootstrapNote: 'Bootstrap 30 resample · interval keyakinan 90%',
    explainTitle: 'Mengapa kanal ini (keterjelasan)',
    explainNarrative: 'Menghapus {ch} menurunkan konversi sekitar {rem}% — kanal paling berpengaruh. Kontribusi {share}% (IK {lo}–{hi}%, stabilitas {stb}).',
    colCredit: 'Kontribusi %',
    colCI: 'IK 90%',
    colRemoval: 'Efek penghapusan %',
    colStability: 'Stabilitas',
    stbHigh: 'Tinggi',
    stbMed: 'Sedang',
    stbLow: 'Rendah',
    noData: 'Tidak ada data perjalanan konversi.',
  },
  ar: {
    tabConfLabel: '🎯 الثقة · القابلية للتفسير',
    tabConfDesc: 'فترات ثقة bootstrap',
    overallConf: 'الثقة الإجمالية (نسبة القنوات المستقرة)',
    bootstrapNote: 'إعادة أخذ عينات bootstrap 30 مرة · فترة ثقة 90%',
    explainTitle: 'لماذا هذه القناة (القابلية للتفسير)',
    explainNarrative: 'إزالة {ch} تخفض التحويلات بنحو {rem}% — القناة الأكثر تأثيرًا. المساهمة {share}% (فترة الثقة {lo}–{hi}%، الاستقرار {stb}).',
    colCredit: 'المساهمة %',
    colCI: 'فترة ثقة 90%',
    colRemoval: 'أثر الإزالة %',
    colStability: 'الاستقرار',
    stbHigh: 'مرتفع',
    stbMed: 'متوسط',
    stbLow: 'منخفض',
    noData: 'لا توجد بيانات لمسار التحويل.',
  },
  es: {
    tabConfLabel: '🎯 Confianza · Explicabilidad',
    tabConfDesc: 'Intervalos de confianza bootstrap',
    overallConf: 'Confianza global (proporción de canales estables)',
    bootstrapNote: 'Bootstrap 30 remuestreos · intervalo de confianza del 90%',
    explainTitle: 'Por qué este canal (explicabilidad)',
    explainNarrative: 'Eliminar {ch} reduce las conversiones ~{rem}% — el canal de mayor impacto. Contribución {share}% (IC {lo}–{hi}%, estabilidad {stb}).',
    colCredit: 'Contribución %',
    colCI: 'IC 90%',
    colRemoval: 'Efecto de eliminación %',
    colStability: 'Estabilidad',
    stbHigh: 'Alta',
    stbMed: 'Media',
    stbLow: 'Baja',
    noData: 'No hay datos de recorrido de conversión.',
  },
  fr: {
    tabConfLabel: '🎯 Confiance · Explicabilité',
    tabConfDesc: 'Intervalles de confiance bootstrap',
    overallConf: 'Confiance globale (proportion de canaux stables)',
    bootstrapNote: 'Bootstrap 30 rééchantillonnages · intervalle de confiance à 90 %',
    explainTitle: 'Pourquoi ce canal (explicabilité)',
    explainNarrative: "Retirer {ch} réduit les conversions d'environ {rem} % — le canal le plus influent. Contribution {share} % (IC {lo}–{hi} %, stabilité {stb}).",
    colCredit: 'Contribution %',
    colCI: 'IC 90 %',
    colRemoval: 'Effet de retrait %',
    colStability: 'Stabilité',
    stbHigh: 'Élevée',
    stbMed: 'Moyenne',
    stbLow: 'Faible',
    noData: 'Aucune donnée de parcours de conversion.',
  },
  hi: {
    tabConfLabel: '🎯 विश्वसनीयता · व्याख्या',
    tabConfDesc: 'बूटस्ट्रैप विश्वास अंतराल',
    overallConf: 'समग्र विश्वसनीयता (स्थिर चैनल अनुपात)',
    bootstrapNote: 'बूटस्ट्रैप 30 पुनर्नमूने · 90% विश्वास अंतराल',
    explainTitle: 'यह चैनल क्यों (व्याख्या-योग्यता)',
    explainNarrative: '{ch} हटाने पर रूपांतरण लगभग {rem}% घटते हैं — सबसे प्रभावशाली चैनल। योगदान {share}% (विश्वास अंतराल {lo}–{hi}%, स्थिरता {stb})।',
    colCredit: 'योगदान %',
    colCI: '90% विश्वास अंतराल',
    colRemoval: 'हटाव प्रभाव %',
    colStability: 'स्थिरता',
    stbHigh: 'उच्च',
    stbMed: 'मध्यम',
    stbLow: 'निम्न',
    noData: 'कोई रूपांतरण यात्रा डेटा उपलब्ध नहीं।',
  },
  pt: {
    tabConfLabel: '🎯 Confiança · Explicabilidade',
    tabConfDesc: 'Intervalos de confiança bootstrap',
    overallConf: 'Confiança geral (proporção de canais estáveis)',
    bootstrapNote: 'Bootstrap 30 reamostragens · intervalo de confiança de 90%',
    explainTitle: 'Por que este canal (explicabilidade)',
    explainNarrative: 'Remover {ch} reduz as conversões em ~{rem}% — o canal de maior impacto. Contribuição {share}% (IC {lo}–{hi}%, estabilidade {stb}).',
    colCredit: 'Contribuição %',
    colCI: 'IC 90%',
    colRemoval: 'Efeito de remoção %',
    colStability: 'Estabilidade',
    stbHigh: 'Alta',
    stbMed: 'Média',
    stbLow: 'Baixa',
    noData: 'Sem dados de jornada de conversão.',
  },
  ru: {
    tabConfLabel: '🎯 Достоверность · Объяснимость',
    tabConfDesc: 'Бутстрап-доверительные интервалы',
    overallConf: 'Общая достоверность (доля стабильных каналов)',
    bootstrapNote: 'Бутстрап, 30 повторных выборок · 90% доверительный интервал',
    explainTitle: 'Почему этот канал (объяснимость)',
    explainNarrative: 'Удаление {ch} снижает конверсии примерно на {rem}% — самый влиятельный канал. Вклад {share}% (ДИ {lo}–{hi}%, стабильность {stb}).',
    colCredit: 'Вклад %',
    colCI: '90% ДИ',
    colRemoval: 'Эффект удаления %',
    colStability: 'Стабильность',
    stbHigh: 'Высокая',
    stbMed: 'Средняя',
    stbLow: 'Низкая',
    noData: 'Нет данных о пути конверсии.',
  },
};

function findTopProp(objExpr, name) {
  for (const p of objExpr.properties) {
    if (p.type !== 'Property') continue;
    const k = p.key.type === 'Identifier' ? p.key.name : p.key.value;
    if (k === name) return p;
  }
  return null;
}

function existingKeys(objExpr) {
  const s = new Set();
  for (const p of objExpr.properties) {
    if (p.type !== 'Property') continue;
    s.add(p.key.type === 'Identifier' ? p.key.name : p.key.value);
  }
  return s;
}

let summary = [];
for (const [lang, tr] of Object.entries(T)) {
  const file = path.join(LOCDIR, lang + '.js');
  let src = fs.readFileSync(file, 'utf8');
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  let rootObj = null;
  for (const b of ast.body) if (b.type === 'ExportDefaultDeclaration') rootObj = b.declaration;
  if (!rootObj || rootObj.type !== 'ObjectExpression') { console.error(`${lang}: no export default object`); process.exit(2); }
  const attr = findTopProp(rootObj, 'attrData');
  if (!attr || attr.value.type !== 'ObjectExpression') { console.error(`${lang}: no attrData object`); process.exit(2); }
  const attrObj = attr.value;
  const have = existingKeys(attrObj);
  const toAdd = KEYS.filter(k => !have.has(k));
  if (toAdd.length === 0) { summary.push(`${lang}: 0 (already present)`); continue; }
  const props = attrObj.properties;
  const last = props[props.length - 1];
  const insPos = last.end; // 마지막 프로퍼티 값 직후 → 기존 trailing comma 유무 무관 안전
  let ins = '';
  for (const k of toAdd) ins += `,\n    ${k}: ${JSON.stringify(tr[k])}`;
  src = src.slice(0, insPos) + ins + src.slice(insPos);
  // re-parse 검증
  parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  fs.writeFileSync(file, src, 'utf8');
  summary.push(`${lang}: +${toAdd.length} (${toAdd.join(',')})`);
}
console.log(summary.join('\n'));
