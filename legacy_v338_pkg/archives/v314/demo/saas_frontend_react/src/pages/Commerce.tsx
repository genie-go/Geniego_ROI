import React from "react";
import { useApp } from "../state";
import { loadJson } from "../data";
import { DataTable } from "../components/DataTable";

type Product = any;
type Order = any;

export default function Commerce() {
  const { tenant, has } = useApp();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [toast, setToast] = React.useState<string>("");

  React.useEffect(() => {
    loadJson<Product[]>("/demo/sample_data/demo_products.json").then(setProducts);
    loadJson<Order[]>("/demo/sample_data/demo_orders.json").then(setOrders);
  }, []);

  const myProducts = products.filter(p => (p.channels||[]).length && (tenant?.region ? true : true));
  const myOrders = orders.filter(o => o.tenant_id === tenant?.tenant_id);

  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Commerce Hub</h2>
        <div className="small">검색/필터 + 대량작업(데모). 쓰기 작업은 권한/승인 정책을 거칩니다.</div>
        {toast && <div className="badge" style={{marginTop:10}}>{toast}</div>}
      </div>

      <div className="card span6">
        <h3 style={{marginTop:0}}>Products</h3>
        <DataTable
          rows={myProducts}
          rowKey={(r)=>r.sku}
          searchKeys={["sku","name"]}
          columns={[
            { key:"sku", label:"SKU" },
            { key:"name", label:"Name" },
            { key:"price", label:"Price", render:(v,row)=>`${v} ${row.currency}` },
            { key:"stock", label:"Stock" },
            { key:"channels", label:"Channels", render:(v)=> (v||[]).join(", ") },
          ]}
          bulkActions={[
            { label:"가격 업데이트 요청", kind:"primary", onRun:(sel)=>{
              if(!has("commerce:write")) { setToast("권한이 없습니다(commerce:write)."); return; }
              setToast(`가격 업데이트 요청 생성: ${sel.length}건 (승인함에서 처리)`);
            }},
            { label:"재고 반영 요청", kind:"primary", onRun:(sel)=>{
              if(!has("commerce:write")) { setToast("권한이 없습니다(commerce:write)."); return; }
              setToast(`재고 반영 요청 생성: ${sel.length}건 (승인함에서 처리)`);
            }},
          ]}
        />
      </div>

      <div className="card span6">
        <h3 style={{marginTop:0}}>Orders</h3>
        <DataTable
          rows={myOrders}
          rowKey={(r)=>r.order_id}
          searchKeys={["order_id","channel","status"]}
          columns={[
            { key:"order_id", label:"Order" },
            { key:"channel", label:"Channel" },
            { key:"status", label:"Status" },
            { key:"revenue", label:"Revenue", render:(v,row)=>`${v} ${row.currency}` },
          ]}
          bulkActions={[
            { label:"반품/교환 타임라인 보기(데모)", onRun:(sel)=>setToast(`선택 ${sel.length}건 타임라인 보기(데모)`)},
          ]}
        />
      </div>
    </div>
  );
}
