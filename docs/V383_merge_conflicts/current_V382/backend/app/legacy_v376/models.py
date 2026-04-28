from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Boolean, Text, ForeignKey, JSON, Float, UniqueConstraint
from datetime import datetime, timezone

class Base(DeclarativeBase):
    pass

def now():
    return datetime.now(timezone.utc)

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Group(Base):
    __tablename__ = "groups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(255), default="")
    # Optional: assign a base role to group members, or leave empty to not override
    role: Mapped[str] = mapped_column(String(32), default="")
    # Optional: extra permissions granted by group (unioned on top of role)
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    __table_args__ = (UniqueConstraint("tenant_id","name", name="uq_group_name_tenant"),)

class UserGroup(Base):
    __tablename__ = "user_groups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    __table_args__ = (UniqueConstraint("tenant_id","user_id","group_id", name="uq_user_group"),)

class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(32), default="viewer")
    group_ids: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")  # PENDING/ACCEPTED/EXPIRED/REVOKED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    accepted_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    source: Mapped[str] = mapped_column(String(32))
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str] = mapped_column(Text, default="")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    scope: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ConnectorStatus(Base):
    __tablename__ = "connector_status"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    source: Mapped[str] = mapped_column(String(32))
    needs_reauth: Mapped[bool] = mapped_column(Boolean, default=False)
    last_ok_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class TenantRBACPolicy(Base):
    __tablename__ = "tenant_rbac_policies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), unique=True, index=True)
    matrix: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    actor_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64))
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ActionProposal(Base):
    __tablename__ = "action_proposals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    kind: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    idempotency_key: Mapped[str] = mapped_column(String(64), index=True, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    kind: Mapped[str] = mapped_column(String(64))
    stage: Mapped[str] = mapped_column(String(32), default="MANAGER")
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    sla_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SagaExecution(Base):
    __tablename__ = "saga_executions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    action_id: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SagaStep(Base):
    __tablename__ = "saga_steps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    saga_id: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(64))
    phase: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16))
    priority: Mapped[int] = mapped_column(Integer, default=0)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

# -----------------------------
# V349: CDP + Commerce Intelligence (MVP schema)
# -----------------------------

class DataSource(Base):
    __tablename__ = "data_sources"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    kind: Mapped[str] = mapped_column(String(32))
    platform: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(200), default="")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)



class OnboardingTestReport(Base):
    __tablename__ = "onboarding_test_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    channel: Mapped[str] = mapped_column(String(64), index=True)
    ok: Mapped[bool] = mapped_column(Boolean, default=False)
    report: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SyncState(Base):
    __tablename__ = "sync_states"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    data_source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    cursor: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ProductMatchKey(Base):
    """Stores normalized matching keys for product/linking across channels."""
    __tablename__ = "product_match_keys"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    key_type: Mapped[str] = mapped_column(String(32))  # sku, upc, ean, gtin, barcode, asin, vendor_item_id
    key_value: Mapped[str] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Identity(Base):
    __tablename__ = "cdp_identities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    primary_type: Mapped[str] = mapped_column(String(32))
    primary_value: Mapped[str] = mapped_column(String(255), index=True)
    traits: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class IdentityLink(Base):
    __tablename__ = "cdp_identity_links"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    identity_id: Mapped[int] = mapped_column(ForeignKey("cdp_identities.id"))
    type: Mapped[str] = mapped_column(String(32))
    value: Mapped[str] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Event(Base):
    __tablename__ = "cdp_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    identity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(32))
    event_type: Mapped[str] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    props: Mapped[dict] = mapped_column(JSON, default=dict)

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    sku: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(500), default="")
    brand: Mapped[str] = mapped_column(String(200), default="")
    category: Mapped[str] = mapped_column(String(200), default="")
    attrs: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ChannelListing(Base):
    __tablename__ = "channel_listings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    channel: Mapped[str] = mapped_column(String(32))
    listing_id: Mapped[str] = mapped_column(String(128), index=True)
    url: Mapped[str] = mapped_column(Text, default="")
    attrs: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    source: Mapped[str] = mapped_column(String(32))
    order_id: Mapped[str] = mapped_column(String(128), index=True)
    identity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(16), default="KRW")
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="")
    ordered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    order_row_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sku: Mapped[str] = mapped_column(String(128), default="")
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)


class Claim(Base):
    """Returns/refunds/cancel claims normalized across channels."""
    __tablename__ = "claims"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32), index=True)
    claim_id: Mapped[str] = mapped_column(String(128), index=True)
    order_id: Mapped[str] = mapped_column(String(128), default="", index=True)
    claim_type: Mapped[str] = mapped_column(String(32), default="")  # cancel/return/exchange/refund
    status: Mapped[str] = mapped_column(String(64), default="")
    reason: Mapped[str] = mapped_column(String(256), default="")
    amount: Mapped[float] = mapped_column(Float, default=0.0)  # refunded/claimed amount
    currency: Mapped[str] = mapped_column(String(16), default="KRW")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("tenant_id", "channel", "claim_id", name="uq_claim"),
    )

