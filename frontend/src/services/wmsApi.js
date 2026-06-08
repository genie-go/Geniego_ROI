// 창고 관리(WMS) 백엔드 영속화 클라이언트 — 205차.
//   204차 감사: WmsManager.jsx 가 useState 만 사용 → 새로고침 시 소실(P0).
//   백엔드 Wms.php(/api/wms/*)에 창고·택배사·권한·입출고·피킹·발주·LOT 영속.
//   데모/운영 분리는 백엔드(GENIE_ENV별 DB) + 테넌트 격리로 처리(프론트 분기 불요).
import { getJsonAuth, requestJsonAuth } from './apiClient.js';

const P = '/api/wms';

// 창고
export const listWarehouses   = ()        => getJsonAuth(`${P}/warehouses`);
export const createWarehouse  = (b)       => requestJsonAuth(`${P}/warehouses`, 'POST', b);
export const updateWarehouse  = (id, b)   => requestJsonAuth(`${P}/warehouses/${id}`, 'PUT', b);
export const deleteWarehouse  = (id)      => requestJsonAuth(`${P}/warehouses/${id}`, 'DELETE');

// 택배사
export const listCarriers     = ()        => getJsonAuth(`${P}/carriers`);
export const createCarrier    = (b)       => requestJsonAuth(`${P}/carriers`, 'POST', b);
export const updateCarrier    = (id, b)   => requestJsonAuth(`${P}/carriers/${id}`, 'PUT', b);
export const deleteCarrier    = (id)      => requestJsonAuth(`${P}/carriers/${id}`, 'DELETE');

// 창고 접근 권한
export const listPermissions  = ()        => getJsonAuth(`${P}/permissions`);
export const createPermission = (b)       => requestJsonAuth(`${P}/permissions`, 'POST', b);
export const deletePermission = (id)      => requestJsonAuth(`${P}/permissions/${id}`, 'DELETE');

// 입출고 이력
export const listMovements    = (limit=300) => getJsonAuth(`${P}/movements?limit=${limit}`);
export const createMovement   = (b)       => requestJsonAuth(`${P}/movements`, 'POST', b);

// 피킹 리스트
export const listPicking      = ()        => getJsonAuth(`${P}/picking`);
export const createPicking    = (b)       => requestJsonAuth(`${P}/picking`, 'POST', b);
export const updatePicking    = (id, b)   => requestJsonAuth(`${P}/picking/${id}`, 'PUT', b);

// 자동 발주
export const listSupplyOrders = ()        => getJsonAuth(`${P}/supply-orders`);
export const createSupplyOrder= (b)       => requestJsonAuth(`${P}/supply-orders`, 'POST', b);
export const updateSupplyOrder= (id, b)   => requestJsonAuth(`${P}/supply-orders/${id}`, 'PUT', b);

// LOT / 유통기한
export const listLots         = ()        => getJsonAuth(`${P}/lots`);
export const createLot        = (b)       => requestJsonAuth(`${P}/lots`, 'POST', b);
export const deleteLot        = (id)      => requestJsonAuth(`${P}/lots/${id}`, 'DELETE');

export default {
  listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  listCarriers, createCarrier, updateCarrier, deleteCarrier,
  listPermissions, createPermission, deletePermission,
  listMovements, createMovement,
  listPicking, createPicking, updatePicking,
  listSupplyOrders, createSupplyOrder, updateSupplyOrder,
  listLots, createLot, deleteLot,
};
