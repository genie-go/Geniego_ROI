from prometheus_client import Counter, Histogram

REQUESTS = Counter("genie_requests_total", "Total requests", ["path","method","status"])
LATENCY = Histogram("genie_request_latency_seconds", "Request latency", ["path"])
