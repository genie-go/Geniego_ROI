import React from "react";

/**
 * [282차 R3] 구독플랜 추천인 제도 홍보 배너 — 홈(Landing) + 요금제(PricingPublic) 공용.
 *  - "보상은 100% 확실하다"를 강조하는 카피 + 프리미엄 디자인.
 *  - 15개국 현지 자연어 내장 사전(공개 페이지는 서로 다른 i18n 체계를 써서, 즉시 15국 보장을 위해 자체 사전 사용).
 *  - lang prop 을 받아 현재 언어로 렌더(미지원 언어는 en 폴백).
 */

const L = {
  badge: {
    ko: "추천 리워드 프로그램", en: "Referral Rewards", ja: "紹介リワード", zh: "推荐奖励计划", "zh-TW": "推薦獎勵計畫",
    vi: "Phần thưởng giới thiệu", th: "โปรแกรมแนะนำเพื่อน", id: "Program Referral", de: "Empfehlungsprämie", fr: "Programme de parrainage",
    es: "Programa de referidos", pt: "Programa de indicação", ru: "Реферальная программа", ar: "برنامج الإحالة", hi: "रेफ़रल रिवॉर्ड",
  },
  title: {
    ko: "추천하고, PRO 1개월을 무료로 받으세요", en: "Refer a business, get 1 month of PRO — free",
    ja: "紹介して、PROを1ヶ月無料でゲット", zh: "推荐企业，免费获得 1 个月 PRO", "zh-TW": "推薦企業，免費獲得 1 個月 PRO",
    vi: "Giới thiệu doanh nghiệp, nhận 1 tháng PRO miễn phí", th: "แนะนำธุรกิจ รับ PRO ฟรี 1 เดือน",
    id: "Ajak bisnis lain, dapat 1 bulan PRO gratis", de: "Empfehlen und 1 Monat PRO gratis erhalten",
    fr: "Parrainez une entreprise, obtenez 1 mois de PRO offert", es: "Recomienda una empresa y obtén 1 mes de PRO gratis",
    pt: "Indique uma empresa e ganhe 1 mês de PRO grátis", ru: "Пригласите компанию — получите 1 месяц PRO бесплатно",
    ar: "أحِل شركة واحصل على شهر PRO مجانًا", hi: "किसी व्यवसाय को रेफ़र करें, 1 महीना PRO मुफ़्त पाएं",
  },
  guarantee: {
    ko: "보상은 100% 확실합니다", en: "Your reward is 100% guaranteed", ja: "リワードは100%確実です", zh: "奖励 100% 保证到账",
    "zh-TW": "獎勵 100% 保證到帳", vi: "Phần thưởng được đảm bảo 100%", th: "รับรางวัลแน่นอน 100%", id: "Hadiah dijamin 100%",
    de: "Ihre Prämie ist zu 100 % garantiert", fr: "Votre récompense est garantie à 100 %", es: "Tu recompensa está 100 % garantizada",
    pt: "Sua recompensa é 100% garantida", ru: "Награда гарантирована на 100%", ar: "مكافأتك مضمونة 100%", hi: "आपका इनाम 100% गारंटीड है",
  },
  desc: {
    ko: "이미 구독 중인 회원이 다른 기업을 추천해 구독 가입시키면, 추천하신 분께 PRO 플랜 1개월 무료 이용권을 자동으로 지급합니다. 추천일로부터 1년간 유효합니다.",
    en: "When an existing subscriber refers another business that subscribes, we automatically grant the referrer a 1-month PRO plan voucher — valid for a full year from the referral date.",
    ja: "既存の会員が他社を紹介して契約に至ると、紹介者へPROプラン1ヶ月無料券を自動で付与します。紹介日から1年間有効です。",
    zh: "现有订阅会员推荐其他企业成功订阅后，我们将自动向推荐人发放 1 个月 PRO 套餐抵用券，自推荐之日起一年内有效。",
    "zh-TW": "現有訂閱會員推薦其他企業成功訂閱後，我們將自動向推薦人發放 1 個月 PRO 方案抵用券，自推薦之日起一年內有效。",
    vi: "Khi một thành viên đang đăng ký giới thiệu doanh nghiệp khác đăng ký thành công, người giới thiệu sẽ tự động nhận phiếu PRO 1 tháng — có hiệu lực trong một năm kể từ ngày giới thiệu.",
    th: "เมื่อสมาชิกที่สมัครอยู่แล้วแนะนำธุรกิจอื่นให้สมัคร ผู้แนะนำจะได้รับบัตรใช้งานแผน PRO ฟรี 1 เดือนโดยอัตโนมัติ มีอายุหนึ่งปีนับจากวันที่แนะนำ",
    id: "Saat pelanggan yang sudah berlangganan mengajak bisnis lain berlangganan, perujuk otomatis mendapat voucher paket PRO 1 bulan — berlaku selama satu tahun sejak tanggal rujukan.",
    de: "Wenn ein bestehender Abonnent ein anderes Unternehmen wirbt, das abonniert, erhält der Werber automatisch einen 1-Monats-PRO-Gutschein – ein Jahr lang ab dem Empfehlungsdatum gültig.",
    fr: "Lorsqu'un abonné existant parraine une autre entreprise qui s'abonne, le parrain reçoit automatiquement un bon PRO d'un mois, valable un an à compter de la date de parrainage.",
    es: "Cuando un suscriptor actual recomienda a otra empresa que se suscribe, el recomendador recibe automáticamente un cupón de 1 mes del plan PRO, válido durante un año desde la fecha de recomendación.",
    pt: "Quando um assinante atual indica outra empresa que assina, o indicador recebe automaticamente um voucher do plano PRO de 1 mês, válido por um ano a partir da data da indicação.",
    ru: "Когда действующий подписчик приглашает другую компанию, которая оформляет подписку, реферер автоматически получает ваучер на 1 месяц тарифа PRO, действительный в течение года с даты рекомендации.",
    ar: "عندما يُحيل مشترك حالي شركة أخرى تشترك، يحصل المُحيل تلقائيًا على قسيمة خطة PRO لمدة شهر، صالحة لمدة عام كامل من تاريخ الإحالة.",
    hi: "जब कोई मौजूदा सब्सक्राइबर किसी अन्य व्यवसाय को रेफ़र करता है और वह सब्सक्राइब करता है, तो रेफ़र करने वाले को स्वचालित रूप से 1 महीने का PRO प्लान वाउचर मिलता है — रेफ़रल तिथि से एक वर्ष तक मान्य।",
  },
  fairNote: {
    ko: "추천으로 가입한 회원이 1개월 구독을 유지하면 보상이 자동으로 활성화됩니다. 확실하고 공정하게 지급됩니다.",
    en: "The reward activates automatically once the referred member keeps their subscription past the first month — certain and fair.",
    ja: "紹介された会員が最初の1ヶ月を継続すると、リワードが自動で有効になります。確実かつ公正にお支払いします。",
    zh: "被推荐会员在首月之后继续订阅时，奖励将自动激活——确定且公平。",
    "zh-TW": "被推薦會員在首月之後繼續訂閱時，獎勵將自動啟用——確定且公平。",
    vi: "Phần thưởng tự động kích hoạt khi thành viên được giới thiệu duy trì đăng ký qua tháng đầu tiên — chắc chắn và công bằng.",
    th: "รางวัลจะเปิดใช้งานอัตโนมัติเมื่อสมาชิกที่ถูกแนะนำต่ออายุการสมัครหลังเดือนแรก — แน่นอนและยุติธรรม",
    id: "Hadiah aktif otomatis begitu anggota yang diajak tetap berlangganan lewat bulan pertama — pasti dan adil.",
    de: "Die Prämie wird automatisch aktiviert, sobald das geworbene Mitglied sein Abo über den ersten Monat hinaus behält – sicher und fair.",
    fr: "La récompense s'active automatiquement dès que le membre parrainé conserve son abonnement au-delà du premier mois — sûr et équitable.",
    es: "La recompensa se activa automáticamente cuando el miembro referido mantiene su suscripción más allá del primer mes: seguro y justo.",
    pt: "A recompensa é ativada automaticamente quando o membro indicado mantém a assinatura após o primeiro mês — certo e justo.",
    ru: "Награда активируется автоматически, как только приглашённый участник сохраняет подписку после первого месяца — надёжно и честно.",
    ar: "تُفعَّل المكافأة تلقائيًا بمجرد احتفاظ العضو المُحال باشتراكه بعد الشهر الأول — مؤكَّد وعادل.",
    hi: "रेफ़र किया गया सदस्य पहले महीने के बाद सब्सक्रिप्शन जारी रखता है, तो इनाम स्वतः सक्रिय हो जाता है — निश्चित और निष्पक्ष।",
  },
  cta: {
    ko: "내 추천 코드 받기", en: "Get my referral code", ja: "紹介コードを取得", zh: "获取我的推荐码", "zh-TW": "取得我的推薦碼",
    vi: "Nhận mã giới thiệu", th: "รับรหัสแนะนำของฉัน", id: "Dapatkan kode referral", de: "Meinen Empfehlungscode erhalten",
    fr: "Obtenir mon code de parrainage", es: "Obtener mi código de referido", pt: "Obter meu código de indicação",
    ru: "Получить мой реферальный код", ar: "احصل على رمز الإحالة", hi: "मेरा रेफ़रल कोड पाएं",
  },
  steps: {
    ko: ["구독 회원이 추천 코드를 공유", "추천받은 기업이 구독 가입", "PRO 1개월 무료 이용권 자동 지급"],
    en: ["A subscriber shares their code", "The referred business subscribes", "1 month of PRO is granted automatically"],
    ja: ["会員が紹介コードを共有", "紹介された企業が契約", "PRO 1ヶ月無料券を自動付与"],
    zh: ["订阅会员分享推荐码", "被推荐企业完成订阅", "自动发放 1 个月 PRO"],
    "zh-TW": ["訂閱會員分享推薦碼", "被推薦企業完成訂閱", "自動發放 1 個月 PRO"],
    vi: ["Thành viên chia sẻ mã", "Doanh nghiệp được giới thiệu đăng ký", "Tự động nhận 1 tháng PRO"],
    th: ["สมาชิกแชร์รหัสแนะนำ", "ธุรกิจที่ถูกแนะนำสมัคร", "รับ PRO 1 เดือนอัตโนมัติ"],
    id: ["Pelanggan membagikan kode", "Bisnis yang diajak berlangganan", "1 bulan PRO diberikan otomatis"],
    de: ["Abonnent teilt seinen Code", "Geworbenes Unternehmen abonniert", "1 Monat PRO automatisch"],
    fr: ["Un abonné partage son code", "L'entreprise parrainée s'abonne", "1 mois de PRO automatiquement"],
    es: ["Un suscriptor comparte su código", "La empresa referida se suscribe", "1 mes de PRO automático"],
    pt: ["Assinante compartilha o código", "Empresa indicada assina", "1 mês de PRO automático"],
    ru: ["Подписчик делится кодом", "Приглашённая компания подписывается", "1 месяц PRO автоматически"],
    ar: ["يشارك المشترك رمزه", "تشترك الشركة المُحالة", "شهر PRO تلقائيًا"],
    hi: ["सब्सक्राइबर कोड साझा करता है", "रेफ़र किया व्यवसाय सब्सक्राइब करता है", "1 महीना PRO स्वतः"],
  },
};

