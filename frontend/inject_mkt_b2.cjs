// Batch 2: Inject 15-step guide + CS keys into ru, de, ja
const fs=require('fs'),p=require('path');
const dir=p.resolve(__dirname,'src/i18n/locales');

const translations = {
  ru: {
    guideFullTitle:'📋 Полное руководство — от начала до конца',
    guideFullSub:'Пошаговое руководство по полному рабочему процессу платформы AI-маркетинга.',
    guidePhaseA:'Фаза A — Подготовка к старту',
    guidePhaseB:'Фаза B — Проектирование кампании',
    guidePhaseC:'Фаза C — AI-стратегия и креативы',
    guidePhaseD:'Фаза D — Запуск и мониторинг',
    guidePhaseE:'Фаза E — Оптимизация и завершение',
    gf1Title:'Вход и проверка среды', gf1Desc:'Войдите в систему и перейдите к "AI-маркетинг → Автостратегия" в боковой панели. Проверьте среду Продакшн/Демо.',
    gf2Title:'Подключение API-каналов', gf2Desc:'Зарегистрируйте API-ключи для Meta, Google, Naver и др. в Центре интеграции. Только подключённые каналы доступны для кампаний.',
    gf3Title:'Обзор KPI дашборда', gf3Desc:'Проверьте текущие KPI, активные кампании и ROAS по каналам на главном дашборде.',
    gf4Title:'Установка месячного бюджета', gf4Desc:'На вкладке "② Настройка кампании" выберите или введите месячный рекламный бюджет. AI оптимизирует рекомендации каналов на основе вашего бюджета.',
    gf5Title:'Выбор категорий товаров', gf5Desc:'Выберите из 11 категорий (Красота, Мода, Продукты и т.д.). Множественный выбор обеспечивает перекрёстный анализ для большей точности.',
    gf6Title:'Выбор рекламных каналов', gf6Desc:'AI рекомендует оптимальные комбинации каналов на основе анализа категории + бюджета. Вы можете вручную добавлять или удалять каналы.',
    gf7Title:'Настройка цели и периода', gf7Desc:'Настройте название кампании, период (месячный/квартальный/полугодовой) и целевую аудиторию. AI предлагает оптимальный таргетинг по каналам.',
    gf8Title:'Симуляция AI-стратегии', gf8Desc:'Нажмите "Создать AI-стратегию" для автоматического расчёта распределения бюджета, показов, кликов, конверсий и ROAS по каналам.',
    gf9Title:'Создание рекламных креативов', gf9Desc:'На вкладке "① Креативная студия" AI автоматически создаёт оптимизированные креативы для каждого канала. Поддерживает текст, изображения и видео.',
    gf10Title:'Предпросмотр и корректировка', gf10Desc:'На вкладке "③ AI-предпросмотр" просмотрите распределение по каналам и ожидаемые KPI. Используйте ползунки для ручной корректировки.',
    gf11Title:'Отправка на утверждение', gf11Desc:'Завершите стратегию и нажмите "Запросить утверждение". Проверьте бюджет, ROAS и каналы в модальном окне перед отправкой.',
    gf12Title:'Мониторинг в Менеджере кампаний', gf12Desc:'Отправленные кампании отслеживаются в реальном времени на странице Менеджера. Отслеживайте статус (ожидание/утверждена/активна/пауза).',
    gf13Title:'Автооптимизация AI', gf13Desc:'AI анализирует данные в реальном времени и автоматически перераспределяет бюджет от слабых каналов к сильным.',
    gf14Title:'Анализ отчётов эффективности', gf14Desc:'После завершения кампании проанализируйте ROAS, CPA, CTR и ключевые метрики по каналам. AI предлагает улучшения для следующих кампаний.',
    gf15Title:'Итерация следующей кампании', gf15Desc:'На основе результатов анализа скорректируйте бюджет/категории/каналы для создания новой кампании. Обучение AI улучшается с каждой итерацией.',
    guideTabGuideName:'📖 Руководство пользователя', guideTabGuideDesc:'Пошаговое руководство по функциям платформы и полному рабочему процессу.',
    guideTip6:'Сравнивайте рекомендованные AI каналы с ручным выбором для оптимального микса.',
    guideTip7:'Всегда отправляйте на утверждение менеджера перед запуском для предотвращения перерасхода.',
    csTitle:'Креативная студия', csSubtitle:'Дизайн и управление рекламными креативами на разных платформах',
    csTabGallery:'Галерея', csTabCreateNew:'Создать новый', csTabPerformance:'Эффективность', csTabBrandAssets:'Активы бренда',
    csKpiCreatives:'Креативы', csKpiFormats:'Форматы', csKpiApproved:'Одобрено', csKpiTopCtr:'Лучший CTR',
    csFeatMultiFormat:'Мультиформатный экспорт', csFeatAiCopy:'AI-генератор текстов', csFeatPerfAnalytics:'Аналитика эффективности', csFeatBrandCheck:'Проверка бренд-консистенции',
    csSystemOk:'Система работает нормально',
    autoTab1:'① Креативная студия',
  },
  de: {
    guideFullTitle:'📋 Komplettanleitung — Von Anfang bis Ende',
    guideFullSub:'Schritt-für-Schritt-Anleitung für den gesamten Workflow der KI-Marketing-Automatisierung.',
    guidePhaseA:'Phase A — Erste Schritte',
    guidePhaseB:'Phase B — Kampagnendesign',
    guidePhaseC:'Phase C — KI-Strategie & Kreativmaterial',
    guidePhaseD:'Phase D — Ausführung & Monitoring',
    guidePhaseE:'Phase E — Optimierung & Abschluss',
    gf1Title:'Login & Umgebungsprüfung', gf1Desc:'Melden Sie sich an und navigieren Sie zu "KI-Marketing → Auto-Strategie" in der Seitenleiste. Überprüfen Sie Ihre Produktions-/Demo-Umgebung.',
    gf2Title:'API-Kanäle verbinden', gf2Desc:'Registrieren Sie API-Schlüssel für Meta, Google, Naver usw. im Integrationshub. Nur verbundene Kanäle können in Kampagnen verwendet werden.',
    gf3Title:'Dashboard-KPIs prüfen', gf3Desc:'Überprüfen Sie aktuelle KPIs, aktive Kampagnen und ROAS pro Kanal im Haupt-Dashboard.',
    gf4Title:'Monatsbudget festlegen', gf4Desc:'Wählen oder geben Sie im Tab "② Kampagneneinrichtung" Ihr monatliches Werbebudget ein. Die KI optimiert Kanalempfehlungen basierend auf Ihrer Budgetstufe.',
    gf5Title:'Produktkategorien auswählen', gf5Desc:'Wählen Sie aus 11 Kategorien (Beauty, Mode, Lebensmittel usw.). Mehrfachauswahl ermöglicht Kreuzanalyse für höhere Genauigkeit.',
    gf6Title:'Werbekanäle wählen', gf6Desc:'Die KI empfiehlt optimale Kanalkombinationen basierend auf Kategorie- + Budgetanalyse. Sie können Kanäle manuell hinzufügen oder entfernen.',
    gf7Title:'Zielgruppe & Zeitraum festlegen', gf7Desc:'Konfigurieren Sie Kampagnenname, Ausführungszeitraum (monatlich/quartalsweise/halbjährlich) und Zielgruppe.',
    gf8Title:'KI-Strategiesimulation', gf8Desc:'Klicken Sie auf "KI-Strategie generieren" zur automatischen Berechnung von Budgetverteilung, Impressionen, Klicks, Conversions und ROAS pro Kanal.',
    gf9Title:'Werbematerial erstellen', gf9Desc:'Im Tab "① Kreativ-Studio" generiert die KI automatisch optimierte Werbematerialien pro Kanal. Unterstützt Text-, Bild- und Videoformate.',
    gf10Title:'Strategie prüfen & anpassen', gf10Desc:'Im Tab "③ KI-Vorschau" überprüfen Sie Zuweisungen und geschätzte KPIs pro Kanal. Nutzen Sie Schieberegler für manuelle Anpassungen.',
    gf11Title:'Zur Genehmigung einreichen', gf11Desc:'Finalisieren Sie Ihre Strategie und klicken Sie auf "Genehmigung anfordern". Überprüfen Sie Budget, ROAS und Kanäle im Genehmigungsdialog.',
    gf12Title:'Im Kampagnenmanager überwachen', gf12Desc:'Eingereichte Kampagnen werden in Echtzeit auf der Kampagnenmanager-Seite verfolgt. Überwachen Sie den Status (wartend/genehmigt/aktiv/pausiert).',
    gf13Title:'KI-Automatische Optimierung', gf13Desc:'Die KI analysiert Echtzeitdaten und verteilt automatisch Budget von leistungsschwachen zu leistungsstarken Kanälen um.',
    gf14Title:'Leistungsberichte analysieren', gf14Desc:'Analysieren Sie nach Kampagnenende ROAS, CPA, CTR und weitere KPIs pro Kanal. Die KI schlägt Verbesserungen für nächste Kampagnen vor.',
    gf15Title:'Nächste Kampagne iterieren', gf15Desc:'Passen Sie basierend auf Analyseergebnissen Budget/Kategorien/Kanäle an. Das KI-Lernen verbessert sich mit jeder Iteration.',
    guideTabGuideName:'📖 Benutzerhandbuch', guideTabGuideDesc:'Schritt-für-Schritt-Anleitung zu Plattformfunktionen und komplettem Workflow.',
    guideTip6:'Vergleichen Sie KI-empfohlene Kanäle mit manueller Auswahl für den optimalen Mix.',
    guideTip7:'Reichen Sie vor der Ausführung immer zur Managergenehmigung ein, um Budgetüberschreitungen zu vermeiden.',
    csTitle:'Kreativ-Studio', csSubtitle:'Werbekreativmaterialien plattformübergreifend gestalten und verwalten',
    csTabGallery:'Galerie', csTabCreateNew:'Neu erstellen', csTabPerformance:'Leistung', csTabBrandAssets:'Markenassets',
    csKpiCreatives:'Kreativmaterialien', csKpiFormats:'Formate', csKpiApproved:'Genehmigt', csKpiTopCtr:'Beste CTR',
    csFeatMultiFormat:'Multiformatexport', csFeatAiCopy:'KI-Textgenerator', csFeatPerfAnalytics:'Leistungsanalyse', csFeatBrandCheck:'Markenkonsistenzprüfung',
    csSystemOk:'System betriebsbereit',
    autoTab1:'① Kreativ-Studio',
  },
  ja: {
    guideFullTitle:'📋 最初から最後まで — 完全ガイド',
    guideFullSub:'AIマーケティング自動化プラットフォームの完全ワークフローをステップバイステップでご案内します。',
    guidePhaseA:'フェーズA — 開始準備',
    guidePhaseB:'フェーズB — キャンペーン設計',
    guidePhaseC:'フェーズC — AI戦略＆クリエイティブ制作',
    guidePhaseD:'フェーズD — 実行＆モニタリング',
    guidePhaseE:'フェーズE — 最適化＆完了',
    gf1Title:'ログイン＆環境確認', gf1Desc:'ログインし、サイドバーから「AIマーケティング→自動戦略」に移動します。本番/デモ環境を確認してください。',
    gf2Title:'APIチャネル接続', gf2Desc:'統合ハブでMeta、Google、Naverなどの APIキーを登録します。接続されたチャネルのみキャンペーンで使用できます。',
    gf3Title:'ダッシュボードKPI確認', gf3Desc:'ホームダッシュボードで現在のKPI、アクティブキャンペーン、チャネル別ROASを確認します。このデータがAI推奨の基盤です。',
    gf4Title:'月間予算設定', gf4Desc:'「②キャンペーン設定」タブで月間広告予算を選択または入力します。AIが予算レベルに基づいてチャネル推奨を最適化します。',
    gf5Title:'商品カテゴリ選択', gf5Desc:'11カテゴリ（美容、ファッション、食品など）から選択します。複数選択でクロス分析が可能になり精度が向上します。',
    gf6Title:'広告チャネル選択', gf6Desc:'AIがカテゴリ＋予算分析に基づいて最適なチャネルの組み合わせを推奨します。手動でチャネルを追加・削除できます。',
    gf7Title:'ターゲット＆期間設定', gf7Desc:'キャンペーン名、実行期間（月次/四半期/半期）、ターゲットオーディエンスを設定します。AIがチャネル別最適ターゲティングを提案します。',
    gf8Title:'AI戦略シミュレーション', gf8Desc:'「AI戦略生成」をクリックして、チャネル別予算配分、推定インプレッション、クリック、コンバージョン、ROASを自動計算します。',
    gf9Title:'広告クリエイティブ制作', gf9Desc:'「①クリエイティブスタジオ」タブで、AIがチャネル別に最適化された広告クリエイティブを自動生成します。テキスト、画像、動画に対応。',
    gf10Title:'戦略プレビュー＆調整', gf10Desc:'「③AIプレビュー」タブでチャネル別配分と予想KPIを確認します。スライダーで配分比率を手動調整できます。',
    gf11Title:'承認提出', gf11Desc:'戦略を確定し「承認リクエスト」をクリックします。送信前に承認モーダルで予算、ROAS、チャネルを最終確認します。',
    gf12Title:'キャンペーンマネージャーで監視', gf12Desc:'提出されたキャンペーンはキャンペーンマネージャーページでリアルタイム追跡されます。ステータス（保留/承認/アクティブ/一時停止）を監視します。',
    gf13Title:'AI自動最適化', gf13Desc:'AIがリアルタイムデータを分析し、パフォーマンスの低いチャネルから高いチャネルへ予算を自動的に再配分します。',
    gf14Title:'パフォーマンスレポート分析', gf14Desc:'キャンペーン終了後、チャネル別ROAS、CPA、CTRなどの主要指標を分析します。AIが次回キャンペーンの改善点を提案します。',
    gf15Title:'次のキャンペーンを繰り返し', gf15Desc:'分析結果に基づいて予算/カテゴリ/チャネルを調整し、新しいキャンペーンを作成します。繰り返すごとにAI学習が強化されます。',
    guideTabGuideName:'📖 利用ガイド', guideTabGuideDesc:'プラットフォーム機能と完全ワークフローのステップバイステップガイド。',
    guideTip6:'最適な組み合わせを見つけるため、AI推奨チャネルと手動選択を比較してください。',
    guideTip7:'予算超過を防ぐため、実行前に必ずマネージャー承認に提出してください。',
    csTitle:'クリエイティブスタジオ', csSubtitle:'各プラットフォームの広告クリエイティブをデザイン・管理',
    csTabGallery:'ギャラリー', csTabCreateNew:'新規作成', csTabPerformance:'パフォーマンス', csTabBrandAssets:'ブランドアセット',
    csKpiCreatives:'クリエイティブ', csKpiFormats:'フォーマット', csKpiApproved:'承認済み', csKpiTopCtr:'最高CTR',
    csFeatMultiFormat:'マルチフォーマット出力', csFeatAiCopy:'AIコピー生成', csFeatPerfAnalytics:'パフォーマンス分析', csFeatBrandCheck:'ブランド一貫性チェック',
    csSystemOk:'システム正常稼働中',
    autoTab1:'① クリエイティブスタジオ',
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
console.log('Batch 2 (ru, de, ja) done!');
