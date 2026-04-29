// Batch 3: zh, zh-TW, es
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

const translations = {
  zh: {
    guideFullTitle:'📋 完整指南 — 从开始到结束',
    guideFullSub:'AI营销自动化平台完整工作流程的分步指南。',
    guidePhaseA:'阶段A — 准备开始',
    guidePhaseB:'阶段B — 活动设计',
    guidePhaseC:'阶段C — AI策略和创意制作',
    guidePhaseD:'阶段D — 执行与监控',
    guidePhaseE:'阶段E — 优化与收尾',
    gf1Title:'登录并确认环境', gf1Desc:'登录后,从侧边栏导航至"AI营销 → 自动策略"。确认您的生产/演示环境。',
    gf2Title:'连接API渠道', gf2Desc:'在集成中心注册Meta、Google、Naver等的API密钥。只有已连接的渠道才能用于活动。',
    gf3Title:'查看仪表板KPI', gf3Desc:'在主仪表板上检查当前KPI、活跃活动和各渠道ROAS。这些数据为AI推荐提供基础。',
    gf4Title:'设置月度预算', gf4Desc:'在"②活动设置"标签中,选择或输入您的月度广告预算。AI根据您的预算级别优化渠道推荐。',
    gf5Title:'选择产品类别', gf5Desc:'从11个类别(美容、时尚、食品等)中选择。多选可进行交叉分析以提高精准度。',
    gf6Title:'选择广告渠道', gf6Desc:'AI根据类别+预算分析推荐最佳渠道组合。您也可以手动添加或删除渠道。',
    gf7Title:'设置目标和时间段', gf7Desc:'配置活动名称、执行期间(月度/季度/半年)和目标受众。AI为每个渠道建议最佳定向。',
    gf8Title:'AI策略模拟', gf8Desc:'点击"生成AI策略"自动计算每个渠道的预算分配、预计展示量、点击量、转化量和ROAS。',
    gf9Title:'创建广告素材', gf9Desc:'在"①创意工作室"标签中,AI为每个渠道自动生成优化的广告素材。支持文本、图片和视频格式。',
    gf10Title:'预览并调整策略', gf10Desc:'在"③AI预览"标签中,查看每个渠道的分配和预计KPI。使用滑块手动调整分配比例。',
    gf11Title:'提交审批', gf11Desc:'确定策略后点击"请求审批"。提交前在审批对话框中检查预算、ROAS和渠道。',
    gf12Title:'在活动管理器中监控', gf12Desc:'提交的活动在活动管理器页面实时追踪。监控状态(待定/已批准/活跃/暂停)。',
    gf13Title:'AI自动优化', gf13Desc:'AI分析实时数据,自动将预算从表现不佳的渠道重新分配到表现优异的渠道。',
    gf14Title:'分析绩效报告', gf14Desc:'活动结束后,分析每个渠道的ROAS、CPA、CTR等关键指标。AI为下一次活动提供改进建议。',
    gf15Title:'迭代下一次活动', gf15Desc:'根据分析结果,调整预算/类别/渠道以创建新活动。每次迭代都会增强AI学习。',
    guideTabGuideName:'📖 使用指南', guideTabGuideDesc:'平台功能和完整工作流程的分步指南。',
    guideTip6:'将AI推荐的渠道与手动选择进行比较,找到最佳组合。',
    guideTip7:'执行前务必提交管理者审批,防止预算超支。',
    csTitle:'创意工作室', csSubtitle:'跨平台设计和管理广告素材',
    csTabGallery:'素材库', csTabCreateNew:'新建', csTabPerformance:'效果分析', csTabBrandAssets:'品牌资产',
    csKpiCreatives:'素材数', csKpiFormats:'格式', csKpiApproved:'已审批', csKpiTopCtr:'最高CTR',
    csFeatMultiFormat:'多格式导出', csFeatAiCopy:'AI文案生成器', csFeatPerfAnalytics:'效果分析工具', csFeatBrandCheck:'品牌一致性检查',
    csSystemOk:'系统正常运行中',
    autoTab1:'① 创意工作室',
  },
  'zh-TW': {
    guideFullTitle:'📋 完整指南 — 從開始到結束',
    guideFullSub:'AI行銷自動化平台完整工作流程的逐步指南。',
    guidePhaseA:'階段A — 準備開始',
    guidePhaseB:'階段B — 活動設計',
    guidePhaseC:'階段C — AI策略與素材製作',
    guidePhaseD:'階段D — 執行與監控',
    guidePhaseE:'階段E — 優化與收尾',
    gf1Title:'登入並確認環境', gf1Desc:'登入後,從側邊欄導航至「AI行銷 → 自動策略」。確認您的正式/測試環境。',
    gf2Title:'連接API頻道', gf2Desc:'在整合中心註冊Meta、Google、Naver等的API金鑰。只有已連接的頻道才能用於活動。',
    gf3Title:'檢視儀表板KPI', gf3Desc:'在主儀表板上查看目前KPI、活躍活動和各頻道ROAS。這些數據為AI推薦提供基礎。',
    gf4Title:'設定月度預算', gf4Desc:'在「②活動設定」分頁中,選擇或輸入您的月度廣告預算。AI根據您的預算等級優化頻道推薦。',
    gf5Title:'選擇產品類別', gf5Desc:'從11個類別(美容、時尚、食品等)中選擇。多選可進行交叉分析以提高精準度。',
    gf6Title:'選擇廣告頻道', gf6Desc:'AI根據類別+預算分析推薦最佳頻道組合。您也可以手動新增或移除頻道。',
    gf7Title:'設定目標和期間', gf7Desc:'設定活動名稱、執行期間(月度/季度/半年)和目標受眾。AI為每個頻道建議最佳定向。',
    gf8Title:'AI策略模擬', gf8Desc:'點擊「產生AI策略」自動計算每個頻道的預算分配、預估曝光量、點擊量、轉換量和ROAS。',
    gf9Title:'建立廣告素材', gf9Desc:'在「①創意工作室」分頁中,AI為每個頻道自動產生優化的廣告素材。支援文字、圖片和影片格式。',
    gf10Title:'預覽並調整策略', gf10Desc:'在「③AI預覽」分頁中,檢視每個頻道的分配和預估KPI。使用滑桿手動調整分配比例。',
    gf11Title:'提交審核', gf11Desc:'確定策略後點擊「請求審核」。提交前在審核對話框中檢查預算、ROAS和頻道。',
    gf12Title:'在活動管理器中監控', gf12Desc:'提交的活動在活動管理器頁面即時追蹤。監控狀態(待定/已核准/活躍/暫停)。',
    gf13Title:'AI自動優化', gf13Desc:'AI分析即時數據,自動將預算從表現不佳的頻道重新分配到表現優異的頻道。',
    gf14Title:'分析績效報告', gf14Desc:'活動結束後,分析每個頻道的ROAS、CPA、CTR等關鍵指標。AI為下一次活動提供改進建議。',
    gf15Title:'迭代下一次活動', gf15Desc:'根據分析結果,調整預算/類別/頻道以建立新活動。每次迭代都會增強AI學習。',
    guideTabGuideName:'📖 使用指南', guideTabGuideDesc:'平台功能和完整工作流程的逐步指南。',
    guideTip6:'將AI推薦的頻道與手動選擇進行比較,找到最佳組合。',
    guideTip7:'執行前務必提交管理者審核,防止預算超支。',
    csTitle:'創意工作室', csSubtitle:'跨平台設計和管理廣告素材',
    csTabGallery:'素材庫', csTabCreateNew:'新建', csTabPerformance:'成效分析', csTabBrandAssets:'品牌資產',
    csKpiCreatives:'素材數', csKpiFormats:'格式', csKpiApproved:'已核准', csKpiTopCtr:'最高CTR',
    csFeatMultiFormat:'多格式匯出', csFeatAiCopy:'AI文案產生器', csFeatPerfAnalytics:'成效分析工具', csFeatBrandCheck:'品牌一致性檢查',
    csSystemOk:'系統正常運行中',
    autoTab1:'① 創意工作室',
  },
  es: {
    guideFullTitle:'📋 Guía Completa — De Principio a Fin',
    guideFullSub:'Guía paso a paso del flujo completo de la plataforma de automatización de marketing con IA.',
    guidePhaseA:'Fase A — Preparación Inicial',
    guidePhaseB:'Fase B — Diseño de Campaña',
    guidePhaseC:'Fase C — Estrategia IA y Creativos',
    guidePhaseD:'Fase D — Ejecución y Monitoreo',
    guidePhaseE:'Fase E — Optimización y Cierre',
    gf1Title:'Inicio de Sesión y Verificación', gf1Desc:'Inicie sesión y navegue a "Marketing IA → Estrategia Automática" en la barra lateral. Verifique su entorno Producción/Demo.',
    gf2Title:'Conectar Canales API', gf2Desc:'Registre API Keys para Meta, Google, Naver, etc. en el Hub de Integración. Solo los canales conectados se pueden usar en campañas.',
    gf3Title:'Revisar KPIs del Dashboard', gf3Desc:'Verifique los KPIs actuales, campañas activas y ROAS por canal en el Dashboard Principal.',
    gf4Title:'Establecer Presupuesto Mensual', gf4Desc:'En la pestaña "② Configuración de Campaña", seleccione o ingrese su presupuesto mensual. La IA optimiza las recomendaciones de canales según su nivel de presupuesto.',
    gf5Title:'Seleccionar Categorías de Productos', gf5Desc:'Elija entre 11 categorías (Belleza, Moda, Alimentos, etc.). La selección múltiple habilita análisis cruzado para mayor precisión.',
    gf6Title:'Elegir Canales Publicitarios', gf6Desc:'La IA recomienda combinaciones óptimas de canales basadas en análisis de categoría + presupuesto. Puede agregar o eliminar canales manualmente.',
    gf7Title:'Definir Objetivo y Período', gf7Desc:'Configure nombre de campaña, período de ejecución (mensual/trimestral/semestral) y público objetivo.',
    gf8Title:'Simulación de Estrategia IA', gf8Desc:'Haga clic en "Generar Estrategia IA" para calcular automáticamente la asignación de presupuesto, impresiones, clics, conversiones y ROAS estimados por canal.',
    gf9Title:'Crear Creativos Publicitarios', gf9Desc:'En la pestaña "① Estudio Creativo", la IA genera automáticamente creativos optimizados por canal. Soporta formatos de texto, imagen y video.',
    gf10Title:'Vista Previa y Ajuste de Estrategia', gf10Desc:'En la pestaña "③ Vista Previa IA", revise las asignaciones por canal y KPIs estimados. Use controles deslizantes para ajustar proporciones.',
    gf11Title:'Enviar para Aprobación', gf11Desc:'Finalice su estrategia y haga clic en "Solicitar Aprobación". Revise presupuesto, ROAS y canales en el modal de aprobación antes de enviar.',
    gf12Title:'Monitorear en el Gestor de Campañas', gf12Desc:'Las campañas enviadas se rastrean en tiempo real. Monitoree el estado (pendiente/aprobada/activa/pausada).',
    gf13Title:'Optimización Automática por IA', gf13Desc:'La IA analiza datos en tiempo real y reasigna automáticamente el presupuesto de canales de bajo rendimiento a los de alto rendimiento.',
    gf14Title:'Analizar Informes de Rendimiento', gf14Desc:'Después de la campaña, analice ROAS, CPA, CTR y otras métricas clave por canal. La IA sugiere mejoras para las próximas campañas.',
    gf15Title:'Iterar Siguiente Campaña', gf15Desc:'Basándose en los resultados del análisis, ajuste presupuesto/categorías/canales para crear una nueva campaña. El aprendizaje de la IA mejora con cada iteración.',
    guideTabGuideName:'📖 Guía del Usuario', guideTabGuideDesc:'Guía paso a paso de las funcionalidades de la plataforma y flujo completo.',
    guideTip6:'Compare canales recomendados por IA con selecciones manuales para encontrar la combinación ideal.',
    guideTip7:'Siempre envíe para aprobación del gerente antes de ejecutar para evitar excesos de presupuesto.',
    csTitle:'Estudio Creativo', csSubtitle:'Diseñe y gestione creativos publicitarios en todas las plataformas',
    csTabGallery:'Galería', csTabCreateNew:'Crear Nuevo', csTabPerformance:'Rendimiento', csTabBrandAssets:'Activos de Marca',
    csKpiCreatives:'Creativos', csKpiFormats:'Formatos', csKpiApproved:'Aprobados', csKpiTopCtr:'Mejor CTR',
    csFeatMultiFormat:'Exportación multiformato', csFeatAiCopy:'Generador de copias IA', csFeatPerfAnalytics:'Análisis de rendimiento', csFeatBrandCheck:'Verificación de consistencia de marca',
    csSystemOk:'Sistema Operativo',
    autoTab1:'① Estudio Creativo',
  },
};

function inject(lang, keys) {
  const fp = p.join(dir, lang + '.js');
  let src = fs.readFileSync(fp, 'utf8');
  const nsIdx = src.indexOf('"marketing"');
  if (nsIdx < 0) return console.log(lang + ': no marketing ns');
  const bi = src.indexOf('{', nsIdx);
  let adds = '';
  const block = src.substring(nsIdx, Math.min(src.length, nsIdx + 50000));
  for (const [k, v] of Object.entries(keys)) {
    if (!new RegExp(`"${k}"\\s*:`).test(block)) {
      adds += `\n    "${k}": ${JSON.stringify(v)},`;
    }
  }
  if (adds) {
    src = src.substring(0, bi + 1) + adds + src.substring(bi + 1);
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`✅ ${lang}: ${adds.split('\n').filter(l=>l.trim()).length} keys injected`);
  } else {
    console.log(`⏭ ${lang}: all keys exist`);
  }
}

for (const [lang, keys] of Object.entries(translations)) inject(lang, keys);
console.log('Batch 3 (zh, zh-TW, es) done!');
