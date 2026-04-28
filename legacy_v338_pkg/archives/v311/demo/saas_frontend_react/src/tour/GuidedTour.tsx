import React from "react";
import { useNavigate } from "react-router-dom";

type Step = { title: string; body: string; to?: string };

const STEPS: Step[] = [
  { title: "1) 테넌트 전환", body: "상단에서 샘플 테넌트를 전환해보세요. 리전/플랜이 바뀝니다." },
  { title: "2) 권한별 메뉴", body: "사용자 역할을 바꾸면(마케팅/재무/대행사) 좌측 메뉴가 자동으로 바뀝니다." },
  { title: "3) 커머스 운영", body: "주문/상품 테이블에서 검색·필터 후 대량 작업 시나리오를 체험합니다.", to: "/commerce" },
  { title: "4) 광고 제어(데모)", body: "캠페인 테이블에서 대량 Pause/예산 변경 요청을 생성합니다(승인함으로 이동).", to: "/ads" },
  { title: "5) 승인함", body: "재무팀/총괄 역할로 승인/반려를 처리해 보세요.", to: "/approvals" },
  { title: "6) 분석", body: "퍼널/코호트/증분효과를 KPI 형태로 확인합니다.", to: "/analytics" },
];

export function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = React.useState(0);
  const nav = useNavigate();

  React.useEffect(() => {
    if (!open) return;
    const step = STEPS[i];
    if (step?.to) nav(step.to);
  }, [open, i, nav]);

  if (!open) return null;
  const step = STEPS[i];
  return (
    <div className="tourOverlay" role="dialog" aria-modal="true">
      <div className="tourCard">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800}}>{step.title}</div>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
        <div style={{marginTop:10, color:"#333"}}>{step.body}</div>
        <div className="toolbar" style={{marginTop:12, justifyContent:"space-between"}}>
          <button className="btn" disabled={i===0} onClick={()=>setI(x=>Math.max(0,x-1))}>이전</button>
          <span className="badge">{i+1} / {STEPS.length}</span>
          {i < STEPS.length-1 ? (
            <button className="btn primary" onClick={()=>setI(x=>Math.min(STEPS.length-1,x+1))}>다음</button>
          ) : (
            <button className="btn primary" onClick={onClose}>완료</button>
          )}
        </div>
      </div>
    </div>
  );
}
