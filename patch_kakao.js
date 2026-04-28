const fs = require('fs');

const koKeys = {
    title: "카카오 비즈니스",
    subTitle: "알림톡 템플릿 · 세그먼트 타겟 발송 · CRM 자동 동기화",
    tabCamp: "💬 캠페인",
    tabTpl: "📝 알림톡 템플릿",
    tabSet: "⚙️ 채널 설정",
    setTit: "💬 카카오 비즈니스 채널 설정",
    setDesc: "카카오 알림톡을 사용하려면 카카오 비즈니스에서 채널을 개설하고 발신키를 발급받으세요.",
    setMode: "발송 모드",
    btnMock: "🧪 테스트 (목)",
    btnLive: "📡 실제 발송",
    warnLive: "⚠️ 실제 발송 모드 — 카카오 API를 통해 실제 알림톡이 발송됩니다. 발신키가 필요합니다.",
    warnMock: "💡 테스트 모드 — 실제 발송 없이 시뮬레이션만 진행합니다. API 키 없이도 UI 테스트 가능합니다.",
    fName: "채널명",
    pName: "예: 우리매장 공식채널",
    fId: "채널 ID",
    pId: "@handle",
    fSender: "발신키 (발신 프로필 키)",
    pSender: "40자리 발신키",
    fApi: "REST API 키",
    pApi: "비즈니스 REST API Key",
    msgSaveDone: "✅ 설정이 저장되었습니다",
    msgSaveFail: "❌ 저장 실패: ",
    btnSave: "⚙️ 설정 저장",
    btnSaving: "저장 중...",
    tplRegTit: "📝 알림톡 템플릿 등록",
    fTplCode: "템플릿 코드* (카카오 승인 코드)",
    pTplCode: "예: ORDER_COMPLETE",
    fTplName: "템플릿명*",
    pTplName: "주문 완료 안내",
    fMsgType: "메시지 타입",
    optAt: "알림톡 (AT)",
    optFt: "친구톡 (FT)",
    fContent: "내용* (변수: #{name} 또는 {{name}})",
    pContent: "안녕하세요 {{name}}님,\n주문이 정상적으로 접수되었습니다.\n\n주문번호: #{order_no}",
    msgTplReq: "❌ 템플릿 코드, 이름, 내용 필수",
    btnTplSave: "템플릿 저장",
    testTit: "🧪 테스트 발송 번호",
    pPhone: "010-0000-0000",
    pCustName: "고객명",
    msgTestPhone: "전화번호를 입력하세요",
    msgTestDone: "발송 완료",
    lblContent: "내용:",
    testBtn: "테스트",
    testBtnIng: "...",
    testBtnDel: "삭제",
    btnDelConfirm: "삭제하시겠습니까?",
    lblCode: "코드:",
    lblType: "타입:",
    emptyTpl: "등록된 템플릿 없음",
    campNew: "💬 새 알림톡 캠페인",
    fCampName: "캠페인명*",
    fCampTpl: "알림톡 템플릿",
    optSel: "-- 선택 --",
    fTarget: "대상 세그먼트",
    optAll: "모든 고객 (전화번호 보유)",
    unitCust: "명",
    msgCampDone: "✅ 캠페인 생성 완료",
    btnCampCreate: "캠페인 생성",
    msgSendConfirm: "알림톡을 발송하시겠습니까?",
    msgSendSucc: "발송 완료 (성공:",
    msgSendMock: "[테스트] ",
    msgSendFail2: "실패: ",
    msgSendFailT: "❌ 발송 실패",
    campStat: "📊 캠페인 현황",
    colName: "이름",
    colTpl: "템플릿",
    colTarget: "세그먼트",
    colSendCnt: "발송수",
    colSucc: "성공",
    colFail: "실패",
    colStat: "상태",
    colAction: "액션",
    valAll: "전체",
    btnSend: "💬 발송",
    btnSending: "발송 중...",
    emptyCamp: "캠페인 없음",
    errGeneral: "오류가 발생했습니다"
};

