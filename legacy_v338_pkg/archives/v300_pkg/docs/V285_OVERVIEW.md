# GENIE_ROI V285 Overview

V285 upgrades V284 in three areas that typically block enterprise adoption and create durable retention:

1) **MA Feature Completeness (pragmatic)**  
   - Segments (dynamic, rule-based) backed by Contacts + Events  
   - Message Experiments (A/B + Holdout) with deterministic assignment  
   - Template + Variant driven sending (via existing Email providers)  
   - UI dashboard expanded to cover executions, approvals, ROI, segments, connectors, and experiments

2) **Collectors + Connector Accounts (real ops)**  
   - Connector accounts are managed per-tenant/provider (credential storage + status)  
   - Collectors service supports pluggable providers and scheduled ingestion  
   - Real HTTP client code paths exist for Google Ads & Meta Marketing (safe default is DRY_RUN)

3) **Journey Engine Improvements**  
   - Journeys can trigger on events and segments  
   - Enrollment re-entry protection (reentry_key unique)  
   - Branching via rules in journey definition JSON  
   - Idempotent action emission (per enrollment + step)

See: `quickstart/v285_demo.sh`.
