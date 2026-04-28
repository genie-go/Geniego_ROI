from fastapi import FastAPI
import os

app = FastAPI(title="GENIE ROI AdOps OS", version="V243")

try:
    from api.v242_routes import router as v242_router
    app.include_router(v242_router)
except:
    pass

try:
    from api.v243_routes import router as v243_router
    app.include_router(v243_router)
except:
    pass

@app.get("/")
def root():
    return {"version": "V243", "mode": os.getenv("AUTH_MODE", "stub")}