const enKeys = {
    title: "Kakao Business",
    subTitle: "Notification Template · Segment Targeting · CRM Sync",
    tabCamp: "💬 Campaigns",
    tabTpl: "📝 Notification Templates",
    tabSet: "⚙️ Channel Settings",
    setTit: "💬 Kakao Business Channel Settings",
    setDesc: "To use Kakao Notifications, create a channel in Kakao Business and issue a sender key.",
    setMode: "Send Mode",
    btnMock: "🧪 Mock (Test)",
    btnLive: "📡 Live Send",
    warnLive: "⚠️ Live Mode — Actual notifications will be sent via Kakao API. Sender key required.",
    warnMock: "💡 Test Mode — Operates in simulation. UI testing works without API keys.",
    fName: "Channel Name",
    pName: "E.g., Official Store",
    fId: "Channel ID",
    pId: "@handle",
    fSender: "Sender Key",
    pSender: "40-digit sender key",
    fApi: "REST API Key",
    pApi: "Business REST API Key",
    msgSaveDone: "✅ Settings Saved",
    msgSaveFail: "❌ Save Failed: ",
    btnSave: "⚙️ Save Settings",
    btnSaving: "Saving...",
    tplRegTit: "📝 Register Notification Template",
    fTplCode: "Template Code*",
    pTplCode: "E.g., ORDER_DONE",
    fTplName: "Template Name*",
    pTplName: "Order Complete Info",
    fMsgType: "Message Type",
    optAt: "Notification (AT)",
    optFt: "Friendtalk (FT)",
    fContent: "Content* (Variables: #{name} or {{name}})",
    pContent: "Hello {{name}},\nYour order is confirmed.\n\nOrder No: #{order_no}",
    msgTplReq: "❌ Code, Name, Content are required",
    btnTplSave: "Save Template",
    testTit: "🧪 Test Target Number",
    pPhone: "010-0000-0000",
    pCustName: "Customer Name",
    msgTestPhone: "Please enter a phone number",
    msgTestDone: "Send successful",
    lblContent: "Content:",
    testBtn: "Test",
    testBtnIng: "...",
    testBtnDel: "Delete",
    btnDelConfirm: "Are you sure to delete?",
    lblCode: "Code:",
    lblType: "Type:",
    emptyTpl: "No templates registered",
    campNew: "💬 New Kakao Campaign",
    fCampName: "Campaign Name*",
    fCampTpl: "Template",
    optSel: "-- Select --",
    fTarget: "Target Segment",
    optAll: "All Customers (With Phone)",
    unitCust: " users",
    msgCampDone: "✅ Campaign Created",
    btnCampCreate: "Create Campaign",
    msgSendConfirm: "Send these notifications?",
    msgSendSucc: "Send done (Success:",
    msgSendMock: "[Mock] ",
    msgSendFail2: "Failed: ",
    msgSendFailT: "❌ Send Failed",
    campStat: "📊 Campaign Status",
    colName: "Name",
    colTpl: "Template",
    colTarget: "Segment",
    colSendCnt: "Sent",
    colSucc: "Success",
    colFail: "Failed",
    colStat: "Status",
    colAction: "Action",
    valAll: "All",
    btnSend: "💬 Send",
    btnSending: "Sending...",
    emptyCamp: "No Campaigns",
    errGeneral: "An error occurred"
};

