
# V307 Benchmark Framework

This document defines how customers should measure performance.

## Sample Load Test Targets

Orders: 10,000/min simulated
Concurrent campaigns: 5,000
Inventory sync under 45 sec
Ad decision under 3 minutes

## Measurement Strategy

- Locust / k6 test harness
- Synthetic API mock servers
- Result export to CSV
- SLA calculation

⚠ No fabricated real client data included.
