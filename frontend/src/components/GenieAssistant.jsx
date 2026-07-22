// [현 차수] GenieGo Assistant — "무엇이든 물어보세요" 초엔터프라이즈 대화형 상담 챗봇(ChatGPT 스타일).
//   GeniegoROI 메뉴·기능·사용법 무엇이든 15개국 현지 자연어로 상담. 실 Claude(백엔드 /v422/ai/assistant) +
//   키 미설정/오프라인 시 로컬 메뉴 KB 폴백. 멀티턴 대화·맥락 유지·대화 영속(tenant 격리)·마크다운·추천질문.
//   ★브랜딩=GeniegoROI 로고(/logo_v5.png). 차량/박스 등 일러스트 미사용.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/index.js';
import { tScopedKey } from '../utils/tenantStorage.js';
import { postJsonAuth } from '../services/apiClient.js'; // [현 차수] 세션 Bearer 인증 호출(v422/ai 인증 필요)

const LOGO = '/logo_v2.png'; // [현 차수] 순수 지니 캐릭터(어두운 배경, 지도/차량 없음) — GenieMark 가 지니 얼굴만 원형 크롭
const API = '/api/v422/ai/assistant';

// [현 차수] 지니 마크 — 로고에서 지니 캐릭터만 원형으로 꽉 채워 크롭(지구본·차량·램프·텍스트 배제, 얼굴 안 잘림). 선명·일관.
const GenieMark = ({ size, ring }) => (
  <div aria-label="GenieGo" role="img" style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    backgroundImage: `url(${LOGO})`, backgroundRepeat: 'no-repeat', backgroundSize: '220%', backgroundPosition: '45% 23%',
    boxShadow: ring ? '0 0 0 2px rgba(255,255,255,0.9), 0 2px 6px rgba(15,23,42,0.15)' : 'none',
  }} />
);
const STORE = 'genie_assistant_thread';

/* 경량 마크다운 → HTML(굵게/코드/리스트/줄바꿈). XSS 회피 위해 먼저 escape. */
function mdToHtml(s) {
  let t = String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  t = t.replace(/```([\s\S]*?)```/g, (_, c) => `<pre style="background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;overflow:auto;font-size:12px;margin:6px 0">${c.trim()}</pre>`);
  t = t.replace(/`([^`]+)`/g, '<code style="background:rgba(79,142,247,0.12);color:#2563eb;padding:1px 5px;border-radius:5px;font-size:0.92em">$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/^### (.*)$/gm, '<div style="font-weight:800;font-size:13.5px;margin:8px 0 4px">$1</div>');
  t = t.replace(/^(\s*)[-•] (.*)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#4f8ef7">•</span><span>$2</span></div>');
  t = t.replace(/^(\s*)(\d+)\. (.*)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#4f8ef7;font-weight:700">$2.</span><span>$3</span></div>');
  t = t.replace(/\n/g, '<br/>');
  return t;
}

/* 로컬 메뉴 KB 폴백 — 실 AI 미사용 시(데모/키 미설정) 키워드→메뉴 안내(현지 자연어 템플릿). */
const KB = [
  { re: /(정산|대조|recon|settle|정산대조|決済|结算|清算)/i, path: 'omni:settle', menu: { ko: '커머스 및 물류 › 정산 / 정산 대조', en: 'Commerce & Logistics › Settlements / Reconciliation' } },
  { re: /(반품|return|refund|返品|退货|退貨)/i, path: 'returns', menu: { ko: '커머스 및 물류 › 반품 포털', en: 'Commerce & Logistics › Returns Portal' } },
  { re: /(광고|캠페인|roas|ad|campaign|広告|广告|廣告)/i, path: 'mkt', menu: { ko: '광고 및 채널 분석 › 광고성과 / 예산 관리', en: 'Ads & Channels › Marketing / Budget' } },
  { re: /(재고|입출고|창고|wms|inventory|stock|在庫|库存|庫存|유통기한|임가공)/i, path: 'wms', menu: { ko: 'WMS 재고관리(물류 대시보드·입출고·LOT·임가공·정기리포트)', en: 'WMS (logistics dashboard · in/out · LOT · toll processing · reports)' } },
  { re: /(결제|청구|카드|payment|billing|決済|支付|付款)/i, path: 'pay', menu: { ko: '결제수단(광고비 카드·월예산·결제내역)', en: 'Payment Methods (ad card · monthly budget · charge history)' } },
  { re: /(연동|api|채널연결|connect|integration|連携|对接|對接)/i, path: 'ih', menu: { ko: '데이터 및 수집 › 연동 허브', en: 'Data & Collection › Integration Hub' } },
  { re: /(상품|sku|product|특정상품|商品|产品|產品)/i, path: 'prod', menu: { ko: '대시보드/메뉴 상단의 상품 조회바(선택 시 전 메뉴 동기화)', en: 'the product selector at the top of dashboards/menus (syncs across menus)' } },
  { re: /(기간|날짜|period|date|期間|期间|기간조회)/i, path: 'period', menu: { ko: '각 화면 상단의 기간 선택(전체/7·30·90일/사용자지정)', en: 'the period selector at the top of each screen (All/7·30·90 days/custom)' } },
  { re: /(손익|pnl|p&l|profit|순이익|損益|损益)/i, path: 'pnl', menu: { ko: '성과 및 리포팅 › P&L 손익', en: 'Performance & Reporting › P&L' } },
  { re: /(crm|고객|세그먼트|customer|顧客|客户|客戶)/i, path: 'crm', menu: { ko: '고객/CRM › CRM 대시보드', en: 'Customer/CRM › CRM Dashboard' } },
  { re: /(팀|권한|멤버|거래처|파트너|team|member|permission)/i, path: 'team', menu: { ko: '팀·계정 › 팀원·권한(파트너 계정·거래처 포함)', en: 'Team & Accounts › Members & Permissions (incl. partners/vendors)' } },
];
function kbAnswer(q, lang) {
  const hit = KB.find(k => k.re.test(q));
  const menu = hit ? (hit.menu[lang] || hit.menu.en || hit.menu.ko) : null;
  const TPL = {
    ko: menu ? `**${menu}** 메뉴에서 확인하실 수 있어요. 해당 메뉴로 이동해 보세요.\n\n더 구체적으로 알려주시면(예: "쿠팡 정산 대조하는 법") 단계별로 안내해 드릴게요.` : `GeniegoROI 사용에 대해 무엇이든 물어보세요 — 메뉴·기능·사용법을 안내해 드립니다. 예: "반품 처리하는 법", "광고 ROAS 보는 곳".`,
    en: menu ? `You can do this in **${menu}**. Open that menu to proceed.\n\nTell me more specifically (e.g., "how to reconcile Coupang settlements") and I'll guide you step by step.` : `Ask me anything about using GeniegoROI — menus, features, how-to. e.g., "how to process a return", "where to see ad ROAS".`,
  };
  return TPL[lang] || TPL.en;
}