const jaKeys = {
    title: "カカオビジネス",
    subTitle: "通知テンプレート・セグメント配信・CRM自動同期",
    tabCamp: "💬 キャンペーン",
    tabTpl: "📝 通知テンプレート",
    tabSet: "⚙️ チャネル設定",
    setTit: "💬 カカオチャネル設定",
    setDesc: "通知機能を利用するには、カカオビジネスでチャネルを開設し、送信キーを発行してください。",
    setMode: "送信モード",
    btnMock: "🧪 テスト (モック)",
    btnLive: "📡 ライブ送信",
    warnLive: "⚠️ ライブモード — カカオAPI経由で実際に送信されます。送信キーが必要です。",
    warnMock: "💡 テストモード — 実際の送信は行われません。キーなしでUIをテストできます。",
    fName: "チャネル名",
    pName: "例: 公式ストア",
    fId: "チャネル ID",
    pId: "@handle",
    fSender: "送信キー",
    pSender: "40桁の送信キー",
    fApi: "REST API キー",
    pApi: "Business REST API Key",
    msgSaveDone: "✅ 設定を保存しました",
    msgSaveFail: "❌ 保存に失敗: ",
    btnSave: "⚙️ 設定を保存",
    btnSaving: "保存中...",
    tplRegTit: "📝 通知テンプレート登録",
    fTplCode: "テンプレートコード*",
    pTplCode: "例: ORDER_DONE",
    fTplName: "テンプレート名*",
    pTplName: "注文完了案内",
    fMsgType: "メッセージタイプ",
    optAt: "通知トーク (AT)",
    optFt: "フレンドトーク (FT)",
    fContent: "内容* (変数: #{name} または {{name}})",
    pContent: "{{name}}様、\n注文が正常に受付されました。\n\n注文番号: #{order_no}",
    msgTplReq: "❌ テンプレートコード、名前、内容は必須です",
    btnTplSave: "テンプレートを保存",
    testTit: "🧪 テスト送信先",
    pPhone: "010-0000-0000",
    pCustName: "顧客名",
    msgTestPhone: "電話番号を入力してください",
    msgTestDone: "送信完了",
    lblContent: "内容:",
    testBtn: "テスト",
    testBtnIng: "...",
    testBtnDel: "削除",
    btnDelConfirm: "削除しますか？",
    lblCode: "コード:",
    lblType: "タイプ:",
    emptyTpl: "登録されたテンプレートなし",
    campNew: "💬 新規キャンペーン",
    fCampName: "キャンペーン名*",
    fCampTpl: "テンプレート",
    optSel: "-- 選択 --",
    fTarget: "ターゲットセグメント",
    optAll: "全顧客 (電話番号あり)",
    unitCust: "人",
    msgCampDone: "✅ キャンペーン作成完了",
    btnCampCreate: "キャンペーンを作成",
    msgSendConfirm: "通知を送信しますか？",
    msgSendSucc: "送信完了 (成功:",
    msgSendMock: "[モック] ",
    msgSendFail2: "失敗: ",
    msgSendFailT: "❌ 送信失敗",
    campStat: "📊 キャンペーン状況",
    colName: "名前",
    colTpl: "テンプレート",
    colTarget: "セグメント",
    colSendCnt: "送信数",
    colSucc: "成功",
    colFail: "失敗",
    colStat: "状態",
    colAction: "アクション",
    valAll: "全体",
    btnSend: "💬 送信",
    btnSending: "送信中...",
    emptyCamp: "キャンペーンはありません",
    errGeneral: "エラーが発生しました"
};

