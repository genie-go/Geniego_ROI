import React from "react";
import { ROLES } from "../data";

export default function Admin() {
  return (
    <div className="grid">
      <div className="card span12">
        <h2 style={{marginTop:0}}>Admin</h2>
        <div className="small">RBAC 템플릿(데모). 실제 운영은 테넌트별 사용자/권한/감사로그를 관리합니다.</div>
      </div>
      <div className="card span12">
        <table className="table">
          <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
          <tbody>
            {ROLES.map(r => (
              <tr key={r.id}>
                <td><b>{r.name}</b><div className="small">{r.id}</div></td>
                <td>{r.permissions.map(p => <span key={p} className="badge" style={{marginRight:6}}>{p}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
