import React from "react";
import { useApp } from "../state";
import { loadJson } from "../data";

type Order = any;
type Campaign = any;

export default function Overview() {
  const { tenant } = useApp();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [ads, setAds] = React.useState<Campaign[]>([]);

  React.useEffect(() => {
    loadJson<Order[]>("//sample_data/_orders.json").then(setOrders);
    loadJson<Campaign[]>("//sample_data/_ads_campaigns.json").then(setAds);
  }, []);

  const myOrders = orders.filter(o => o.tenant_id === tenant?.tenant_id);
  const myAds = ads.filter(a => a.tenant_id === tenant?.tenant_id);

  return (
    <div className="grid">
      <div className="card span8">
        <h2 style={{marginTop:0}}>Executive Overview</h2>
        <div className="small">테넌트 기준 요약 (데모 데이터)</div>
        <div className="grid" style={{marginTop:10}}>
          <div className="card span4"><div className="small">Orders</div><div style={{fontSize:28,fontWeight:800}}>{myOrders.length}</div></div>
          <div className="card span4"><div className="small">Active Campaigns</div><div style={{fontSize:28,fontWeight:800}}>{myAds.filter(a=>a.status==="ACTIVE").length}</div></div>
          <div className="card span4"><div className="small">ROAS (avg)</div>
            <div style={{fontSize:28,fontWeight:800}}>
              {myAds.length? (myAds.reduce((s,a)=>s+(a.roas||0),0)/myAds.length).toFixed(2): "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="card span4">
        <h3 style={{marginTop:0}}>Today’s Actions</h3>
        <ul className="small">
          <li>커머스: 부분배송/반품 이벤트 확인</li>
          <li>광고: ROAS 하락 시 예산 감액(승인 필요)</li>
          <li>승인함: 대기 요청 처리</li>
        </ul>
        <div className="badge">Governed Automation</div>
      </div>

      <div className="card span6">
        <h3 style={{marginTop:0}}>Recent Orders</h3>
        <table className="table">
          <thead><tr><th>order_id</th><th>channel</th><th>status</th><th>revenue</th></tr></thead>
          <tbody>
            {myOrders.map(o => <tr key={o.order_id}><td>{o.order_id}</td><td>{o.channel}</td><td>{o.status}</td><td>{o.revenue} {o.currency}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="card span6">
        <h3 style={{marginTop:0}}>Campaigns</h3>
        <table className="table">
          <thead><tr><th>campaign_id</th><th>provider</th><th>status</th><th>daily_budget</th><th>roas</th></tr></thead>
          <tbody>
            {myAds.map(a => <tr key={a.campaign_id}><td>{a.campaign_id}</td><td>{a.provider}</td><td>{a.status}</td><td>{a.daily_budget} {a.currency}</td><td>{a.roas}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