function injectLocales(filePath, dictObj, keyNs) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Inject if the namespace doesn't exist
    if (!content.includes(`${keyNs}: {`)) {
        content = content.replace(/export default\s+\{/, `export default {\n    ${keyNs}: ${JSON.stringify(dictObj, null, 8).replace(/\}$/, '    }')},`);
    } else {
        // If it exists, simple regex to merge keys
        const match = content.match(new RegExp(`(${keyNs}: \\s*\\{)([\\s\\S]*?)\\}(,|\\n\\s*\\})`));
        if (match) {
            let inner = match[2];
            for (const [k, v] of Object.entries(dictObj)) {
                if (!inner.includes(`${k}:`)) {
                    inner += `\n        ${k}: ${JSON.stringify(v)},`;
                }
            }
            content = content.replace(match[0], `${match[1]}${inner}\n    }${match[3]}`);
        }
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

injectLocales('frontend/src/i18n/locales/ko.js', koKeys, 'kakao');
injectLocales('frontend/src/i18n/locales/en.js', enKeys, 'kakao');
injectLocales('frontend/src/i18n/locales/ja.js', jaKeys, 'kakao');

// Now let's completely overwrite KakaoChannel.jsx
const jsxCode = `import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useI18n } from '../i18n';

// Clean standard fetch approach used in v4
const API = (path, opts = {}) =>
    fetch(\`/api\${path}\`, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts }).then(r => r.json());

const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    kakao: "#fee500", kakaoText: "#3c1e1e",
    purple: "#a78bfa", muted: "rgba(255,255,255,0.4)", text: "#e8eaf0",
};

const INPUT = {
    width: "100%", padding: "9px 13px", borderRadius: 8,
    background: C.surface, border: \`1px solid \${C.border}\`,
    color: C.text, boxSizing: "border-box", fontSize: 13,
};

/* ─── Settings Tab ──────────────────────────────────── */
function SettingsTab({ API }) {
    const { t } = useI18n();
    const [settings, setSettings] = useState({
        sender_key: "", api_key: "", channel_id: "",
        channel_name: "", mode: "mock",
    });
    const [msg, setMsg] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        API("/kakao/settings").then(r => { if (r.ok && r.settings) setSettings(s => ({ ...s, ...r.settings })); }).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            const r = await API("/kakao/settings", { method: "PUT", body: JSON.stringify(settings) });
            setSaving(false);
            setMsg(r.ok ? t('kakao.msgSaveDone') : \`\${t('kakao.msgSaveFail')} \${r.error || ''}\`);
        } catch (e) {
            setSaving(false);
            setMsg(t('kakao.errGeneral'));
        }
    };

    return (
        <div style={{ maxWidth: 640 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t('kakao.setTit')}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                    {t('kakao.setDesc')}
                </div>

                {/* Send 모드 */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{t('kakao.setMode')}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[["mock", t('kakao.btnMock')], ["live", t('kakao.btnLive')]].map(([val, label]) => (
                            <button key={val} onClick={() => setSettings(s => ({ ...s, mode: val }))} style={{
                                padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                                background: settings.mode === val ? (val === "live" ? C.green : C.accent) : C.surface,
                                color: settings.mode === val ? "#fff" : C.muted,
                            }}>{label}</button>
                        ))}
                    </div>
                    {settings.mode === "live" && (
                        <div style={{ marginTop: 8, fontSize: 12, background: "#22c55e11", border: "1px solid #22c55e33", borderRadius: 8, padding: "8px 12px", color: C.green }}>
                            {t('kakao.warnLive')}
                        </div>
                    )}
                    {settings.mode === "mock" && (
                        <div style={{ marginTop: 8, fontSize: 12, background: "#4f8ef711", border: "1px solid #4f8ef733", borderRadius: 8, padding: "8px 12px", color: C.accent }}>
                            {t('kakao.warnMock')}
                        </div>
                    )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                        [t('kakao.fName'), "channel_name", t('kakao.pName')],
                        [t('kakao.fId'), "channel_id", t('kakao.pId')],
                        [t('kakao.fSender'), "sender_key", t('kakao.pSender')],
                        [t('kakao.fApi'), "api_key", t('kakao.pApi')],
                    ].map(([label, key, placeholder]) => (
                        <div key={key}>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                            <input
                                type={key.includes("key") || key.includes("Key") ? "password" : "text"}
                                value={settings[key] || ""}
                                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                placeholder={placeholder} style={INPUT} />
                        </div>
                    ))}
                </div>

                {msg && <div style={{ marginTop: 14, fontSize: 13, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                <button onClick={save} disabled={saving} style={{ marginTop: 18, padding: "10px 24px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    {saving ? t('kakao.btnSaving') : t('kakao.btnSave')}
                </button>
            </div>
        </div>
    );
}

/* ─── 템플릿 Tab ──────────────────────────────────── */
function TemplatesTab({ API }) {
    const { t } = useI18n();
    const [templates, setTemplates] = useState([]);
    const [form, setForm] = useState({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] });
    const [test, setTest] = useState({ phone: "", name: t('kakao.pCustName') });
    const [testResult, setTestResult] = useState(null);
    const [msg, setMsg] = useState("");
    const [testingCode, setTestingCode] = useState(null);

    const load = () => API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.template_code || !form.name || !form.content) { setMsg(t('kakao.msgTplReq')); return; }
        try {
            const r = await API("/kakao/templates", { method: "POST", body: JSON.stringify(form) });
            if (r.ok) { setMsg(t('kakao.msgSaveDone')); setForm({ template_code: "", name: "", content: "", msg_type: "AT", buttons: [] }); load(); }
            else setMsg("❌ " + (r.error || t('kakao.errGeneral')));
        } catch (e) {
            setMsg(t('kakao.errGeneral'));
        }
    };

    const doTest = async (code) => {
        if (!test.phone) { alert(t('kakao.msgTestPhone')); return; }
        setTestingCode(code);
        try {
            const r = await API(\`/kakao/templates/\${code}/test\`, {
                method: "POST", body: JSON.stringify({ phone: test.phone, name: test.name }),
            });
            setTestingCode(null);
            setTestResult(r);
        } catch (e) {
            setTestingCode(null);
            setTestResult({ ok: false, error: t('kakao.errGeneral') });
        }
    };

    const del = async (id) => {
        if (!confirm(t('kakao.btnDelConfirm'))) return;
        await API(\`/kakao/templates/\${id}\`, { method: "DELETE" }).catch(() => {});
        load();
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Register 폼 */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('kakao.tplRegTit')}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplCode')}</div>
                        <input value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} placeholder={t('kakao.pTplCode')} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTplName')}</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('kakao.pTplName')} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fMsgType')}</div>
                        <select value={form.msg_type} onChange={e => setForm(f => ({ ...f, msg_type: e.target.value }))} style={{ ...INPUT }}>
                            <option value="AT">{t('kakao.optAt')}</option>
                            <option value="FT">{t('kakao.optFt')}</option>
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fContent')}</div>
                        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder={t('kakao.pContent')} style={{ ...INPUT, resize: "vertical", lineHeight: 1.6 }} />
                    </div>
                    {msg && <div style={{ fontSize: 12, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                    <button onClick={save} style={{ padding: "10px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>
                        {t('kakao.btnTplSave')}
                    </button>
                </div>
            </div>

            {/* List + Test */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Test Send Settings */}
                <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('kakao.testTit')}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <input value={test.phone} onChange={e => setTest(t => ({ ...t, phone: e.target.value }))} placeholder={t('kakao.pPhone')} style={{ ...INPUT, flex: 1 }} />
                        <input value={test.name} onChange={e => setTest(t => ({ ...t, name: e.target.value }))} placeholder={t('kakao.pCustName')} style={{ ...INPUT, width: 100, flex: "none" }} />
                    </div>
                    {testResult && (
                        <div style={{ marginTop: 10, background: testResult.ok ? "#22c55e11" : "#f8717111", border: \`1px solid \${testResult.ok ? "#22c55e33" : "#f8717133"}\`, borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                            {testResult.ok ? (
                                <>
                                    <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>✅ {testResult.message || t('kakao.msgTestDone')}</div>
                                    {testResult.mode === "mock" && <div style={{ color: C.muted }}>📋 {t('kakao.lblContent')} {testResult.content?.slice(0, 80)}...</div>}
                                </>
                            ) : (
                                <div style={{ color: C.red }}>❌ {testResult.error || t('kakao.errGeneral')}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Register된 템플릿 */}
                {templates.map(tpl => (
                    <div key={tpl.id} style={{ background: C.card, borderRadius: 12, padding: 16, border: \`1px solid \${C.border}\` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{t('kakao.lblCode')} {tpl.template_code} · {t('kakao.lblType')} {tpl.msg_type}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => doTest(tpl.template_code)} disabled={testingCode === tpl.template_code} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                    {testingCode === tpl.template_code ? t('kakao.testBtnIng') : t('kakao.testBtn')}
                                </button>
                                <button onClick={() => del(tpl.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#f8717122", color: C.red, cursor: "pointer", fontSize: 12 }}>{t('kakao.testBtnDel')}</button>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, background: C.surface, borderRadius: 8, padding: "8px 12px", color: C.muted, whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden" }}>
                            {tpl.content}
                        </div>
                    </div>
                ))}
                {templates.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>{t('kakao.emptyTpl')}</div>}
            </div>
        </div>
    );
}

/* ─── Campaign Tab ─────────────────────────────────── */
function CampaignsTab({ API }) {
    const { t } = useI18n();
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [segments, setSegments] = useState([]);
    const [form, setForm] = useState({ name: "", template_code: "", segment_id: "" });
    const [sending, setSending] = useState(null);
    const [msg, setMsg] = useState("");

    const load = () => {
        API("/kakao/campaigns").then(r => r.ok && setCampaigns(r.campaigns || [])).catch(() => {});
        API("/kakao/templates").then(r => r.ok && setTemplates(r.templates || [])).catch(() => {});
        API("/crm/segments").then(r => r.ok && setSegments(r.segments || [])).catch(() => {});
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        try {
            const r = await API("/kakao/campaigns", { method: "POST", body: JSON.stringify(form) });
            if (r.ok) { setMsg(t('kakao.msgCampDone')); setForm({ name: "", template_code: "", segment_id: "" }); load(); }
            else setMsg("❌ " + (r.error || t('kakao.errGeneral')));
        } catch (e) {
            setMsg(t('kakao.errGeneral'));
        }
    };

    const send = async (id) => {
        if (!confirm(t('kakao.msgSendConfirm'))) return;
        setSending(id);
        try {
            const r = await API(\`/kakao/campaigns/\${id}/send\`, { method: "POST" });
            setSending(null);
            if (r.ok) { setMsg(\`✅ \${r.mode === "mock" ? t('kakao.msgSendMock') : ""}\${t('kakao.msgSendSucc')} \${r.success || 0}, \${t('kakao.msgSendFail2')}\${r.failed || 0})\`); load(); }
            else setMsg(t('kakao.msgSendFailT'));
        } catch (e) {
            setSending(null);
            setMsg(t('kakao.errGeneral'));
        }
    };

    const STATUS_COLOR = { draft: C.muted, sent: C.green };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>{t('kakao.campNew')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fCampName')}</div>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fCampTpl')}</div>
                        <select value={form.template_code} onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">{t('kakao.optSel')}</option>
                            {templates.map(tpl => <option key={tpl.id} value={tpl.template_code}>{tpl.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('kakao.fTarget')}</div>
                        <select value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value }))} style={{ ...INPUT }}>
                            <option value="">{t('kakao.optAll')}</option>
                            {segments.map(s => <option key={s.id} value={s.id}>{(t("Data." + s.name) !== "Data." + s.name ? t("Data." + s.name) : s.name)} ({s.member_count}{t('kakao.unitCust')})</option>)}
                        </select>
                    </div>
                </div>
                {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.includes("❌") ? C.red : C.green }}>{msg}</div>}
                <button onClick={create} disabled={!form.name} style={{ marginTop: 14, padding: "9px 22px", borderRadius: 10, border: "none", background: C.kakao, color: C.kakaoText, fontWeight: 700, cursor: "pointer" }}>
                    {t('kakao.btnCampCreate')}
                </button>
            </div>

            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: \`1px solid \${C.border}\` }}>{t('kakao.campStat')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#0a1520" }}>
                            {[t('kakao.colName'), t('kakao.colTpl'), t('kakao.colTarget'), t('kakao.colSendCnt'), t('kakao.colSucc'), t('kakao.colFail'), t('kakao.colStat'), t('kakao.colAction')].map(h => (
                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((c, i) => (
                            <tr key={c.id} style={{ borderTop: \`1px solid \${C.border}\`, background: i % 2 ? "#0a1520" : "transparent" }}>
                                <td style={{ padding: "10px 16px", fontWeight: 600 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.template_name || c.template_code || "-"}</td>
                                <td style={{ padding: "10px 16px", color: C.muted }}>{c.segment_name || t('kakao.valAll')}</td>
                                <td style={{ padding: "10px 16px" }}>{c.total?.toLocaleString() || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.green }}>{c.success || 0}</td>
                                <td style={{ padding: "10px 16px", color: C.red }}>{c.failed || 0}</td>
                                <td style={{ padding: "10px 16px" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[c.status] || C.muted }}>●&nbsp;{(t("Data." + c.status) !== "Data." + c.status ? t("Data." + c.status) : c.status)}</span>
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                    {c.status !== "sent" && (
                                        <button onClick={() => send(c.id)} disabled={sending === c.id} style={{
                                            padding: "5px 12px", borderRadius: 7, border: "none",
                                            background: sending === c.id ? C.surface : C.kakao,
                                            color: C.kakaoText, fontWeight: 700, cursor: "pointer", fontSize: 12,
                                        }}>{sending === c.id ? t('kakao.btnSending') : t('kakao.btnSend')}</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: C.muted }}>{t('kakao.emptyCamp')}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─── Kakao Channel 내용 (PlanGate 내부) ──────────── */
function KakaoChannelContent() {
    const { token } = useAuth();
    const { t } = useI18n();

    // Dynamically inject auth token into API requests
    const authorizedAPI = (path, opts = {}) => {
        const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
        if (token) headers["Authorization"] = \`Bearer \${token}\`;
        return API(path, { ...opts, headers });
    };

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: t('kakao.tabCamp') },
        { id: "templates", label: t('kakao.tabTpl') },
        { id: "settings", label: t('kakao.tabSet') },
    ];

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            
            <div style={{ borderRadius: 16, background: \`linear-gradient(135deg,\${C.surface},#0a1828)\`, border: \`1px solid \${C.border}\`, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: C.kakao, color: C.kakaoText, borderRadius: 8, padding: "4px 10px", fontSize: 16 }}>💬</span>
                    {t('kakao.title')}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{t('kakao.subTitle')}</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(Tb => (
                    <button key={Tb.id} onClick={() => setTab(Tb.id)} style={{
                        padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                        background: tab === Tb.id ? C.kakao : C.card,
                        color: tab === Tb.id ? C.kakaoText : C.muted,
                        fontWeight: 700, fontSize: 13,
                    }}>{Tb.label}</button>
                ))}
            </div>

            {tab === "campaigns" && <CampaignsTab API={authorizedAPI} />}
            {tab === "templates" && <TemplatesTab API={authorizedAPI} />}
            {tab === "settings" && <SettingsTab API={authorizedAPI} />}
        </div>
    );
}

/* ─── 메인 Kakao Channel Page ────────────────────── */
export default function KakaoChannel() {
    return (
        <PlanGate feature="kakao_channel">
            <KakaoChannelContent />
        </PlanGate>
    );
}
`;

fs.writeFileSync('frontend/src/pages/KakaoChannel.jsx', jsxCode, 'utf8');
console.log("Complete");
