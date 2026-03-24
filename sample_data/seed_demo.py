import requests, os, secrets
API = os.getenv("API_URL", "http://localhost:8000")

def post(path, json=None, token=None):
    headers={}
    if token: headers["Authorization"]=f"Bearer {token}"
    r=requests.post(API+path, json=json, headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    try:
        post("/auth/register", {"email":"demo@genie.ai","password":"demo1234","role":"AGENCY","tenant_name":"Demo Workspace"})
    except Exception:
        pass
    tok = post("/auth/login", {"email":"demo@genie.ai","password":"demo1234"})["access_token"]
    print("Login OK.")
    idem = secrets.token_hex(16)
    payload = {
        "source":"META",
        "idempotency_key": idem,
        "from_campaign_id":"REPLACE_FROM_ID",
        "to_campaign_id":"REPLACE_TO_ID",
        "delta_daily_budget": 1000
    }
    r = post("/actions/propose_budget_shift", payload, token=tok)
    print("Created approval:", r)
if __name__=="__main__":
    main()
