import React from 'react';
import { useI18n } from '../i18n/index.js';

/*
 * 🤖 AI 디자인 상세 매뉴얼 (231차 신규)
 * 초보자가 순서대로만 따라 하면 AI 광고 디자인 생성 → 마케팅 자동화까지 완료되도록
 * 단계별로 안내. integration-hub 가이드와 동일한 단계형 UI.
 * 자기완결 15개국 사전(SIDEBAR_DICT 패턴) — 로케일 파일 비대화 회피.
 * 구조(아이콘/번호/페이즈)는 코드 공통, 텍스트만 언어별.
 */

// 9 steps × 3 phases. 각 step: [phaseIndex, icon, titleKey, descKey]
const STEP_META = [
  [0, '🔗', 'connect'],
  [0, '🤖', 'enter'],
  [1, '💬', 'chat'],
  [1, '🎨', 'engine'],
  [1, '✏️', 'edit'],
  [1, '🗂', 'save'],
  [2, '🎯', 'link'],
  [2, '⚙️', 'auto'],
  [2, '🚀', 'launch'],
];

const M = {
  ko: {
    intro: '아래 9단계를 순서대로만 따라 하면, AI로 광고 디자인을 만들고 마케팅 자동화 집행까지 완료할 수 있습니다.',
    phases: ['1단계 · 준비', '2단계 · 디자인 생성', '3단계 · 마케팅 자동화'],
    tipLabel: '💡 팁',
    s: {
      connect: ['채널 연동하기', '먼저 [연동 허브]에서 광고·커머스 채널(메타·구글·쿠팡 등)을 연결합니다. 자동 집행의 전제 조건입니다.', '연동이 안 되어 있으면 디자인은 만들 수 있어도 자동 집행이 막힙니다.'],
      enter: ['AI 디자인 메뉴 진입', '[마케팅 → AI 디자인] 탭으로 이동합니다. 상단 토글에서 작업 모드를 고릅니다.', '이 매뉴얼은 그 토글의 "🤖 상세 매뉴얼" 버튼입니다.'],
      chat: ['대화형으로 시안 만들기', '"💬 대화형 AI 디자인"에서 원하는 광고를 문장으로 설명합니다. 예: "여름 세일 인스타 정사각 배너, 시원한 파란톤, 최대 50% 강조".', '구체적일수록(채널·규격·색·문구·목표) 결과가 정확합니다.'],
      engine: ['디자인 엔진으로 정밀 생성', '"🎨 디자인 엔진"에서 플랫폼/규격(14개 채널)을 선택하고 생성합니다. 채널별 권장 사이즈가 자동 적용됩니다.', '여러 채널이 필요하면 채널을 바꿔가며 같은 컨셉으로 반복 생성하세요.'],
      edit: ['검토하고 수정', '생성된 시안의 문구·색상·규격을 다듬습니다. 마음에 들 때까지 재생성/부분수정합니다.', '브랜드 톤·법적 문구(가격·할인 조건)를 꼭 확인하세요.'],
      save: ['보관함에 저장', '"🗂 저장 광고물 보관함"에 저장합니다. 채널별·기간별로 정리되어 나중에 캠페인에 바로 씁니다.', '시즌/프로모션별 폴더처럼 기간을 지정해 관리하면 재사용이 쉽습니다.'],
      link: ['캠페인에 연결', '보관함에서 광고물을 선택해 캠페인에 연결합니다. 한 시안을 여러 채널 캠페인에 재사용할 수 있습니다.', '채널별 규격이 다르면 2~4단계로 돌아가 채널 맞춤본을 추가 생성하세요.'],
      auto: ['자동 마케팅 설정', '[자동 마케팅]에서 목표(인지·전환 등)·예산·집행 채널을 설정합니다. 연결한 광고물이 소재로 사용됩니다.', '월 예산 상한(cap)과 페이싱을 정하면 과집행이 방지됩니다.'],
      launch: ['집행 시작 · 자동 최적화', '집행 게이트(자격증명·예산)를 확인하고 시작하면, AI가 성과(ROAS·전환)를 보고 예산을 자동 재배분·최적화합니다.', '성과는 [성과 인사이트]·[P&L]에서 실시간 확인하세요.'],
    },
  },
  en: {
    intro: 'Follow these 9 steps in order to create ad designs with AI and run marketing automation end to end.',
    phases: ['Step 1 · Prepare', 'Step 2 · Create Design', 'Step 3 · Marketing Automation'],
    tipLabel: '💡 Tip',
    s: {
      connect: ['Connect channels', 'First connect your ad/commerce channels (Meta, Google, Coupang, etc.) in [Integration Hub]. This is required for automated execution.', 'Without connections you can still design, but auto-execution is blocked.'],
      enter: ['Open AI Design', 'Go to [Marketing → AI Design]. Pick a mode from the top toggle.', 'This manual is the "🤖 Manual" button on that toggle.'],
      chat: ['Draft via chat', 'In "💬 Conversational AI Design", describe the ad in a sentence, e.g. "Summer-sale Instagram square banner, cool blue tones, emphasize up to 50%".', 'The more specific (channel, size, color, copy, goal), the better the result.'],
      engine: ['Generate with the Design Engine', 'In "🎨 Design Engine", choose platform/format (14 channels) and generate. Recommended sizes apply automatically.', 'For multiple channels, regenerate the same concept per channel.'],
      edit: ['Review and edit', 'Refine the copy, colors and format of the draft. Regenerate/tweak until satisfied.', 'Always check brand tone and legal copy (price/discount terms).'],
      save: ['Save to Library', 'Save into "🗂 Saved Creatives Library", organized by channel and period for instant reuse in campaigns.', 'Tag by season/promotion period for easy reuse.'],
      link: ['Link to a campaign', 'Select a creative from the library and link it to a campaign. One draft can be reused across channels.', 'If channel sizes differ, return to steps 2–4 to generate channel-fit versions.'],
      auto: ['Configure Auto Marketing', 'In [Auto Marketing], set goal (awareness/conversion), budget and channels. The linked creative is used as the asset.', 'Set a monthly budget cap and pacing to prevent overspend.'],
      launch: ['Launch · Auto-optimize', 'Confirm the execution gate (credentials/budget) and launch. AI reallocates budget and optimizes based on ROAS/conversion.', 'Track results live in [Performance Hub] and [P&L].'],
    },
  },
  ja: {
    intro: '以下の9ステップを順番に実行すると、AIで広告デザインを作成し、マーケティング自動化まで完了できます。',
    phases: ['ステップ1 · 準備', 'ステップ2 · デザイン生成', 'ステップ3 · マーケティング自動化'],
    tipLabel: '💡 ヒント',
    s: {
      connect: ['チャネル連携', 'まず[連携ハブ]で広告・コマースチャネル（Meta・Google・Coupang等）を連携します。自動配信の前提条件です。', '未連携だとデザインは作れても自動配信ができません。'],
      enter: ['AIデザインを開く', '[マーケティング → AIデザイン]タブへ移動し、上部トグルでモードを選びます。', '本マニュアルはそのトグルの「🤖 マニュアル」ボタンです。'],
      chat: ['会話でドラフト作成', '「💬 会話型AIデザイン」で広告を文章で説明します。例:「夏セールのInstagram正方形バナー、爽やかな青系、最大50%強調」。', '具体的（チャネル・サイズ・色・文言・目標）なほど精度が上がります。'],
      engine: ['デザインエンジンで精密生成', '「🎨 デザインエンジン」でプラットフォーム/規格（14チャネル）を選び生成します。推奨サイズが自動適用されます。', '複数チャネルはチャネルを変えて同コンセプトで再生成します。'],
      edit: ['確認して修正', '生成案の文言・色・規格を調整します。納得するまで再生成/微修正します。', 'ブランドトーンと法的表記（価格・割引条件）を必ず確認。'],
      save: ['保管庫に保存', '「🗂 保存広告物の保管庫」に保存します。チャネル別・期間別に整理され、後でキャンペーンにすぐ使えます。', 'シーズン/プロモ期間で管理すると再利用が容易です。'],
      link: ['キャンペーンに連携', '保管庫から広告物を選びキャンペーンに連携します。1案を複数チャネルで再利用できます。', '規格が異なる場合はステップ2〜4でチャネル別版を追加生成。'],
      auto: ['自動マーケティング設定', '[自動マーケティング]で目標（認知・コンバージョン等）・予算・配信チャネルを設定します。連携した広告物が素材になります。', '月予算上限とペーシング設定で過剰配信を防止。'],
      launch: ['配信開始 · 自動最適化', '配信ゲート（認証情報・予算）を確認して開始すると、AIが成果（ROAS・CV）を見て予算を自動再配分・最適化します。', '成果は[パフォーマンス]・[P&L]でリアルタイム確認。'],
    },
  },
  zh: {
    intro: '按顺序完成以下9个步骤，即可用AI创建广告设计并完成营销自动化投放。',
    phases: ['第1步 · 准备', '第2步 · 生成设计', '第3步 · 营销自动化'],
    tipLabel: '💡 提示',
    s: {
      connect: ['连接渠道', '先在[集成中心]连接广告/电商渠道（Meta、Google、Coupang等）。这是自动投放的前提。', '未连接时仍可设计，但自动投放会被阻止。'],
      enter: ['进入AI设计', '前往[营销 → AI设计]，在顶部切换中选择模式。', '本手册即该切换中的"🤖 手册"按钮。'],
      chat: ['用对话生成草稿', '在"💬 对话式AI设计"中用一句话描述广告，例如:"夏季促销Instagram方形横幅，清爽蓝色调，突出最高50%"。', '越具体（渠道、尺寸、颜色、文案、目标）效果越准。'],
      engine: ['用设计引擎精准生成', '在"🎨 设计引擎"选择平台/规格（14个渠道）并生成，自动套用推荐尺寸。', '多渠道时切换渠道用同一概念重复生成。'],
      edit: ['审阅并修改', '调整草稿的文案、颜色、规格，反复重生成/微调至满意。', '务必检查品牌调性与法律文案（价格/折扣条件）。'],
      save: ['保存到素材库', '保存到"🗂 已存广告素材库"，按渠道与时段整理，便于直接用于活动。', '按季节/促销时段管理便于复用。'],
      link: ['关联到活动', '从素材库选择广告物并关联到活动，一个草稿可跨渠道复用。', '渠道尺寸不同则回到第2–4步生成适配版本。'],
      auto: ['配置自动营销', '在[自动营销]设置目标（认知/转化）、预算与投放渠道，关联的素材将作为创意。', '设置月预算上限与节奏可防止超投。'],
      launch: ['开始投放 · 自动优化', '确认投放闸门（凭证/预算）后启动，AI将依据ROAS/转化自动再分配预算并优化。', '在[绩效中心]与[损益]实时查看成效。'],
    },
  },
  'zh-TW': {
    intro: '依序完成以下9個步驟，即可用AI建立廣告設計並完成行銷自動化投放。',
    phases: ['第1步 · 準備', '第2步 · 產生設計', '第3步 · 行銷自動化'],
    tipLabel: '💡 提示',
    s: {
      connect: ['連接頻道', '先在[整合中心]連接廣告/電商頻道（Meta、Google、Coupang等）。這是自動投放的前提。', '未連接時仍可設計，但自動投放會被阻擋。'],
      enter: ['進入AI設計', '前往[行銷 → AI設計]，在頂部切換中選擇模式。', '本手冊即該切換中的「🤖 手冊」按鈕。'],
      chat: ['用對話產生草稿', '在「💬 對話式AI設計」用一句話描述廣告，例如:「夏季促銷Instagram方形橫幅，清爽藍色調，強調最高50%」。', '越具體（頻道、尺寸、顏色、文案、目標）效果越準。'],
      engine: ['用設計引擎精準產生', '在「🎨 設計引擎」選擇平台/規格（14個頻道）並產生，自動套用建議尺寸。', '多頻道時切換頻道用同一概念重複產生。'],
      edit: ['審閱並修改', '調整草稿的文案、顏色、規格，反覆重產生/微調至滿意。', '務必檢查品牌調性與法律文案（價格/折扣條件）。'],
      save: ['儲存到素材庫', '儲存到「🗂 已存廣告素材庫」，依頻道與期間整理，便於直接用於活動。', '依季節/促銷期間管理便於重用。'],
      link: ['連結到活動', '從素材庫選擇廣告物並連結到活動，一個草稿可跨頻道重用。', '頻道尺寸不同則回到第2–4步產生適配版本。'],
      auto: ['設定自動行銷', '在[自動行銷]設定目標（認知/轉換）、預算與投放頻道，連結的素材將作為創意。', '設定月預算上限與節奏可防止超投。'],
      launch: ['開始投放 · 自動最佳化', '確認投放閘門（憑證/預算）後啟動，AI將依ROAS/轉換自動重新分配預算並最佳化。', '在[績效中心]與[損益]即時查看成效。'],
    },
  },
  de: {
    intro: 'Befolgen Sie diese 9 Schritte der Reihe nach, um mit KI Anzeigen zu gestalten und die Marketing-Automatisierung durchzuführen.',
    phases: ['Schritt 1 · Vorbereiten', 'Schritt 2 · Design erstellen', 'Schritt 3 · Marketing-Automatisierung'],
    tipLabel: '💡 Tipp',
    s: {
      connect: ['Kanäle verbinden', 'Verbinden Sie zuerst Ihre Werbe-/Commerce-Kanäle (Meta, Google, Coupang usw.) im [Integrations-Hub]. Voraussetzung für die automatische Ausführung.', 'Ohne Verbindung können Sie gestalten, aber die Auto-Ausführung ist blockiert.'],
      enter: ['KI-Design öffnen', 'Gehen Sie zu [Marketing → KI-Design] und wählen Sie oben einen Modus.', 'Dieses Handbuch ist die Schaltfläche „🤖 Handbuch".'],
      chat: ['Entwurf per Chat', 'In „💬 Dialog-KI-Design" beschreiben Sie die Anzeige in einem Satz, z. B. „Sommer-Sale Instagram-Quadrat-Banner, kühle Blautöne, bis zu 50% betonen".', 'Je konkreter (Kanal, Größe, Farbe, Text, Ziel), desto besser.'],
      engine: ['Mit der Design-Engine erzeugen', 'In „🎨 Design-Engine" Plattform/Format (14 Kanäle) wählen und erzeugen. Empfohlene Größen werden automatisch angewendet.', 'Für mehrere Kanäle dasselbe Konzept je Kanal neu erzeugen.'],
      edit: ['Prüfen und bearbeiten', 'Text, Farben und Format des Entwurfs anpassen. Bis zur Zufriedenheit neu erzeugen/anpassen.', 'Markenton und rechtliche Angaben (Preis/Rabatt) prüfen.'],
      save: ['In der Bibliothek speichern', 'In „🗂 Gespeicherte Creatives" speichern – nach Kanal und Zeitraum geordnet, sofort in Kampagnen nutzbar.', 'Nach Saison/Aktion taggen für einfache Wiederverwendung.'],
      link: ['Mit Kampagne verknüpfen', 'Creative aus der Bibliothek wählen und mit einer Kampagne verknüpfen. Ein Entwurf ist kanalübergreifend wiederverwendbar.', 'Bei abweichenden Größen Schritte 2–4 für kanalgerechte Versionen.'],
      auto: ['Auto-Marketing konfigurieren', 'In [Auto-Marketing] Ziel (Awareness/Conversion), Budget und Kanäle festlegen. Das verknüpfte Creative wird als Asset genutzt.', 'Monatsbudget-Cap und Pacing gegen Überausgaben setzen.'],
      launch: ['Starten · Auto-Optimierung', 'Ausführungs-Gate (Zugangsdaten/Budget) bestätigen und starten. Die KI verteilt das Budget nach ROAS/Conversion neu.', 'Ergebnisse live im [Performance-Hub] und [GuV].'],
    },
  },
  es: {
    intro: 'Siga estos 9 pasos en orden para crear diseños de anuncios con IA y ejecutar la automatización de marketing.',
    phases: ['Paso 1 · Preparar', 'Paso 2 · Crear diseño', 'Paso 3 · Automatización de marketing'],
    tipLabel: '💡 Consejo',
    s: {
      connect: ['Conectar canales', 'Primero conecte sus canales de anuncios/comercio (Meta, Google, Coupang, etc.) en [Centro de Integración]. Es requisito para la ejecución automática.', 'Sin conexión puede diseñar, pero la ejecución automática se bloquea.'],
      enter: ['Abrir Diseño IA', 'Vaya a [Marketing → Diseño IA] y elija un modo en el selector superior.', 'Este manual es el botón "🤖 Manual" de ese selector.'],
      chat: ['Borrador por chat', 'En "💬 Diseño IA conversacional", describa el anuncio en una frase, p. ej. "Banner cuadrado de Instagram para rebajas de verano, tonos azules frescos, destacar hasta 50%".', 'Cuanto más específico (canal, tamaño, color, texto, objetivo), mejor.'],
      engine: ['Generar con el Motor de Diseño', 'En "🎨 Motor de Diseño" elija plataforma/formato (14 canales) y genere. Los tamaños recomendados se aplican solos.', 'Para varios canales, regenere el mismo concepto por canal.'],
      edit: ['Revisar y editar', 'Ajuste texto, colores y formato del borrador. Regenere/ajuste hasta quedar satisfecho.', 'Revise el tono de marca y textos legales (precio/descuento).'],
      save: ['Guardar en Biblioteca', 'Guarde en "🗂 Biblioteca de creativos", organizada por canal y periodo para reutilizar al instante.', 'Etiquete por temporada/promoción para reutilizar fácil.'],
      link: ['Vincular a campaña', 'Seleccione un creativo de la biblioteca y vincúlelo a una campaña. Un borrador se reutiliza entre canales.', 'Si los tamaños difieren, vuelva a los pasos 2–4 para versiones por canal.'],
      auto: ['Configurar Auto Marketing', 'En [Auto Marketing] defina objetivo (awareness/conversión), presupuesto y canales. El creativo vinculado se usa como recurso.', 'Fije un tope de presupuesto mensual y pacing para evitar excesos.'],
      launch: ['Lanzar · Auto-optimizar', 'Confirme la puerta de ejecución (credenciales/presupuesto) y lance. La IA reasigna presupuesto según ROAS/conversión.', 'Vea resultados en vivo en [Centro de Rendimiento] y [P&L].'],
    },
  },
  fr: {
    intro: 'Suivez ces 9 étapes dans l’ordre pour créer des visuels publicitaires avec l’IA et lancer l’automatisation marketing.',
    phases: ['Étape 1 · Préparer', 'Étape 2 · Créer le design', 'Étape 3 · Automatisation marketing'],
    tipLabel: '💡 Astuce',
    s: {
      connect: ['Connecter les canaux', 'Connectez d’abord vos canaux pub/commerce (Meta, Google, Coupang, etc.) dans [Hub d’intégration]. Indispensable pour l’exécution automatique.', 'Sans connexion, vous pouvez créer mais l’exécution auto est bloquée.'],
      enter: ['Ouvrir Design IA', 'Allez dans [Marketing → Design IA] et choisissez un mode dans le sélecteur du haut.', 'Ce manuel est le bouton « 🤖 Manuel » de ce sélecteur.'],
      chat: ['Brouillon par chat', 'Dans « 💬 Design IA conversationnel », décrivez la pub en une phrase, ex. « bannière carrée Instagram soldes d’été, tons bleus frais, mettre en avant jusqu’à 50% ».', 'Plus c’est précis (canal, taille, couleur, texte, objectif), meilleur sera le résultat.'],
      engine: ['Générer avec le Moteur de Design', 'Dans « 🎨 Moteur de Design », choisissez plateforme/format (14 canaux) et générez. Les tailles recommandées s’appliquent automatiquement.', 'Pour plusieurs canaux, régénérez le même concept par canal.'],
      edit: ['Vérifier et modifier', 'Ajustez texte, couleurs et format du brouillon. Régénérez/ajustez jusqu’à satisfaction.', 'Vérifiez le ton de marque et les mentions légales (prix/remise).'],
      save: ['Enregistrer dans la Bibliothèque', 'Enregistrez dans « 🗂 Bibliothèque de créas », classée par canal et période pour réutilisation immédiate.', 'Taguez par saison/promo pour réutiliser facilement.'],
      link: ['Lier à une campagne', 'Sélectionnez une créa et liez-la à une campagne. Un brouillon est réutilisable sur plusieurs canaux.', 'Si les tailles diffèrent, revenez aux étapes 2–4 pour des versions par canal.'],
      auto: ['Configurer l’Auto-Marketing', 'Dans [Auto-Marketing], définissez objectif (notoriété/conversion), budget et canaux. La créa liée sert d’asset.', 'Définissez un plafond budgétaire mensuel et le pacing.'],
      launch: ['Lancer · Auto-optimiser', 'Confirmez la porte d’exécution (identifiants/budget) et lancez. L’IA réalloue le budget selon ROAS/conversion.', 'Suivez les résultats en direct dans [Hub Performance] et [P&L].'],
    },
  },
  pt: {
    intro: 'Siga estes 9 passos em ordem para criar designs de anúncios com IA e executar a automação de marketing.',
    phases: ['Passo 1 · Preparar', 'Passo 2 · Criar design', 'Passo 3 · Automação de marketing'],
    tipLabel: '💡 Dica',
    s: {
      connect: ['Conectar canais', 'Primeiro conecte seus canais de anúncios/comércio (Meta, Google, Coupang, etc.) no [Hub de Integração]. É pré-requisito para execução automática.', 'Sem conexão você pode criar, mas a execução automática fica bloqueada.'],
      enter: ['Abrir Design IA', 'Vá em [Marketing → Design IA] e escolha um modo no seletor superior.', 'Este manual é o botão "🤖 Manual" desse seletor.'],
      chat: ['Rascunho por chat', 'Em "💬 Design IA conversacional", descreva o anúncio em uma frase, ex.: "banner quadrado de Instagram para promoção de verão, tons azuis frescos, destacar até 50%".', 'Quanto mais específico (canal, tamanho, cor, texto, objetivo), melhor.'],
      engine: ['Gerar com o Motor de Design', 'Em "🎨 Motor de Design", escolha plataforma/formato (14 canais) e gere. Tamanhos recomendados são aplicados automaticamente.', 'Para vários canais, regenere o mesmo conceito por canal.'],
      edit: ['Revisar e editar', 'Ajuste texto, cores e formato do rascunho. Regenere/ajuste até ficar satisfeito.', 'Verifique tom de marca e textos legais (preço/desconto).'],
      save: ['Salvar na Biblioteca', 'Salve em "🗂 Biblioteca de criativos", organizada por canal e período para reutilização imediata.', 'Marque por temporada/promoção para reutilizar facilmente.'],
      link: ['Vincular a campanha', 'Selecione um criativo da biblioteca e vincule a uma campanha. Um rascunho é reutilizável entre canais.', 'Se os tamanhos diferem, volte aos passos 2–4 para versões por canal.'],
      auto: ['Configurar Auto Marketing', 'Em [Auto Marketing], defina objetivo (reconhecimento/conversão), orçamento e canais. O criativo vinculado é usado como recurso.', 'Defina teto de orçamento mensal e pacing para evitar excessos.'],
      launch: ['Lançar · Auto-otimizar', 'Confirme o portão de execução (credenciais/orçamento) e lance. A IA realoca o orçamento conforme ROAS/conversão.', 'Acompanhe resultados ao vivo em [Hub de Desempenho] e [P&L].'],
    },
  },
  ru: {
    intro: 'Выполните эти 9 шагов по порядку, чтобы создать рекламные дизайны с ИИ и запустить автоматизацию маркетинга.',
    phases: ['Шаг 1 · Подготовка', 'Шаг 2 · Создание дизайна', 'Шаг 3 · Автоматизация маркетинга'],
    tipLabel: '💡 Совет',
    s: {
      connect: ['Подключить каналы', 'Сначала подключите рекламные/коммерческие каналы (Meta, Google, Coupang и др.) в [Хабе интеграций]. Это обязательно для авто-запуска.', 'Без подключения можно создавать дизайн, но авто-запуск заблокирован.'],
      enter: ['Открыть ИИ-дизайн', 'Перейдите в [Маркетинг → ИИ-дизайн] и выберите режим в верхнем переключателе.', 'Это руководство — кнопка «🤖 Руководство» в переключателе.'],
      chat: ['Черновик через чат', 'В «💬 Диалоговый ИИ-дизайн» опишите рекламу одной фразой, напр.: «квадратный баннер Instagram для летней распродажи, прохладные синие тона, акцент до 50%».', 'Чем конкретнее (канал, размер, цвет, текст, цель), тем точнее.'],
      engine: ['Создать в Движке дизайна', 'В «🎨 Движок дизайна» выберите платформу/формат (14 каналов) и сгенерируйте. Рекомендуемые размеры применяются автоматически.', 'Для нескольких каналов повторите ту же концепцию по каждому каналу.'],
      edit: ['Проверить и отредактировать', 'Доработайте текст, цвета и формат черновика. Перегенерируйте/правьте до результата.', 'Проверьте тон бренда и юридический текст (цена/скидка).'],
      save: ['Сохранить в Библиотеку', 'Сохраните в «🗂 Библиотека креативов», упорядоченную по каналу и периоду для быстрого повторного использования.', 'Тегируйте по сезону/акции для удобства.'],
      link: ['Привязать к кампании', 'Выберите креатив из библиотеки и привяжите к кампании. Один черновик можно использовать в разных каналах.', 'Если размеры различаются, вернитесь к шагам 2–4 за версиями под канал.'],
      auto: ['Настроить Авто-маркетинг', 'В [Авто-маркетинг] задайте цель (узнаваемость/конверсия), бюджет и каналы. Привязанный креатив используется как материал.', 'Задайте месячный лимит бюджета и пейсинг против перерасхода.'],
      launch: ['Запуск · Авто-оптимизация', 'Подтвердите шлюз запуска (учётные данные/бюджет) и запустите. ИИ перераспределяет бюджет по ROAS/конверсии.', 'Смотрите результаты в реальном времени в [Хаб эффективности] и [P&L].'],
    },
  },
  th: {
    intro: 'ทำตาม 9 ขั้นตอนนี้ตามลำดับ เพื่อสร้างดีไซน์โฆษณาด้วย AI และทำการตลาดอัตโนมัติจนจบ',
    phases: ['ขั้นที่ 1 · เตรียม', 'ขั้นที่ 2 · สร้างดีไซน์', 'ขั้นที่ 3 · การตลาดอัตโนมัติ'],
    tipLabel: '💡 เคล็ดลับ',
    s: {
      connect: ['เชื่อมต่อช่องทาง', 'เชื่อมต่อช่องทางโฆษณา/คอมเมิร์ซ (Meta, Google, Coupang ฯลฯ) ใน [ศูนย์เชื่อมต่อ] ก่อน เป็นเงื่อนไขของการยิงอัตโนมัติ', 'หากยังไม่เชื่อมต่อ จะออกแบบได้แต่ยิงอัตโนมัติไม่ได้'],
      enter: ['เข้าสู่ AI ดีไซน์', 'ไปที่ [การตลาด → AI ดีไซน์] แล้วเลือกโหมดจากแถบสลับด้านบน', 'คู่มือนี้คือปุ่ม “🤖 คู่มือ” ในแถบสลับนั้น'],
      chat: ['ร่างด้วยแชต', 'ใน “💬 AI ดีไซน์แบบสนทนา” อธิบายโฆษณาเป็นประโยค เช่น “แบนเนอร์ Instagram สี่เหลี่ยมจัตุรัสลดราคาฤดูร้อน โทนฟ้าเย็น เน้นสูงสุด 50%”', 'ยิ่งเจาะจง (ช่องทาง ขนาด สี ข้อความ เป้าหมาย) ยิ่งแม่นยำ'],
      engine: ['สร้างด้วย Design Engine', 'ใน “🎨 Design Engine” เลือกแพลตฟอร์ม/ขนาด (14 ช่องทาง) แล้วสร้าง ระบบใส่ขนาดแนะนำให้อัตโนมัติ', 'หลายช่องทางให้สลับช่องทางแล้วสร้างซ้ำด้วยคอนเซ็ปต์เดิม'],
      edit: ['ตรวจและแก้ไข', 'ปรับข้อความ สี และขนาดของแบบร่าง สร้างใหม่/แก้จนพอใจ', 'ตรวจโทนแบรนด์และข้อความตามกฎหมาย (ราคา/เงื่อนไขส่วนลด)'],
      save: ['บันทึกลงคลัง', 'บันทึกใน “🗂 คลังชิ้นงานโฆษณา” จัดตามช่องทางและช่วงเวลา นำไปใช้กับแคมเปญได้ทันที', 'ติดแท็กตามฤดู/โปรโมชันเพื่อใช้ซ้ำง่าย'],
      link: ['เชื่อมกับแคมเปญ', 'เลือกชิ้นงานจากคลังแล้วเชื่อมกับแคมเปญ ร่างเดียวใช้ซ้ำได้หลายช่องทาง', 'หากขนาดต่างกัน ย้อนไปขั้น 2–4 เพื่อสร้างเวอร์ชันตามช่องทาง'],
      auto: ['ตั้งค่าการตลาดอัตโนมัติ', 'ใน [การตลาดอัตโนมัติ] ตั้งเป้าหมาย (การรับรู้/คอนเวอร์ชัน) งบ และช่องทาง ชิ้นงานที่เชื่อมจะถูกใช้เป็นสื่อ', 'ตั้งเพดานงบรายเดือนและการเกลี่ยเพื่อกันใช้เกิน'],
      launch: ['เริ่มยิง · ปรับให้เหมาะอัตโนมัติ', 'ยืนยันด่านการยิง (ข้อมูลรับรอง/งบ) แล้วเริ่ม AI จะจัดสรรงบใหม่ตาม ROAS/คอนเวอร์ชัน', 'ดูผลแบบเรียลไทม์ใน [ศูนย์ประสิทธิภาพ] และ [กำไรขาดทุน]'],
    },
  },
  vi: {
    intro: 'Làm theo 9 bước sau theo thứ tự để tạo thiết kế quảng cáo bằng AI và chạy tự động hóa marketing.',
    phases: ['Bước 1 · Chuẩn bị', 'Bước 2 · Tạo thiết kế', 'Bước 3 · Tự động hóa marketing'],
    tipLabel: '💡 Mẹo',
    s: {
      connect: ['Kết nối kênh', 'Trước tiên hãy kết nối các kênh quảng cáo/thương mại (Meta, Google, Coupang...) trong [Trung tâm tích hợp]. Đây là điều kiện để chạy tự động.', 'Chưa kết nối thì vẫn thiết kế được nhưng không chạy tự động.'],
      enter: ['Mở Thiết kế AI', 'Vào [Marketing → Thiết kế AI] và chọn chế độ ở thanh chuyển phía trên.', 'Hướng dẫn này chính là nút “🤖 Hướng dẫn” trên thanh đó.'],
      chat: ['Tạo bản nháp bằng chat', 'Trong “💬 Thiết kế AI hội thoại”, mô tả quảng cáo bằng một câu, vd: “banner vuông Instagram khuyến mãi hè, tông xanh mát, nhấn mạnh tới 50%”.', 'Càng cụ thể (kênh, kích thước, màu, nội dung, mục tiêu) càng chính xác.'],
      engine: ['Tạo bằng Design Engine', 'Trong “🎨 Design Engine”, chọn nền tảng/định dạng (14 kênh) và tạo. Kích thước khuyến nghị áp dụng tự động.', 'Nhiều kênh thì đổi kênh và tạo lại cùng ý tưởng.'],
      edit: ['Xem lại và chỉnh sửa', 'Tinh chỉnh nội dung, màu, định dạng của bản nháp. Tạo lại/chỉnh đến khi hài lòng.', 'Luôn kiểm tra tông thương hiệu và nội dung pháp lý (giá/điều kiện giảm).'],
      save: ['Lưu vào Thư viện', 'Lưu vào “🗂 Thư viện quảng cáo đã lưu”, sắp theo kênh và kỳ để tái sử dụng ngay trong chiến dịch.', 'Gắn thẻ theo mùa/khuyến mãi để dễ tái dùng.'],
      link: ['Liên kết chiến dịch', 'Chọn một creative từ thư viện và liên kết với chiến dịch. Một bản nháp dùng lại trên nhiều kênh.', 'Nếu kích thước khác, quay lại bước 2–4 để tạo bản phù hợp kênh.'],
      auto: ['Cấu hình Auto Marketing', 'Trong [Auto Marketing], đặt mục tiêu (nhận biết/chuyển đổi), ngân sách và kênh. Creative liên kết được dùng làm tư liệu.', 'Đặt trần ngân sách tháng và pacing để tránh chi vượt.'],
      launch: ['Khởi chạy · Tự tối ưu', 'Xác nhận cổng chạy (thông tin xác thực/ngân sách) rồi khởi chạy. AI phân bổ lại ngân sách theo ROAS/chuyển đổi.', 'Xem kết quả trực tiếp tại [Trung tâm hiệu suất] và [P&L].'],
    },
  },
  id: {
    intro: 'Ikuti 9 langkah ini secara berurutan untuk membuat desain iklan dengan AI dan menjalankan otomasi pemasaran.',
    phases: ['Langkah 1 · Persiapan', 'Langkah 2 · Buat Desain', 'Langkah 3 · Otomasi Pemasaran'],
    tipLabel: '💡 Tips',
    s: {
      connect: ['Hubungkan kanal', 'Hubungkan dulu kanal iklan/commerce (Meta, Google, Coupang, dll.) di [Hub Integrasi]. Syarat untuk eksekusi otomatis.', 'Tanpa koneksi Anda tetap bisa mendesain, tetapi eksekusi otomatis terblokir.'],
      enter: ['Buka Desain AI', 'Buka [Pemasaran → Desain AI] dan pilih mode di toggle atas.', 'Manual ini adalah tombol "🤖 Manual" pada toggle tersebut.'],
      chat: ['Draf via chat', 'Di "💬 Desain AI percakapan", jelaskan iklan dalam satu kalimat, mis. "banner persegi Instagram diskon musim panas, nuansa biru sejuk, tonjolkan hingga 50%".', 'Makin spesifik (kanal, ukuran, warna, teks, tujuan) makin akurat.'],
      engine: ['Hasilkan dengan Design Engine', 'Di "🎨 Design Engine", pilih platform/format (14 kanal) dan hasilkan. Ukuran rekomendasi diterapkan otomatis.', 'Untuk banyak kanal, hasilkan ulang konsep yang sama per kanal.'],
      edit: ['Tinjau dan edit', 'Sesuaikan teks, warna, dan format draf. Hasilkan ulang/sesuaikan hingga puas.', 'Selalu cek nada merek dan teks legal (harga/syarat diskon).'],
      save: ['Simpan ke Pustaka', 'Simpan ke "🗂 Pustaka Materi Iklan", tertata per kanal dan periode untuk dipakai ulang langsung di kampanye.', 'Beri tag per musim/promo agar mudah dipakai ulang.'],
      link: ['Tautkan ke kampanye', 'Pilih materi dari pustaka dan tautkan ke kampanye. Satu draf bisa dipakai ulang lintas kanal.', 'Jika ukuran beda, kembali ke langkah 2–4 untuk versi sesuai kanal.'],
      auto: ['Atur Auto Marketing', 'Di [Auto Marketing], tetapkan tujuan (awareness/konversi), anggaran, dan kanal. Materi yang ditautkan dipakai sebagai aset.', 'Tetapkan batas anggaran bulanan dan pacing agar tidak overspend.'],
      launch: ['Luncurkan · Auto-optimasi', 'Konfirmasi gerbang eksekusi (kredensial/anggaran) lalu luncurkan. AI mengalokasikan ulang anggaran berdasarkan ROAS/konversi.', 'Pantau hasil real-time di [Hub Performa] dan [P&L].'],
    },
  },
  ar: {
    intro: 'اتبع هذه الخطوات التسع بالترتيب لإنشاء تصاميم إعلانية بالذكاء الاصطناعي وتشغيل أتمتة التسويق بالكامل.',
    phases: ['الخطوة 1 · التحضير', 'الخطوة 2 · إنشاء التصميم', 'الخطوة 3 · أتمتة التسويق'],
    tipLabel: '💡 نصيحة',
    s: {
      connect: ['ربط القنوات', 'أولاً اربط قنوات الإعلان/التجارة (Meta، Google، Coupang، إلخ) في [مركز التكامل]. شرط أساسي للتنفيذ التلقائي.', 'بدون ربط يمكنك التصميم لكن يُحظر التنفيذ التلقائي.'],
      enter: ['افتح تصميم الذكاء الاصطناعي', 'اذهب إلى [التسويق → تصميم AI] واختر وضعًا من المبدّل العلوي.', 'هذا الدليل هو زر «🤖 الدليل» في ذلك المبدّل.'],
      chat: ['مسودة عبر المحادثة', 'في «💬 تصميم AI حواري»، صف الإعلان بجملة، مثل: «بانر مربع لإنستغرام لتخفيضات الصيف، ألوان زرقاء منعشة، إبراز حتى 50%».', 'كلما زاد التحديد (القناة، المقاس، اللون، النص، الهدف) زادت الدقة.'],
      engine: ['أنشئ بمحرك التصميم', 'في «🎨 محرك التصميم» اختر المنصة/المقاس (14 قناة) وأنشئ. تُطبَّق المقاسات الموصى بها تلقائيًا.', 'لعدة قنوات، أعد الإنشاء بنفس الفكرة لكل قناة.'],
      edit: ['راجع وعدّل', 'اضبط النص والألوان والمقاس للمسودة. أعد الإنشاء/التعديل حتى الرضا.', 'تحقق من نبرة العلامة والنصوص القانونية (السعر/شروط الخصم).'],
      save: ['احفظ في المكتبة', 'احفظ في «🗂 مكتبة المواد الإعلانية» مرتبة حسب القناة والفترة لإعادة الاستخدام فورًا.', 'ضع وسومًا حسب الموسم/العرض لتسهيل إعادة الاستخدام.'],
      link: ['اربط بحملة', 'اختر مادة من المكتبة واربطها بحملة. يمكن إعادة استخدام مسودة واحدة عبر القنوات.', 'إذا اختلفت المقاسات، ارجع للخطوات 2–4 لإنشاء نسخ مناسبة لكل قناة.'],
      auto: ['اضبط التسويق التلقائي', 'في [التسويق التلقائي] حدّد الهدف (وعي/تحويل) والميزانية والقنوات. تُستخدم المادة المرتبطة كأصل.', 'حدّد سقف ميزانية شهري ووتيرة لمنع الإنفاق الزائد.'],
      launch: ['أطلق · تحسين تلقائي', 'أكّد بوابة التنفيذ (بيانات الاعتماد/الميزانية) ثم أطلق. يعيد الذكاء الاصطناعي توزيع الميزانية حسب ROAS/التحويل.', 'تابع النتائج مباشرة في [مركز الأداء] و[الأرباح والخسائر].'],
    },
  },
  hi: {
    intro: 'AI से विज्ञापन डिज़ाइन बनाने और मार्केटिंग ऑटोमेशन तक पूरा करने के लिए इन 9 चरणों का क्रम से पालन करें।',
    phases: ['चरण 1 · तैयारी', 'चरण 2 · डिज़ाइन बनाएं', 'चरण 3 · मार्केटिंग ऑटोमेशन'],
    tipLabel: '💡 सुझाव',
    s: {
      connect: ['चैनल जोड़ें', 'पहले [इंटीग्रेशन हब] में अपने विज्ञापन/कॉमर्स चैनल (Meta, Google, Coupang आदि) जोड़ें। ऑटो-निष्पादन के लिए आवश्यक।', 'बिना कनेक्शन डिज़ाइन तो बन सकता है पर ऑटो-निष्पादन रुक जाता है।'],
      enter: ['AI डिज़ाइन खोलें', '[मार्केटिंग → AI डिज़ाइन] पर जाएं और ऊपर के टॉगल से मोड चुनें।', 'यह मैनुअल उसी टॉगल का "🤖 मैनुअल" बटन है।'],
      chat: ['चैट से ड्राफ्ट', '"💬 संवादात्मक AI डिज़ाइन" में विज्ञापन एक वाक्य में बताएं, जैसे "समर सेल इंस्टाग्राम वर्गाकार बैनर, ठंडे नीले टोन, 50% तक हाइलाइट"।', 'जितना विशिष्ट (चैनल, आकार, रंग, टेक्स्ट, लक्ष्य) उतना सटीक।'],
      engine: ['डिज़ाइन इंजन से बनाएं', '"🎨 डिज़ाइन इंजन" में प्लेटफ़ॉर्म/आकार (14 चैनल) चुनें और बनाएं। अनुशंसित आकार अपने-आप लागू होते हैं।', 'कई चैनलों के लिए चैनल बदलकर वही कॉन्सेप्ट दोबारा बनाएं।'],
      edit: ['समीक्षा और संपादन', 'ड्राफ्ट का टेक्स्ट, रंग और आकार समायोजित करें। संतुष्ट होने तक दोबारा बनाएं/समायोजित करें।', 'ब्रांड टोन और कानूनी टेक्स्ट (मूल्य/छूट शर्तें) अवश्य जांचें।'],
      save: ['लाइब्रेरी में सहेजें', '"🗂 सहेजी गई क्रिएटिव लाइब्रेरी" में सहेजें, चैनल और अवधि अनुसार व्यवस्थित — अभियानों में तुरंत पुनः उपयोग।', 'सीज़न/प्रमोशन अनुसार टैग करें ताकि पुनः उपयोग आसान हो।'],
      link: ['अभियान से जोड़ें', 'लाइब्रेरी से क्रिएटिव चुनें और अभियान से जोड़ें। एक ड्राफ्ट कई चैनलों पर पुनः उपयोग हो सकता है।', 'आकार अलग हों तो चैनल-अनुकूल संस्करण के लिए चरण 2–4 पर लौटें।'],
      auto: ['ऑटो मार्केटिंग सेट करें', '[ऑटो मार्केटिंग] में लक्ष्य (जागरूकता/रूपांतरण), बजट और चैनल सेट करें। जुड़ी क्रिएटिव एसेट के रूप में उपयोग होगी।', 'ओवरस्पेंड रोकने हेतु मासिक बजट सीमा और पेसिंग सेट करें।'],
      launch: ['लॉन्च · ऑटो-ऑप्टिमाइज़', 'निष्पादन गेट (क्रेडेंशियल/बजट) पुष्टि कर लॉन्च करें। AI ROAS/रूपांतरण अनुसार बजट पुनः आवंटित करता है।', 'परिणाम [परफ़ॉर्मेंस हब] और [P&L] में रियल-टाइम देखें।'],
    },
  },
};

export default function AiDesignManual() {
  const { lang } = useI18n();
  const d = M[lang] || M.en;
  const phaseColors = ['#6366f1', '#a855f7', '#22c55e'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card card-glass" style={{ background: 'rgba(124,58,237,0.06)', padding: '14px 18px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{d.intro}</div>
      </div>
      {[0, 1, 2].map((ph) => (
        <div key={ph} className="card card-glass" style={{ padding: '14px 16px', borderLeft: `3px solid ${phaseColors[ph]}` }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: phaseColors[ph], marginBottom: 10 }}>{d.phases[ph]}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEP_META.map((m, i) => m[0] === ph ? (
              <div key={m[2]} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: phaseColors[ph], color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 3 }}>{m[1]} {d.s[m[2]][0]}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{d.s[m[2]][1]}</div>
                  {d.s[m[2]][2] && <div style={{ fontSize: 11.5, color: phaseColors[ph], marginTop: 4 }}>{d.tipLabel}: {d.s[m[2]][2]}</div>}
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      ))}
    </div>
  );
}
