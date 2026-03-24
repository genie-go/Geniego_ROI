import fetch from "node-fetch";

function arg(name: string, def?: string) {
  const idx = process.argv.findIndex(a => a === `--${name}`);
  if (idx >= 0 && process.argv[idx+1]) return process.argv[idx+1];
  return def;
}

const tenant = arg("tenant");
const apiKey = arg("apiKey");
const provider = arg("provider");
const displayName = arg("displayName", provider);
const scopes = arg("scopes", "");

const base = process.env.GATEWAY_BASE || "http://localhost:8080";
if (!tenant || !apiKey || !provider) {
  console.error("Usage: npm run sdk:publish -- --tenant=<TENANT> --apiKey=<KEY> --provider=my_provider --displayName="My Provider" --scopes="ads.read"");
  process.exit(1);
}

async function api(path: string, method="GET", body?: any) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type":"application/json",
      "X-Tenant-ID": tenant,
      "X-API-Key": apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
}

(async ()=>{
  // Create a connector registry draft (reference)
  const r = await api("/v1/marketplace/connectors/register", "POST", {
    provider, display_name: displayName, scopes
  });
  console.log("Registered connector draft:", r);
})();
