from __future__ import annotations
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/dashboard", response_class=HTMLResponse, tags=["ui"])
def dashboard():
    # Lightweight UX that works in ZIP and docker; production can replace with real SPA.
    html = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>GENIE V244 Dashboard</title>
</head>
<body class="bg-gray-50">
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">GENIE ROI AdOps OS — V244</h1>
      <div class="text-sm text-gray-600">UI (ZIP friendly) • /v244 APIs</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="font-semibold">Connectors</div>
        <div class="text-sm text-gray-600 mt-1">Google / Meta / TikTok / Naver / Kakao</div>
        <code class="text-xs block mt-3 bg-gray-100 p-2 rounded">GET /v244/connectors</code>
      </div>
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="font-semibold">Campaigns</div>
        <div class="text-sm text-gray-600 mt-1">List campaigns by channel</div>
        <code class="text-xs block mt-3 bg-gray-100 p-2 rounded">GET /v244/campaigns/{channel}/{account_id}</code>
      </div>
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="font-semibold">AI</div>
        <div class="text-sm text-gray-600 mt-1">ROAS anomaly + budget optimizer</div>
        <code class="text-xs block mt-3 bg-gray-100 p-2 rounded">POST /v244/ai/anomaly/roas</code>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow p-4 mt-6">
      <div class="font-semibold mb-2">How to try quickly</div>
      <ol class="list-decimal pl-6 text-sm text-gray-700 space-y-1">
        <li>Run backend: <span class="font-mono">docker compose -f deploy/docker-compose.yml up --build</span></li>
        <li>Open this page: <span class="font-mono">/dashboard</span></li>
        <li>Use Swagger: <span class="font-mono">/docs</span></li>
        <li>Headers: <span class="font-mono">X-Tenant-Id</span>, <span class="font-mono">X-Role</span></li>
      </ol>
    </div>
  </div>
</body>
</html>
"""
    return HTMLResponse(html)
