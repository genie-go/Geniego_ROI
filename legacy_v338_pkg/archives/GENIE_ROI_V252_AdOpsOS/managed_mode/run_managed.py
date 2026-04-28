
"""
V247 Managed SaaS Mode
Single-command deployment (no Kafka/Redis required for SMB tier)
"""

import uvicorn
from services.backend.app.main import app

if __name__ == "__main__":
    print("Starting GENIE V247 in Managed SaaS Mode...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
