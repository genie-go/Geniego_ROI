import express from "express";
import fetch from "node-fetch";

const app = express();
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

app.get("/", async (req, res) => {
  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <title>GENIE V244 SaaS</title>
  </head>
  <body class="bg-gray-50">
    <div class="max-w-5xl mx-auto p-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">GENIE AdOps OS — V244</h1>
        <a class="text-sm text-blue-600 underline" href="${BACKEND_URL}/docs">API Docs</a>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div class="bg-white rounded-2xl shadow p-4">
          <div class="font-semibold">Backend health</div>
          <div class="text-sm text-gray-600 mt-2">Backend URL: <span class="font-mono">${BACKEND_URL}</span></div>
          <div class="text-sm text-gray-600 mt-2">Tip: Use headers <span class="font-mono">X-Tenant-Id</span>, <span class="font-mono">X-Role</span></div>
        </div>
        <div class="bg-white rounded-2xl shadow p-4">
          <div class="font-semibold">Go to Dashboard</div>
          <div class="text-sm text-gray-600 mt-2">ZIP-friendly UI on backend:</div>
          <a class="inline-block mt-3 px-4 py-2 rounded-xl bg-black text-white" href="${BACKEND_URL}/dashboard">Open Dashboard</a>
        </div>
      </div>
    </div>
  </body>
  </html>`;
  res.status(200).send(html);
});

app.listen(3000, () => console.log("Frontend running on :3000"));