function starters(lang) {
  const S = {
    ko: ['ROAS가 뭐예요? 쉽게 설명해줘', '어트리뷰션이 무슨 뜻이야?', '정산 대조는 어떻게 하나요?', '특정 상품 성과는 어디서 보나요?'],
    en: ['What is ROAS? Explain it simply', 'What does attribution mean?', 'How do I reconcile settlements?', 'Where can I see a single product’s performance?'],
    ja: ['ROASとは何ですか？やさしく教えて', 'アトリビューションの意味は？', '決済の照合はどうやりますか？', '特定商品の実績はどこで見ますか？'],
    zh: ['什么是ROAS？请简单说明', '归因是什么意思？', '如何进行结算对账？', '在哪里查看单个商品的业绩？'],
  };
  return S[lang] || S.en;
}

export default function GenieAssistant() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState(() => { try { const r = localStorage.getItem(tScopedKey(STORE)); return r ? JSON.parse(r) : []; } catch { return []; } });
  const scrollRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(tScopedKey(STORE), JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, open, busy]);

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      const r = await postJsonAuth(API, { messages: next.slice(-10), question: q, lang }).catch(() => null);
      let answer = (r && r.ok && r.answer) ? r.answer : null;
      // AI 미응답(데모/키 미설정/오프라인) — 용어집 폴백 우선(별도 청크 lazy), 없으면 메뉴 KB.
      if (!answer) {
        try { const g = await import('./genieGlossary.js'); answer = g.glossaryAnswer(q, lang); } catch { /* 청크 로드 실패 무시 */ }
        if (!answer) answer = kbAnswer(q, lang);
      }
      // [289차 후속 / MEA 055 D-3] Citation — 서버가 실제로 참조한 기능 블록(ns·title·진입경로).
      //   ★AI 생성물이 아니라 검색 단계에서 결정론적으로 선별된 코퍼스 항목이라 환각이 섞이지 않는다.
      //   AI 폴백(로컬 KB)로 답한 경우엔 근거가 없으므로 표시하지 않는다.
      const sources = (r && r.ok && r.answer && Array.isArray(r.sources)) ? r.sources : [];
      setMsgs(m => [...m, { role: 'assistant', content: answer, _kb: !(r && r.answer), sources }]);
    } catch {
      let answer = null;
      try { const g = await import('./genieGlossary.js'); answer = g.glossaryAnswer(q, lang); } catch {}
      setMsgs(m => [...m, { role: 'assistant', content: answer || kbAnswer(q, lang), _kb: true }]);
    } finally { setBusy(false); setTimeout(() => taRef.current?.focus(), 50); }
  }, [input, busy, msgs, lang]);

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const reset = () => { setMsgs([]); try { localStorage.removeItem(tScopedKey(STORE)); } catch {} };

  const title = t('assistant.title', '무엇이든 물어보세요');
  const sub = t('assistant.sub', 'GeniegoROI 사용법·메뉴 상담');
  const ph = t('assistant.placeholder', '메뉴·기능·사용법을 물어보세요…');

  return (
    <>
      {/* 플로팅 런처 — 로고 */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label={title}
          style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 9000, height: 64, borderRadius: 32, border: '1px solid #eef2f7', cursor: 'pointer', background: '#fff', boxShadow: '0 10px 30px rgba(15,23,42,0.22)', display: 'flex', alignItems: 'center', gap: 11, transition: 'transform .2s', padding: '0 22px 0 6px' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <div style={{ position: 'relative' }}>
            <GenieMark size={52} />
            <span style={{ position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25 }}>
            <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', color: '#4f46e5' }}>{title}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>💬 {sub}</span>
          </div>
        </button>
      )}

      {open && (
        <div style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 9001, width: 'min(420px, calc(100vw - 24px))', height: 'min(640px, calc(100vh - 80px))', background: '#fff', borderRadius: 18, boxShadow: '0 24px 70px rgba(15,23,42,0.32)', border: '1px solid #e9eef5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 헤더 */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <GenieMark size={42} ring />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{title}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{sub}</div>
            </div>
            <button onClick={reset} title={t('assistant.newChat', '새 대화')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, width: 30, height: 30, fontSize: 14 }}>✎</button>
            <button onClick={() => setOpen(false)} title={t('assistant.close', '닫기')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 8, width: 30, height: 30, fontSize: 16 }}>✕</button>
          </div>

          {/* 메시지 */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', background: '#f8fafc' }}>
            {msgs.length === 0 && (
              <div style={{ padding: '8px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <GenieMark size={30} />
                  <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.7 }}>{t('assistant.greeting', '안녕하세요! GeniegoROI 사용에 대해 무엇이든 물어보세요. 메뉴·기능·사용법은 물론, ROAS·어트리뷰션·LTV 같은 용어도 쉽게 설명해 드립니다.')}</div>
                </div>
                <div style={{ display: 'grid', gap: 7, marginTop: 6 }}>
                  {starters(lang).map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{ textAlign: 'left', padding: '10px 13px', borderRadius: 11, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12.5, color: '#334155', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#f5f3ff'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
                      💡 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                {m.role === 'assistant' && <div style={{ marginTop: 2 }}><GenieMark size={26} /></div>}
                <div style={{ maxWidth: '82%', padding: '9px 13px', borderRadius: 13, fontSize: 13, lineHeight: 1.65,
                  background: m.role === 'user' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  border: m.role === 'user' ? 'none' : '1px solid #e9eef5',
                  borderTopRightRadius: m.role === 'user' ? 3 : 13, borderTopLeftRadius: m.role === 'user' ? 13 : 3 }}>
                  {m.role === 'assistant' ? <span dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} /> : m.content}
                  {/* [289차 후속 / MEA 055 D-3] 근거(Citation) — 서버가 실제 참조한 기능 블록.
                      진입 경로는 클릭 시 해당 화면으로 이동해 답변을 바로 확인할 수 있다. */}
                  {m.role === 'assistant' && Array.isArray(m.sources) && m.sources.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 700 }}>{t('assistant.sources', 'Sources')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {m.sources.map((s, si) => {
                          const to = Array.isArray(s.paths) && s.paths.length ? s.paths[0] : null;
                          const label = s.title || s.ns;
                          return to
                            ? <a key={si} href={to} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#eef2ff',
                                color: '#4f46e5', border: '1px solid #c7d2fe', textDecoration: 'none', fontWeight: 600 }}>{label} <span style={{ opacity: .7 }}>{to}</span></a>
                            : <span key={si} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9',
                                color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 }}>{label}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <GenieMark size={26} />
                <div style={{ padding: '11px 14px', borderRadius: 13, background: '#fff', border: '1px solid #e9eef5', display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', animation: `genieBlink 1.2s ${d * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* 입력 */}
          <div style={{ padding: 12, borderTop: '1px solid #eef2f7', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1} placeholder={ph}
                style={{ flex: 1, resize: 'none', maxHeight: 120, padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
              <button onClick={() => send()} disabled={busy || !input.trim()}
                style={{ width: 42, height: 42, borderRadius: 12, border: 'none', cursor: busy || !input.trim() ? 'default' : 'pointer', background: busy || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 17, flexShrink: 0 }}>➤</button>
            </div>
            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 6, textAlign: 'center' }}>{t('assistant.disclaimer', 'GeniegoROI 사용 안내 도우미 · Enter 전송 · Shift+Enter 줄바꿈')}</div>
          </div>
          <style>{`@keyframes genieBlink{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
        </div>
      )}
    </>
  );
}