class Settlement(Base):
    """Payout/settlement records from marketplaces (where available)."""
    __tablename__ = "settlements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32), index=True)
    settlement_id: Mapped[str] = mapped_column(String(128), index=True)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gross_sales: Mapped[float] = mapped_column(Float, default=0.0)
    fees: Mapped[float] = mapped_column(Float, default=0.0)
    net_payout: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(16), default="KRW")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

    __table_args__ = (
        UniqueConstraint("tenant_id", "channel", "settlement_id", name="uq_settlement"),
    )

class DigitalShelfSnapshot(Base):
    """Digital shelf snapshot for search visibility / price / availability / content compliance."""
    __tablename__ = "digital_shelf_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32), index=True)  # naver, coupang, amazon, google, etc
    keyword: Mapped[str] = mapped_column(String(256), index=True)
    brand: Mapped[str] = mapped_column(String(128), default="", index=True)
    competitor: Mapped[str] = mapped_column(String(128), default="", index=True)
    listing_id: Mapped[str] = mapped_column(String(128), default="", index=True)
    url: Mapped[str] = mapped_column(Text, default="")
    position: Mapped[int] = mapped_column(Integer, default=0)  # rank position
    price: Mapped[float] = mapped_column(Float, default=0.0)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    content_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

class ContentComplianceIssue(Base):
    __tablename__ = "content_compliance_issues"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32), index=True)
    listing_id: Mapped[str] = mapped_column(String(128), index=True)
    issue_code: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16), default="warn")  # warn/error
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    source: Mapped[str] = mapped_column(String(32))
    sku: Mapped[str] = mapped_column(String(128), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str] = mapped_column(String(128), default="")
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32))
    sku: Mapped[str] = mapped_column(String(128), index=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(16), default="KRW")
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    channel: Mapped[str] = mapped_column(String(32))
    sku: Mapped[str] = mapped_column(String(128), index=True)
    rating: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(500), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(255), default="")
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

class Influencer(Base):
    __tablename__ = "influencers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    platform: Mapped[str] = mapped_column(String(32))
    handle: Mapped[str] = mapped_column(String(128), index=True)
    display_name: Mapped[str] = mapped_column(String(255), default="")
    followers: Mapped[int] = mapped_column(Integer, default=0)
    profile_url: Mapped[str] = mapped_column(Text, default="")
    attrs: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class InfluencerPost(Base):
    __tablename__ = "influencer_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    influencer_id: Mapped[int] = mapped_column(ForeignKey("influencers.id"))
    platform: Mapped[str] = mapped_column(String(32))
    post_id: Mapped[str] = mapped_column(String(128), index=True)
    url: Mapped[str] = mapped_column(Text, default="")
    caption: Mapped[str] = mapped_column(Text, default="")
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    raw: Mapped[dict] = mapped_column(JSON, default=dict)


# --- V350: Insights / Marketing metrics / Config storage ---
# -----------------------------
# V351: Experiment / Incrementality + Attribution Touchpoints
# -----------------------------

class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    name: Mapped[str] = mapped_column(String(200))
    channel: Mapped[str] = mapped_column(String(64), default="")
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    holdout_ratio: Mapped[float] = mapped_column(Float, default=10.0)  # percent (0-100)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AttributionTouch(Base):
    __tablename__ = "attribution_touches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    identity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel: Mapped[str] = mapped_column(String(64))
    campaign: Mapped[str] = mapped_column(String(128), default="")
    source_event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    attrs: Mapped[dict] = mapped_column(JSON, default=dict)

class MarketingMetric(Base):
    __tablename__ = "marketing_metrics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    source: Mapped[str] = mapped_column(String(32))
    day: Mapped[str] = mapped_column(String(10))
    region: Mapped[str] = mapped_column(String(64))
    gender: Mapped[str] = mapped_column(String(16))
    age_bucket: Mapped[str] = mapped_column(String(32))
    level: Mapped[str] = mapped_column(String(16), default="day")
    campaign_id: Mapped[str] = mapped_column(String(64), default="")
    campaign_name: Mapped[str] = mapped_column(String(255), default="")
    adgroup_id: Mapped[str] = mapped_column(String(64), default="")
    adgroup_name: Mapped[str] = mapped_column(String(255), default="")
    keyword_id: Mapped[str] = mapped_column(String(64), default="")
    keyword_text: Mapped[str] = mapped_column(String(255), default="")
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    purchases: Mapped[int] = mapped_column(Integer, default=0)
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    trust_score: Mapped[float] = mapped_column(Float, default=0.0)
    trust_meta: Mapped[dict] = mapped_column(JSON, default=dict)