const pick = (dict, lang) => dict[lang] || dict.en;

export default function ReferralPromo({ lang = "en", onCta, compact = false }) {
  const badge = pick(L.badge, lang);
  const title = pick(L.title, lang);
  const guarantee = pick(L.guarantee, lang);
  const desc = pick(L.desc, lang);
  const fairNote = pick(L.fairNote, lang);
  const cta = pick(L.cta, lang);
  const steps = pick(L.steps, lang);
  const rtl = lang === "ar";

  // [282차 R3 가독성 근본수정] 밝은테마(arctic_white/pearl_office) app 컨텍스트의 styles.css 화이트닝 규칙이
  //   linear-gradient/다크 카드 배경을 흰색으로 강제하고 글자색을 뒤섞어 "흰-on-흰"이 발생했다(공개 다크페이지에선
  //   정상이나 로그인 후 /app-pricing 에서 깨짐). 요소별 대응은 whack-a-mole 이라, 컴포넌트를 **라이트 카드**로
  //   재설계해 어느 테마·컨텍스트에서도 진한 글자/충분한 대비를 보장한다(다크 남색 텍스트 + 강한 액센트).
  return (
    <section dir={rtl ? "rtl" : "ltr"} style={{
      maxWidth: 1120, margin: compact ? "24px auto" : "56px auto", padding: "0 20px",
    }}>
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 24,
        background: "#f8fafc", border: "1px solid #dbe4f0",
        boxShadow: "0 16px 48px rgba(15,23,42,0.10)", color: "#0f172a",
        padding: compact ? "28px 24px" : "44px 40px",
      }}>
        {/* 좌측 강조 바 */}
        <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: 0, width: 5, background: "#4f8ef7" }} />

        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 460px", minWidth: 300 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "6px 14px", borderRadius: 999, background: "#e6efff", border: "1px solid #b9d0ff", color: "#1d4ed8" }}>
              🎁 {badge}
            </span>
            <h2 style={{ margin: "16px 0 10px", fontSize: compact ? 24 : 30, lineHeight: 1.22, fontWeight: 900, letterSpacing: -0.4, color: "#0f172a" }}>{title}</h2>

            {/* 확실성 보증 배지 — 진한 녹색 글자로 대비 확보(라이트 카드) */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: "#dcfce7", border: "1px solid #86efac", marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#047857" }}>{guarantee}</span>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{desc}</p>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "#64748b", display: "flex", gap: 8 }}>
              <span aria-hidden>🔒</span><span>{fairNote}</span>
            </p>

            {onCta && (
              <button onClick={onCta} style={{
                marginTop: 22, padding: "13px 26px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "#4f8ef7", color: "#fff", fontWeight: 800, fontSize: 14,
                boxShadow: "0 8px 22px rgba(79,142,247,0.35)",
              }}>{cta} →</button>
            )}
          </div>

          {/* 3단계 카드 */}
          <div style={{ flex: "0 1 320px", minWidth: 260, display: "grid", gap: 12 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "#fff", border: "1px solid #e5eaf2", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                <div style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14, background: i === 2 ? "#10b981" : "#4f8ef7", color: "#fff" }}>{i + 1}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: "#1e293b" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
