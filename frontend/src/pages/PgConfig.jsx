import React, { useState, useEffect, useCallback } from "react";
import { getJsonAuth } from "../services/apiClient.js";

/**
 * PgConfig — 결제 게이트웨이 관리자 콘솔.
 *
 * 169차 P5 사용자 발견 issue fix:
 *   이전 53L 버전이 hardcoded mock (PG="토스페이먼츠", 거래=142, 매출=₩8.4M) 였음.
 *   168차 USD/Paddle 단일 정책 위반 + 가상데이터로 운영 신뢰 훼손.
 *
 * 정책 (절대 위반 금지):
 *   1) hardcoded 거래 수 / 매출 / 상태 값 절대 금지 — 모두 backend fetch
 *   2) backend 응답 실패 시 "—" placeholder 표시 (mock 대체 절대 금지)
 *   3) provider 표기 = "Paddle (Merchant of Record)" 고정 (168차 N-152-F-billing 정책)
 *   4) currency = "USD" 고정
 *   5) 데이터 출처 (data_source) UI 에 명시 — 사용자가 가상/실 데이터 판별 가능
 *
 * Endpoint: GET /v424/admin/paddle/stats
 *   - paddle_subscriptions COUNT/SUM 실 통계
 *   - 테이블 미존재 시 data_source='table_missing' 명시 응답 (mock 없음)
 */

const NA = '—';

