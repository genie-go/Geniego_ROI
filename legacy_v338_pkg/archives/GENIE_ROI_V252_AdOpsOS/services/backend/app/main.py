from __future__ import annotations
from fastapi import FastAPI
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.api.v244 import router as v244_router
from app.api.v245 import router as v245_router
from app.api.dashboard import router as dashboard_router

app = FastAPI(title="GENIE ROI AdOps OS", version="V245 (SaaS-ready + Multi-channel execution)")
app.include_router(v244_router)
app.include_router(v245_router)
app.include_router(dashboard_router)

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/")
def root():
    return {"name": "GENIE ROI AdOps OS", "version": "V245"}


from app.api.v248 import router as v248_router
app.include_router(v248_router)


from app.api.v249 import router as v249_router
app.include_router(v249_router)


from app.api.v250 import router as v250_router
app.include_router(v250_router)


from app.api.v251 import router as v251_router
app.include_router(v251_router)


from app.api.v252 import router as v252_router
app.include_router(v252_router)
