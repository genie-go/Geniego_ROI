package store

import (
  "context"
  "encoding/json"
  "time"
  "github.com/google/uuid"
)

func (s *Store) CommerceStartSync(ctx context.Context, tenant, channel, kind string) (string, error) {
  runID := uuid.New().String()
  _, err := s.db.Pool().Exec(ctx, `
    INSERT INTO commerce_sync_runs(tenant_id, run_id, channel, kind, status)
    VALUES($1,$2,$3,$4,'queued')
  `, tenant, runID, channel, kind)
  return runID, err
}

func (s *Store) CommerceFinishSync(ctx context.Context, tenant, runID, status, msg string) error {
  _, err := s.db.Pool().Exec(ctx, `
    UPDATE commerce_sync_runs SET status=$3, finished_at=now(), message=$4
    WHERE tenant_id=$1 AND run_id=$2
  `, tenant, runID, status, msg)
  return err
}

func (s *Store) CommerceUpsertProducts(ctx context.Context, tenant string, products []map[string]any) error {
  for _, p := range products {
    sku, _ := p["sku"].(string)
    if sku == "" { continue }
    title, _ := p["title"].(string)
    desc, _ := p["description"].(string)
    price := 0.0
    if v, ok := p["price"].(float64); ok { price = v }
    currency, _ := p["currency"].(string)
    if currency=="" { currency="USD" }
    _, _ = s.db.Pool().Exec(ctx, `
      INSERT INTO commerce_products(tenant_id, sku, title, description, price, currency, updated_at)
      VALUES($1,$2,$3,$4,$5,$6,now())
      ON CONFLICT (tenant_id, sku) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, price=EXCLUDED.price, currency=EXCLUDED.currency, updated_at=now()
    `, tenant, sku, title, desc, price, currency)
  }
  return nil
}

func (s *Store) CommerceUpsertInventory(ctx context.Context, tenant string, inv []map[string]any) error {
  for _, it := range inv {
    sku, _ := it["sku"].(string)
    if sku=="" { continue }
    onHand := int64(0); reserved := int64(0)
    if v, ok := it["on_hand"].(float64); ok { onHand = int64(v) }
    if v, ok := it["reserved"].(float64); ok { reserved = int64(v) }
    _, _ = s.db.Pool().Exec(ctx, `
      INSERT INTO commerce_inventory(tenant_id, sku, on_hand, reserved, updated_at)
      VALUES($1,$2,$3,$4,now())
      ON CONFLICT (tenant_id, sku) DO UPDATE SET on_hand=EXCLUDED.on_hand, reserved=EXCLUDED.reserved, updated_at=now()
    `, tenant, sku, onHand, reserved)
  }
  return nil
}

func (s *Store) CommerceUpsertOrders(ctx context.Context, tenant, channel string, orders []map[string]any) error {
  for _, o := range orders {
    orderID, _ := o["order_id"].(string)
    if orderID=="" { continue }
    raw, _ := json.Marshal(o)
    total := 0.0
    if v, ok := o["total_amount"].(float64); ok { total = v }
    currency, _ := o["currency"].(string)
    buyer, _ := o["buyer_id"].(string)
    var orderedAt *time.Time
    if s2, ok := o["ordered_at"].(string); ok && s2!="" {
      if t, err := time.Parse(time.RFC3339, s2); err==nil { orderedAt=&t }
    }
    _, _ = s.db.Pool().Exec(ctx, `
      INSERT INTO commerce_orders(tenant_id, channel, order_id, ordered_at, buyer_id, total_amount, currency, raw_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (tenant_id, channel, order_id) DO UPDATE SET raw_json=EXCLUDED.raw_json, total_amount=EXCLUDED.total_amount, currency=EXCLUDED.currency
    `, tenant, channel, orderID, orderedAt, buyer, total, currency, string(raw))
  }
  return nil
}