function PgConfig() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/paddle/stats');
      setStats(data?.stats || null);
    } catch (e) {
      setError(String(e?.message || e));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const provider = stats?.provider || 'Paddle (MoR)';
  const integrationOk = stats?.integration_status === 'configured';
  const subs = stats?.subscriptions || {};
  const month = stats?.month || {};

  const kpis = [
    {
      emoji: '💳', label: 'PG Provider',
      val: provider,
      sub: stats?.env ? `env: ${stats.env}` : null,
    },
    {
      emoji: integrationOk ? '✅' : '⚠',
      label: '연동 상태',
      val: loading ? NA : (integrationOk ? '정상 (configured)' : 'PADDLE_CLIENT_TOKEN 미설정'),
    },
    {
      emoji: '📊', label: '금월 거래',
      val: loading ? NA : (Number.isFinite(month.tx_count) ? `${month.tx_count}건` : NA),
      sub: month.tx_count === 0 && stats?.data_source === 'paddle_subscriptions'
        ? '실 데이터 (0건)' : null,
    },
    {
      emoji: '💰', label: '금월 매출',
      val: loading ? NA : (Number.isFinite(month.revenue_usd)
        ? `$${month.revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : NA),
      sub: 'USD (Paddle 정합)',
    },
    {
      emoji: '👥', label: '활성 구독',
      val: loading ? NA : (Number.isFinite(subs.active) ? `${subs.active}` : NA),
      sub: Number.isFinite(subs.total) ? `total ${subs.total}` : null,
    },
    {
      emoji: '🚫', label: '취소 구독',
      val: loading ? NA : (Number.isFinite(subs.cancelled) ? `${subs.cancelled}` : NA),
    },
  ];

  const tabs = ['Paddle 설정', '결제 정책', '수수료 / 환불', 'Webhook 로그'];

  const cardStyle = {
    borderRadius: 14, padding: '18px 20px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  };

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1)' }}>
      <div style={{
        borderRadius: 18, padding: '28px 32px', marginBottom: 22,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(79,142,247,0.06))',
        border: '1px solid rgba(99,102,241,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>💳</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>결제 게이트웨이 관리</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                Paddle MoR · USD 단일 · 카드 결제 전용 (168차 N-152-F 정책)
              </div>
              <div style={{
                fontSize: 10, color: '#a78bfa', fontWeight: 700, marginTop: 4,
                padding: '2px 8px', borderRadius: 4,
                background: 'rgba(167,139,250,0.10)', display: 'inline-block',
              }}>⚠ 관리자 전용 · 모든 KPI 는 paddle_subscriptions 실 데이터</div>
            </div>
          </div>
          <button onClick={fetchStats} disabled={loading} style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
            fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}>{loading ? '로딩…' : '🔄 새로고침'}</button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)',
          color: '#f87171', fontSize: 12,
        }}>⚠ 통계 조회 실패 — {error}. 모든 KPI 가 "{NA}" 로 표시됩니다 (mock 절대 사용 안 함).</div>
      )}

      {stats?.data_source && stats.data_source !== 'paddle_subscriptions' && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.20)',
          color: '#fbbf24', fontSize: 12,
        }}>
          ℹ data_source = <code>{stats.data_source}</code> — paddle_subscriptions 테이블 미생성 또는 query 실패.
          모든 통계가 0 으로 표시됩니다. 운영 환경에서 Paddle webhook 적용 후 정상 데이터 채워짐.
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 22,
      }}>
        {kpis.map((k, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
              {!loading && (
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.10)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}>LIVE</span>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>
              {k.label}
            </div>
            {k.sub && (
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>
                {k.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: activeTab === i ? 'linear-gradient(135deg,#6366f1,#4f8ef7)' : 'transparent',
            color: activeTab === i ? '#fff' : 'var(--text-2)',
          }}>{tab}</button>
        ))}
      </div>

      <div style={{
        borderRadius: 16, padding: '24px 28px', minHeight: 280,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {activeTab === 0 && <TabPaddle stats={stats} />}
        {activeTab === 1 && <TabPolicy />}
        {activeTab === 2 && <TabFees />}
        {activeTab === 3 && <TabWebhook />}
      </div>
    </div>
  );
}

function TabPaddle({ stats }) {
  const env = stats?.env || NA;
  const tokenOk = stats?.integration_status === 'configured';
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Paddle Billing v2 통합</div>
      <ConfigRow label="Provider" value={stats?.provider || 'Paddle (MoR)'} />
      <ConfigRow label="Environment" value={env} />
      <ConfigRow label="Currency" value="USD (단일 정책 — 168차 N-152-F-billing)" />
      <ConfigRow label="Allowed Methods" value="card 전용 (Toss/PayPal/Apple Pay/Google Pay 차단)" />
      <ConfigRow label="Client Token" value={tokenOk ? '✅ configured (PADDLE_CLIENT_TOKEN env)' : '⚠ not configured'} />
      <ConfigRow label="Webhook Endpoint" value="POST /v423/paddle/webhook" />
      <ConfigRow label="MoR (Merchant of Record)" value="Paddle.com — VAT/GST/환불 위임" />
      <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 11, color: 'var(--text-3)' }}>
        <strong style={{ color: 'var(--text-2)' }}>가격 source of truth:</strong>{' '}
        Paddle Dashboard. 본 admin 콘솔의 priceId 매핑 변경은 admin/plan-pricing 페이지에서.
      </div>
    </>
  );
}

function TabPolicy() {
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>결제 정책 (168차 U-168-C)</div>
      {[
        ['통화', 'USD 단일'],
        ['결제 수단', 'Credit/Debit Card 전용'],
        ['차단 수단', 'Toss / KakaoPay / NaverPay / 계좌이체 / PayPal / Apple Pay / Google Pay'],
        ['MoR', 'Paddle (VAT/GST/세무 위임)'],
        ['환불 정책', '30일 환불 (refund page 정합)'],
        ['구독 cycle', 'monthly / annual (annual ~20% 할인)'],
      ].map(([k, v]) => (<ConfigRow key={k} label={k} value={v} />))}
    </>
  );
}

function TabFees() {
  return (
    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>수수료 / 환불 (Paddle MoR)</div>
      Paddle.com 이 MoR 로서 결제/환불/VAT 를 관리. 본 시스템은 통계 read-only.
      <ul style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.8 }}>
        <li>수수료율: Paddle 표준 (5% + $0.50 / transaction · 변동 가능)</li>
        <li>VAT/GST: 사용자 IP 기반 자동 계산 (Paddle)</li>
        <li>환불: Paddle Dashboard 또는 자동 — 본 시스템에 webhook 으로 반영</li>
      </ul>
    </div>
  );
}

function TabWebhook() {
  return (
    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>Webhook 이력 (paddle_events 테이블)</div>
      Webhook event 상세 view 는 별도 트랙 (170차+). 본 페이지는 통계 KPI 중심.
      <div style={{ marginTop: 12, fontSize: 11 }}>
        Endpoint: <code>POST /v423/paddle/webhook</code> · 이벤트: subscription_created/updated/cancelled, transaction_completed
      </div>
    </div>
  );
}

function ConfigRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
    }}>
      <div style={{ width: 200, color: 'var(--text-3)', fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-2)' }}>{value}</div>
    </div>
  );
}

export default PgConfig;
