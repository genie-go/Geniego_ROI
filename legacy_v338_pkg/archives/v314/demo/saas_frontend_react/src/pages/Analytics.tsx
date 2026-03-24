import React from "react";

export default function Analytics() {
  const kpis = [
    { metric:"ROAS", value:"3.20", note:"캠페인/채널별 리포트(데모)" },
    { metric:"Conversion", value:"120", note:"퍼널/코호트 기반(데모)" },
    { metric:"Incrementality", value:"+8%", note:"실험 기반 증분효과(데모)" },
  ];
  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Analytics</h2>
        <div className="small">실운영에서는 이벤트/주문/광고리포트를 연결해 계산합니다.</div>
      </div>
      {kpis.map(k => (
        <div key={k.metric} className="card span4">
          <div className="small">{k.metric}</div>
          <div style={{fontSize:28,fontWeight:800}}>{k.value}</div>
          <div className="small">{k.note}</div>
        </div>
      ))}
      <div className="card span12">
        <h3 style={{marginTop:0}}>Demo Click Scenario</h3>
        <ol className="small">
          <li>상단에서 테넌트 전환</li>
          <li>사용자 역할을 ‘대행사 Viewer’로 변경 → 메뉴 제한 확인</li>
          <li>‘마케팅팀’으로 변경 → Ads Hub에서 대량 Pause 요청</li>
          <li>‘재무팀’으로 변경 → 승인함에서 승인 처리</li>
        </ol>
      </div>
    </div>
  );
}
