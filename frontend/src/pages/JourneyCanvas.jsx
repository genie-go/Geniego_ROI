/**
 * JourneyCanvas — [현 차수] 비주얼 여정 플로우 빌더 (의존성 없는 커스텀 캔버스).
 *  노드(트리거/이메일/SMS/카카오/대기/조건분기/A·B스플릿/목표) 팔레트 + 드래그 배치 + 엣지 연결 +
 *  노드별 설정 패널. 실제 nodes/edges 그래프를 백엔드(JourneyBuilder.php 실행엔진)로 저장.
 *  백엔드가 이 그래프를 상태머신으로 실행(email/sms/kakao 실발송·delay·조건·split·goal).
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n';

const NODE_TYPES = {
  trigger:   { labelKey: 'journeyCanvas.node.trigger', label: '트리거',     icon: '⚡', color: '#6366f1', terminalIn: true },
  email:     { labelKey: 'journeyCanvas.node.email', label: '이메일',     icon: '📧', color: '#4f8ef7' },
  kakao:     { labelKey: 'journeyCanvas.node.kakao', label: '카카오',     icon: '💬', color: '#f59e0b' },
  sms:       { labelKey: 'journeyCanvas.node.sms', label: 'SMS',        icon: '📱', color: '#22c55e' },
  delay:     { labelKey: 'journeyCanvas.node.delay', label: '대기',       icon: '⏱️', color: '#94a3b8' },
  wait:      { labelKey: 'journeyCanvas.node.wait', label: '이벤트/날짜 대기', icon: '⏳', color: '#0ea5e9', branches: ['occurred', 'timeout'] }, // [255차 심화] 이벤트 발생/날짜까지 대기
  condition: { labelKey: 'journeyCanvas.node.condition', label: '조건 분기',  icon: '🔀', color: '#a855f7', branches: ['true', 'false'] },
  exit:      { labelKey: 'journeyCanvas.node.exit', label: '이탈(조건종료)', icon: '🚪', color: '#64748b' }, // [현 차수 초고도화 ②] 조건 충족 시 여정 즉시 종료(Braze exit criteria)
  split:     { labelKey: 'journeyCanvas.node.split', label: 'A/B 스플릿', icon: '🧪', color: '#06b6d4', branches: ['a', 'b'] },
  webhook:   { labelKey: 'journeyCanvas.node.webhook', label: '웹훅(외부호출)', icon: '🔗', color: '#0891b2' }, // [255차 심화] 외부 HTTP 액션
  nba:       { labelKey: 'journeyCanvas.node.nba', label: 'AI 최적채널(NBA)', icon: '🧠', color: '#8b5cf6' }, // [현 차수 초고도화 ②] Thompson 밴딧 = 고객별 최적 채널 자동선택 발송
  decision:  { labelKey: 'journeyCanvas.node.decision', label: 'AI 1:1 결정(개인화)', icon: '🎲', color: '#7c3aed' }, // [263차 Track A] 콘텐츠×채널 변형을 고객 컨텍스트(등급×최근성×빈도)별 contextual bandit 로 1:1 선택+전환학습(OfferFit式)
  attr:      { labelKey: 'journeyCanvas.node.attr', label: '속성 업데이트(태그)', icon: '🏷️', color: '#0d9488' }, // [현 차수 초고도화 ⑥] 여정 중 고객 태그 갱신(Braze Update Attribute)
  goal:      { labelKey: 'journeyCanvas.node.goal', label: '목표(전환)', icon: '🎯', color: '#ef4444' },
};
const NODE_W = 150, NODE_H = 56;
const uid = (() => { let n = 0; return (p) => `${p}_${Date.now().toString(36)}${(n++).toString(36)}`; })();

export default function JourneyCanvas({ nodes: initNodes, edges: initEdges, onSave, saving }) {
  const { t } = useI18n();
  const [nodes, setNodes] = useState(() => (Array.isArray(initNodes) && initNodes.length ? initNodes : [
    { id: 'trigger_1', type: 'trigger', label: '트리거', config: { type: 'signup' }, x: 60, y: 60 },
  ]));
  const [edges, setEdges] = useState(() => (Array.isArray(initEdges) ? initEdges : []));
  const [sel, setSel] = useState(null);           // 선택 노드 id
  const [connectFrom, setConnectFrom] = useState(null); // 연결 시작 노드 id
  const canvasRef = useRef(null);
  const drag = useRef(null);

  const selNode = useMemo(() => nodes.find(n => n.id === sel) || null, [nodes, sel]);

  const addNode = (type) => {
    const nt = NODE_TYPES[type];
    const n = { id: uid(type), type, label: nt.label, config: defaultConfig(type), x: 80 + (nodes.length % 4) * 175, y: 150 + Math.floor(nodes.length / 4) * 110 };
    setNodes(p => [...p, n]); setSel(n.id);
  };
  const updateNode = (id, patch) => setNodes(p => p.map(n => n.id === id ? { ...n, ...patch } : n));
  const updateConfig = (id, k, v) => setNodes(p => p.map(n => n.id === id ? { ...n, config: { ...(n.config || {}), [k]: v } } : n));
  const removeNode = (id) => { setNodes(p => p.filter(n => n.id !== id)); setEdges(p => p.filter(e => e.from !== id && e.to !== id)); if (sel === id) setSel(null); };
  const removeEdge = (from, to, when) => setEdges(p => p.filter(e => !(e.from === from && e.to === to && (e.when || '') === (when || ''))));

  // 드래그 이동
  const onNodeMouseDown = (e, id) => {
    if (connectFrom) return; // 연결 모드 중엔 드래그 비활성
    e.stopPropagation();
    const n = nodes.find(x => x.id === id);
    const rect = canvasRef.current.getBoundingClientRect();
    drag.current = { id, offX: e.clientX - rect.left - n.x, offY: e.clientY - rect.top - n.y };
  };
  const onMouseMove = useCallback((e) => {
    if (!drag.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.current.offX);
    const y = Math.max(0, e.clientY - rect.top - drag.current.offY);
    updateNode(drag.current.id, { x: Math.round(x), y: Math.round(y) });
  }, []);
  const onMouseUp = useCallback(() => { drag.current = null; }, []);

  // 노드 클릭: 연결 모드면 엣지 생성, 아니면 선택
  const onNodeClick = (e, id) => {
    e.stopPropagation();
    if (connectFrom && connectFrom !== id) {
      const src = nodes.find(n => n.id === connectFrom);
      const branches = NODE_TYPES[src?.type]?.branches;
      let when = null;
      if (branches) {
        const existing = edges.filter(eg => eg.from === connectFrom).length;
        when = branches[existing] || branches[0];
      }
      setEdges(p => [...p.filter(eg => !(eg.from === connectFrom && eg.to === id)), { from: connectFrom, to: id, ...(when ? { when } : {}) }]);
      setConnectFrom(null);
    } else if (connectFrom === id) { setConnectFrom(null); }
    else { setSel(id); }
  };

  const center = (n) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });
  const canvasH = Math.max(440, ...nodes.map(n => n.y + 140));

  return (
    <div>
      {/* 팔레트 + 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginRight: 4 }}>{t('journeyCanvas.addNode', '노드 추가:')}</span>
        {Object.entries(NODE_TYPES).filter(([k]) => k !== 'trigger').map(([k, nt]) => (
          <button key={k} onClick={() => addNode(k)} style={paletteBtn(nt.color)}>{nt.icon} {t(nt.labelKey, nt.label)}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setConnectFrom(connectFrom ? null : (sel || nodes[0]?.id))} disabled={!sel && !connectFrom}
          style={{ ...actBtn, background: connectFrom ? '#f59e0b' : 'rgba(99,102,241,0.12)', color: connectFrom ? '#fff' : '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}>
          {connectFrom ? t('journeyCanvas.connectTargetHint', '🔗 대상 노드 클릭…(취소: 다시)') : t('journeyCanvas.connectStart', '🔗 연결 시작(노드 선택 후)')}
        </button>
        <button onClick={() => onSave({ nodes, edges })} disabled={saving} style={{ ...actBtn, background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', border: 'none', fontWeight: 800 }}>
          {saving ? t('journeyCanvas.saving', '저장 중…') : t('journeyCanvas.saveJourney', '💾 여정 저장')}
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        {t('journeyCanvas.help', '노드 드래그=이동 · 클릭=설정 · "연결 시작" 후 대상 노드 클릭=화살표 연결(조건/스플릿은 분기 자동 라벨). 트리거→액션→대기/조건→목표 순으로 구성.')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selNode ? '1fr 300px' : '1fr', gap: 12 }}>
        {/* 캔버스 */}
        <div ref={canvasRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={() => { setSel(null); }}
          style={{ position: 'relative', minHeight: canvasH, background: 'repeating-linear-gradient(0deg,rgba(148,163,184,0.06) 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,rgba(148,163,184,0.06) 0 1px,transparent 1px 22px)', border: '1px solid rgba(99,140,255,0.18)', borderRadius: 12, overflow: 'hidden' }}>
          {/* 엣지 SVG */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: canvasH, pointerEvents: 'none' }}>
            <defs><marker id="jc-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#64748b" /></marker></defs>
            {edges.map((e, i) => {
              const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to);
              if (!a || !b) return null;
              const p1 = { x: center(a).x, y: a.y + NODE_H }, p2 = { x: center(b).x, y: b.y };
              const midY = (p1.y + p2.y) / 2;
              const col = e.when === 'false' || e.when === 'b' ? '#ef4444' : (e.when === 'true' || e.when === 'a' ? '#22c55e' : '#64748b');
              return (
                <g key={i}>
                  <path d={`M${p1.x},${p1.y} C${p1.x},${midY} ${p2.x},${midY} ${p2.x},${p2.y}`} stroke={col} strokeWidth="2" fill="none" markerEnd="url(#jc-arrow)" />
                  {e.when && <text x={(p1.x + p2.x) / 2} y={midY} fill={col} fontSize="10" fontWeight="800" textAnchor="middle" style={{ pointerEvents: 'all', cursor: 'pointer' }}>{e.when === 'true' ? 'YES' : e.when === 'false' ? 'NO' : e.when.toUpperCase()}</text>}
                </g>
              );
            })}
          </svg>
          {/* 노드 */}
          {nodes.map(n => {
            const nt = NODE_TYPES[n.type] || NODE_TYPES.trigger;
            const isSel = n.id === sel, isConn = connectFrom === n.id;
            return (
              <div key={n.id} onMouseDown={(e) => onNodeMouseDown(e, n.id)} onClick={(e) => onNodeClick(e, n.id)}
                style={{ position: 'absolute', left: n.x, top: n.y, width: NODE_W, minHeight: NODE_H, padding: '8px 10px', borderRadius: 10, cursor: connectFrom ? 'crosshair' : 'grab',
                  background: '#fff', border: `2px solid ${isConn ? '#f59e0b' : (isSel ? nt.color : 'rgba(0,0,0,0.12)')}`,
                  boxShadow: isSel ? `0 0 0 3px ${nt.color}33` : '0 2px 6px rgba(0,0,0,0.08)', userSelect: 'none', zIndex: isSel ? 5 : 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: nt.color }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: nt.color }}>{nt.icon} {t(nt.labelKey, nt.label)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginTop: 3, lineHeight: 1.25, wordBreak: 'break-all' }}>{nodeSummary(n, t)}</div>
              </div>
            );
          })}
        </div>

        {/* 설정 패널 */}
        {selNode && (
          <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 16, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: (NODE_TYPES[selNode.type] || {}).color }}>{(NODE_TYPES[selNode.type] || {}).icon} {t((NODE_TYPES[selNode.type] || {}).labelKey, (NODE_TYPES[selNode.type] || {}).label)} {t('journeyCanvas.settings', '설정')}</div>
              {selNode.type !== 'trigger' && <button onClick={() => removeNode(selNode.id)} style={{ ...delBtn }}>{t('journeyCanvas.delete', '삭제')}</button>}
            </div>
            <Lbl t={t('journeyCanvas.name', '이름')}><input value={selNode.label || ''} onChange={e => updateNode(selNode.id, { label: e.target.value })} style={inp} /></Lbl>
            {selNode.type === 'trigger' && (
              <Lbl t={t('journeyCanvas.triggerType', '트리거 유형')}><select value={selNode.config?.type || 'signup'} onChange={e => updateConfig(selNode.id, 'type', e.target.value)} style={inp}>
                {[['signup', t('journeyCanvas.trigger.signup', '회원가입')], ['purchase', t('journeyCanvas.trigger.purchase', '구매 완료')], ['abandon', t('journeyCanvas.trigger.abandon', '장바구니 이탈')], ['churn', t('journeyCanvas.trigger.churn', '이탈 위험')], ['segment', t('journeyCanvas.trigger.segment', '세그먼트 진입')], ['webhook', t('journeyCanvas.trigger.webhook', '웹훅(외부 API 진입)')], ['manual', t('journeyCanvas.trigger.manual', '수동')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></Lbl>
            )}
            {selNode.type === 'email' && (<>
              <Lbl t={t('journeyCanvas.subject', '제목')}><input value={selNode.config?.subject || ''} onChange={e => updateConfig(selNode.id, 'subject', e.target.value)} style={inp} /></Lbl>
              <Lbl t={t('journeyCanvas.bodyHtml', '본문(HTML 가능)')}><textarea value={selNode.config?.html || ''} onChange={e => updateConfig(selNode.id, 'html', e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} /></Lbl>
            </>)}
            {(selNode.type === 'sms') && (<Lbl t={t('journeyCanvas.message', '메시지')}><textarea value={selNode.config?.content || ''} onChange={e => updateConfig(selNode.id, 'content', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></Lbl>)}
            {selNode.type === 'kakao' && (<>
              <Lbl t={t('journeyCanvas.alimtalkTemplateCode', '알림톡 템플릿 코드')}><input value={selNode.config?.template_code || ''} onChange={e => updateConfig(selNode.id, 'template_code', e.target.value)} style={inp} /></Lbl>
              <Lbl t={t('journeyCanvas.content', '내용')}><textarea value={selNode.config?.content || ''} onChange={e => updateConfig(selNode.id, 'content', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></Lbl>
            </>)}
            {selNode.type === 'delay' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Lbl t={t('journeyCanvas.value', '값')}><input type="number" min="1" value={selNode.config?.value ?? 1} onChange={e => updateConfig(selNode.id, 'value', Number(e.target.value))} style={inp} /></Lbl>
                <Lbl t={t('journeyCanvas.unit', '단위')}><select value={selNode.config?.unit || 'days'} onChange={e => updateConfig(selNode.id, 'unit', e.target.value)} style={inp}>{[['minutes', t('journeyCanvas.unit.minutes', '분')], ['hours', t('journeyCanvas.unit.hours', '시간')], ['days', t('journeyCanvas.unit.days', '일')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
              </div>
            )}
            {selNode.type === 'condition' && (<>
              <Lbl t={t('journeyCanvas.field', '필드')}><select value={selNode.config?.field || 'grade'} onChange={e => updateConfig(selNode.id, 'field', e.target.value)} style={inp}>{[['grade', t('journeyCanvas.field.grade', '고객 등급')], ['ltv', t('journeyCanvas.field.ltv', '생애가치(LTV)')], ['revenue', t('journeyCanvas.field.revenue', '여정 매출')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
              <div style={{ display: 'flex', gap: 8 }}>
                <Lbl t={t('journeyCanvas.operator', '연산')}><select value={selNode.config?.op || 'gte'} onChange={e => updateConfig(selNode.id, 'op', e.target.value)} style={inp}>{[['eq', '='], ['neq', '≠'], ['gt', '>'], ['gte', '≥'], ['lt', '<'], ['lte', '≤']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
                <Lbl t={t('journeyCanvas.value', '값')}><input value={selNode.config?.value ?? ''} onChange={e => updateConfig(selNode.id, 'value', e.target.value)} style={inp} /></Lbl>
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{t('journeyCanvas.conditionHint', 'YES(녹색)·NO(빨강) 분기로 두 노드를 연결하세요.')}</div>
            </>)}
            {selNode.type === 'split' && (<>
              <Lbl t={t('journeyCanvas.groupAWeight', 'A 그룹 비율(%)')}><input type="number" min="0" max="100" value={selNode.config?.weight_a ?? 50} onChange={e => updateConfig(selNode.id, 'weight_a', Number(e.target.value))} style={inp} /></Lbl>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{t('journeyCanvas.splitHint1', 'A·B 두 분기로 연결(나머지')} {100 - (selNode.config?.weight_a ?? 50)}{t('journeyCanvas.splitHint2', '%는 B). 성과 비교 후 승자 결정.')}</div>
            </>)}
            {selNode.type === 'wait' && (<>
              <Lbl t={t('journeyCanvas.waitType', '대기 유형')}><select value={selNode.config?.mode || 'date'} onChange={e => updateConfig(selNode.id, 'mode', e.target.value)} style={inp}>{[['date', t('journeyCanvas.wait.untilDate', '날짜까지 대기')], ['event', t('journeyCanvas.wait.untilEvent', '이벤트 발생까지 대기')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
              {(selNode.config?.mode || 'date') === 'date'
                ? <Lbl t={t('journeyCanvas.waitEndDatetime', '대기 종료 일시(YYYY-MM-DD HH:MM)')}><input value={selNode.config?.until || ''} onChange={e => updateConfig(selNode.id, 'until', e.target.value)} placeholder="2026-07-01 09:00" style={inp} /></Lbl>
                : (<>
                    <Lbl t={t('journeyCanvas.waitEvent', '대기 이벤트')}><select value={selNode.config?.event || 'purchase'} onChange={e => updateConfig(selNode.id, 'event', e.target.value)} style={inp}>{[['purchase', t('journeyCanvas.event.purchase', '구매')], ['email_open', t('journeyCanvas.event.emailOpen', '이메일 열람')], ['email_click', t('journeyCanvas.event.emailClick', '이메일 클릭')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Lbl t={t('journeyCanvas.timeoutValue', '타임아웃 값')}><input type="number" min="1" value={selNode.config?.timeout_value ?? 7} onChange={e => updateConfig(selNode.id, 'timeout_value', Number(e.target.value))} style={inp} /></Lbl>
                      <Lbl t={t('journeyCanvas.unit', '단위')}><select value={selNode.config?.timeout_unit || 'days'} onChange={e => updateConfig(selNode.id, 'timeout_unit', e.target.value)} style={inp}>{[['hours', t('journeyCanvas.unit.hours', '시간')], ['days', t('journeyCanvas.unit.days', '일')]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Lbl>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{t('journeyCanvas.waitHint', 'occurred(이벤트 발생)·timeout(미발생) 두 분기로 연결하세요.')}</div>
                  </>)}
            </>)}
            {selNode.type === 'webhook' && (<>
              <Lbl t={t('journeyCanvas.callUrl', '호출 URL(https)')}><input value={selNode.config?.url || ''} onChange={e => updateConfig(selNode.id, 'url', e.target.value)} placeholder="https://api.example.com/hook" style={inp} /></Lbl>
              <Lbl t={t('journeyCanvas.method', '메서드')}><select value={selNode.config?.method || 'POST'} onChange={e => updateConfig(selNode.id, 'method', e.target.value)} style={inp}>{['POST', 'GET'].map(v => <option key={v} value={v}>{v}</option>)}</select></Lbl>
              <Lbl t={t('journeyCanvas.bodyJson', '본문(JSON · {{name}}/{{email}}/{{phone}}/{{revenue}} 치환)')}><textarea value={selNode.config?.body || ''} onChange={e => updateConfig(selNode.id, 'body', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></Lbl>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{t('journeyCanvas.webhookHint', '고객 컨텍스트를 외부 시스템(슬랙·CRM·웨어하우스)으로 전송합니다. 미입력 시 전체 컨텍스트 JSON 전송.')}</div>
            </>)}
            {selNode.type === 'goal' && (<div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{t('journeyCanvas.goalDesc', '전환 목표 노드. 고객이 이 노드에 도달하면 여정 전환으로 집계됩니다(분석 탭 전환율).')}</div>)}
            {selNode.type === 'decision' && (() => {
              const variants = Array.isArray(selNode.config?.variants) ? selNode.config.variants : [];
              const setV = (vs) => updateConfig(selNode.id, 'variants', vs);
              const upd = (i, k, v) => setV(variants.map((x, j) => j === i ? { ...x, [k]: v } : x));
              return (<>
                <div style={{ fontSize: 10.5, color: '#7c3aed', marginBottom: 6, lineHeight: 1.5 }}>{t('journeyCanvas.decisionHint1', '🎲 고객 컨텍스트(등급×최근성×빈도)별 최적 변형을')} <b>{t('journeyCanvas.decisionHintBold', '1:1 개인화 선택')}</b>{t('journeyCanvas.decisionHint2', '하고 전환으로 학습합니다(OfferFit式 contextual bandit). 변형 2개 이상 권장 · 데이터 적으면 탐색 우선.')}</div>
                {variants.map((v, i) => (
                  <div key={i} style={{ border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, padding: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <input value={v.id || ''} onChange={e => upd(i, 'id', e.target.value)} placeholder={t('journeyCanvas.variantIdPlaceholder', '변형ID') + `(v${i + 1})`} style={{ ...inp, width: 92 }} />
                      <select value={v.channel || 'email'} onChange={e => upd(i, 'channel', e.target.value)} style={{ ...inp, width: 92 }}>{[['email', t('journeyCanvas.channel.email', '이메일')], ['kakao', t('journeyCanvas.channel.kakao', '카카오')], ['sms', 'SMS']].map(([vv, l]) => <option key={vv} value={vv}>{l}</option>)}</select>
                      <button onClick={() => setV(variants.filter((_, j) => j !== i))} style={{ ...delBtn, padding: '1px 6px' }}>×</button>
                    </div>
                    {v.channel === 'email' && <input value={v.subject || ''} onChange={e => upd(i, 'subject', e.target.value)} placeholder={t('journeyCanvas.subject', '제목')} style={{ ...inp, marginBottom: 4 }} />}
                    {v.channel === 'kakao' && <input value={v.template_code || ''} onChange={e => upd(i, 'template_code', e.target.value)} placeholder={t('journeyCanvas.alimtalkTemplateCode', '알림톡 템플릿 코드')} style={{ ...inp, marginBottom: 4 }} />}
                    <textarea value={(v.channel === 'email' ? v.html : v.content) || ''} onChange={e => upd(i, v.channel === 'email' ? 'html' : 'content', e.target.value)} rows={2} placeholder={v.channel === 'email' ? t('journeyCanvas.bodyHtml', '본문(HTML 가능)') : t('journeyCanvas.message', '메시지')} style={{ ...inp, resize: 'vertical' }} />
                  </div>
                ))}
                <button onClick={() => setV([...variants, { id: `v${variants.length + 1}`, channel: 'email', subject: '', html: '' }])} style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>{t('journeyCanvas.addVariant', '+ 변형 추가')}</button>
              </>);
            })()}
            {/* 연결 목록 */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('journeyCanvas.nextConnections', '다음 연결')}</div>
              {edges.filter(e => e.from === selNode.id).map((e, i) => {
                const to = nodes.find(n => n.id === e.to);
                return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>→ {nodeSummary(to, t) || e.to}{e.when ? ` [${e.when.toUpperCase()}]` : ''}</span>
                  <button onClick={() => removeEdge(e.from, e.to, e.when)} style={{ ...delBtn, padding: '1px 6px' }}>×</button>
                </div>;
              })}
              {edges.filter(e => e.from === selNode.id).length === 0 && <div style={{ fontSize: 10.5, color: '#cbd5e1' }}>{t('journeyCanvas.noConnections', '연결 없음 — "연결 시작" 후 대상 클릭')}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function defaultConfig(type) {
  switch (type) {
    case 'trigger': return { type: 'signup' };
    case 'email': return { subject: '', html: '' };
    case 'sms': return { content: '' };
    case 'kakao': return { template_code: '', content: '' };
    case 'delay': return { value: 1, unit: 'days' };
    case 'condition': return { field: 'grade', op: 'eq', value: 'vip' };
    case 'split': return { weight_a: 50 };
    case 'goal': return { label: '전환' };
    default: return {};
  }
}
function nodeSummary(n, t) {
  if (!n) return '';
  const tr = typeof t === 'function' ? t : (_k, f) => f;
  const c = n.config || {};
  switch (n.type) {
    case 'trigger': return ({ signup: tr('journeyCanvas.trigger.signup', '회원가입'), purchase: tr('journeyCanvas.trigger.purchase', '구매 완료'), abandon: tr('journeyCanvas.trigger.abandon', '장바구니 이탈'), churn: tr('journeyCanvas.trigger.churn', '이탈 위험'), segment: tr('journeyCanvas.summary.segment', '세그먼트'), manual: tr('journeyCanvas.trigger.manual', '수동') }[c.type] || c.type || tr('journeyCanvas.node.trigger', '트리거'));
    case 'email': return c.subject || n.label || tr('journeyCanvas.node.email', '이메일');
    case 'sms': return (c.content || n.label || 'SMS').slice(0, 24);
    case 'kakao': return c.template_code || c.content || n.label || tr('journeyCanvas.node.kakao', '카카오');
    case 'delay': return `${c.value ?? 1}${({ minutes: tr('journeyCanvas.unit.minutes', '분'), hours: tr('journeyCanvas.unit.hours', '시간'), days: tr('journeyCanvas.unit.days', '일') }[c.unit] || tr('journeyCanvas.unit.days', '일'))} ${tr('journeyCanvas.node.delay', '대기')}`;
    case 'condition': return `${({ grade: tr('journeyCanvas.summary.grade', '등급'), ltv: 'LTV', revenue: tr('journeyCanvas.summary.revenue', '매출') }[c.field] || c.field)} ${c.op || ''} ${c.value ?? ''}`;
    case 'split': return `A ${c.weight_a ?? 50}% / B ${100 - (c.weight_a ?? 50)}%`;
    case 'goal': return n.label || tr('journeyCanvas.conversionGoal', '전환 목표');
    default: return n.label || n.type;
  }
}
const Lbl = ({ t, children }) => (<label style={{ display: 'block', marginBottom: 8 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{t}</div>{children}</label>);
const inp = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#1e293b', fontSize: 12 };
const paletteBtn = (c) => ({ padding: '6px 10px', borderRadius: 7, border: `1px solid ${c}55`, background: `${c}14`, color: c, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' });
const actBtn = { padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };
const delBtn = { padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' };