class Insight(Base):
    __tablename__ = "insights"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    title: Mapped[str] = mapped_column(String(220))
    summary: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16))
    trust_score: Mapped[float] = mapped_column(Float, default=0.0)
    trust_explain: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AttributionConfig(Base):
    __tablename__ = "attribution_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), default="default")
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ChannelMappingConfig(Base):
    __tablename__ = "channel_mapping_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), default="default")
    mapping_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ReviewEndpointConfigVersion(Base):
    """V360: Review endpoint allowlist config version history (for diff/audit/rollback)."""
    __tablename__ = "review_endpoint_config_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    actor: Mapped[str] = mapped_column(String(255), default="system")
    action: Mapped[str] = mapped_column(String(64), default="update")  # update|rollback|approve
    base_version_id: Mapped[int] = mapped_column(Integer, default=0)   # previous active version id
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)      # full snapshot after action
    diff_json: Mapped[dict] = mapped_column(JSON, default=dict)        # structured diff vs base
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AdOptimizationRule(Base):
    """V362: Rule-based retail media optimization settings.

    Stored per tenant and ad source (amazon_ads/meta_ads/tiktok_ads/retail_media).
    """
    __tablename__ = "ad_optimization_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    source: Mapped[str] = mapped_column(String(64), default="retail_media")  # amazon_ads|meta_ads|tiktok_ads|...
    name: Mapped[str] = mapped_column(String(200), default="default")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    rule_json: Mapped[dict] = mapped_column(JSON, default=dict)  # thresholds/targets/guardrails
    created_by: Mapped[str] = mapped_column(String(255), default="system")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AdOptimizationRun(Base):
    """V362: Execution record for an optimization run."""
    __tablename__ = "ad_optimization_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    source: Mapped[str] = mapped_column(String(64), default="retail_media")
    status: Mapped[str] = mapped_column(String(32), default="ok")  # ok|error
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    summary_json: Mapped[dict] = mapped_column(JSON, default=dict)



class AdOptimizationPlan(Base):
    """V363: 4-eyes governed APPLY plan built from an AdOptimizationRun recommendations."""
    __tablename__ = "ad_optimization_plans"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    source: Mapped[str] = mapped_column(String(64), default="retail_media")
    run_id: Mapped[int] = mapped_column(Integer, default=0)  # originating run
    status: Mapped[str] = mapped_column(String(32), default="PENDING_REVIEW")  # pending_review|reviewed|approved|applied|rolled_back|rejected
    plan_json: Mapped[dict] = mapped_column(JSON, default=dict)

    # 4-eyes fields
    created_by: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reviewed_by: Mapped[str] = mapped_column(String(255), default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str] = mapped_column(String(255), default="")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_by: Mapped[str] = mapped_column(String(255), default="")
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # execution + rollback
    applied_by: Mapped[str] = mapped_column(String(255), default="")
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    apply_result_json: Mapped[dict] = mapped_column(JSON, default=dict)
    rolled_back_by: Mapped[str] = mapped_column(String(255), default="")
    rolled_back_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rollback_result_json: Mapped[dict] = mapped_column(JSON, default=dict)

class UGCPost(Base):
    """V362: UGC / influencer post normalized record with tracking hooks."""
    __tablename__ = "ugc_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    platform: Mapped[str] = mapped_column(String(64), default="instagram")
    creator_handle: Mapped[str] = mapped_column(String(200), default="")
    post_url: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)   # views/likes/comments/shares
    tracking: Mapped[dict] = mapped_column(JSON, default=dict)  # utm_source/utm_campaign/coupon_code/landing_url
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# -----------------------------
# V375: Amazon Seller/Vendor risk & governance (additive)
# -----------------------------


class AmazonAccountHealth(Base):
    """Stores seller/vendor account health metrics.

    - account_type: SELLER (Seller Central / SP-API), VENDOR (Vendor Central)
    - metrics: flexible payload (order defect rate, late shipment rate, cancellation rate, chargebacks, AHR, etc.)
    """

    __tablename__ = "amazon_account_health"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    account_type: Mapped[str] = mapped_column(String(16), default="SELLER", index=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    marketplace: Mapped[str] = mapped_column(String(16), default="US", index=True)
    health_score: Mapped[float] = mapped_column(Float, default=0.0)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    __table_args__ = (
        UniqueConstraint("tenant_id", "account_type", "account_id", "marketplace", name="uq_amz_health"),
    )


class AmazonListingPolicyFinding(Base):
    """Policy/compliance findings at listing level.

    Examples: restricted products, hazmat, prohibited claims, title/bullets violations,
    image violations, suppressed listing, IP infringement (as a finding type).
    """

    __tablename__ = "amazon_listing_policy_findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    marketplace: Mapped[str] = mapped_column(String(16), default="US", index=True)
    asin: Mapped[str] = mapped_column(String(32), index=True)
    sku: Mapped[str] = mapped_column(String(128), index=True, default="")
    finding_type: Mapped[str] = mapped_column(String(64), default="UNKNOWN", index=True)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM", index=True)  # LOW/MEDIUM/HIGH/CRITICAL
    status: Mapped[str] = mapped_column(String(16), default="OPEN", index=True)      # OPEN/ACK/RESOLVED
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

