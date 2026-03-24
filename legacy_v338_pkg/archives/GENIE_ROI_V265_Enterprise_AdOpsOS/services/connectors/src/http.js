function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function fetchJson(url, opts = {}, retry = {}) {
  const {
    retries = 4,
    minDelayMs = 250,
    maxDelayMs = 4000,
    retryOn = (status) => status === 429 || (status >= 500 && status <= 599),
  } = retry;

  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch(_) { data = { raw_text: text }; }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        err.body = data;
        if (attempt < retries && retryOn(res.status)) {
          const base = Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt));
          const jitter = Math.floor(Math.random()*150);
          await sleep(base + jitter);
          attempt++;
          continue;
        }
        throw err;
      }
      return { status: res.status, data, headers: Object.fromEntries(res.headers.entries()) };
    } catch (e) {
      lastErr = e;
      // network / parsing errors: retry
      if (attempt < retries) {
        const base = Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random()*150);
        await sleep(base + jitter);
        attempt++;
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error("fetchJson failed");
}

module.exports = { fetchJson };
