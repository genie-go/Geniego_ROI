import time, uuid
from fastapi import Request
from prometheus_client import Counter, Histogram

REQS = Counter("genie_http_requests_total", "HTTP requests", ["method","path","status"])
LAT = Histogram("genie_http_request_latency_seconds", "Request latency", ["path"])
AUTO = Counter("genie_autopilot_runs_total", "Autopilot runs", ["tenant"])
DLQ = Counter("genie_kafka_dlq_total", "DLQ publishes", ["tenant","kind"])
EXEC = Counter("genie_budget_exec_total", "Budget executions", ["tenant","provider","mode","status"])
TOKEN = Counter("genie_token_rotate_total", "Token rotations", ["tenant","provider","result"])

async def metrics_middleware(request: Request, call_next):
    start = time.time()
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    dt = time.time() - start
    path = request.url.path
    LAT.labels(path=path).observe(dt)
    REQS.labels(method=request.method, path=path, status=str(response.status_code)).inc()
    response.headers["X-Request-ID"] = rid
    return response
