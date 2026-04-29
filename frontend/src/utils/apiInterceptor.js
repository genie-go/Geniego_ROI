/**
 * Enterprise API Interceptor
 * ============================
 * - Automatic retry with exponential backoff
 * - Request/response logging
 * - Demo environment guard
 * - Token injection
 * - Error normalization
 */

const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,       // ms
  backoffMultiplier: 2,
  timeout: 30000,          // 30s
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

/**
 * Enterprise fetch wrapper with retry, timeout, and logging
 */
export async function apiFetch(url, options = {}, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let lastError = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      const token = localStorage.getItem(_isDemo ? 'geniego_demo_token' : 'genie_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
        'X-Request-ID': `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        'X-Client-Env': _isDemo ? 'demo' : 'production',
      };

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok && cfg.retryOnStatus.includes(res.status) && attempt < cfg.maxRetries) {
        const delay = cfg.retryDelay * Math.pow(cfg.backoffMultiplier, attempt);
        console.warn(`[API] Retry ${attempt + 1}/${cfg.maxRetries} for ${url} (status ${res.status}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') {
        console.error(`[API] Request timeout: ${url} (${cfg.timeout}ms)`);
        if (attempt < cfg.maxRetries) {
          const delay = cfg.retryDelay * Math.pow(cfg.backoffMultiplier, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      if (attempt < cfg.maxRetries) {
        const delay = cfg.retryDelay * Math.pow(cfg.backoffMultiplier, attempt);
        console.warn(`[API] Retry ${attempt + 1}/${cfg.maxRetries} for ${url} (${err.message}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error(`API request failed after ${cfg.maxRetries} retries: ${url}`);
}

/**
 * Normalized error handler
 */
export function normalizeApiError(error) {
  if (error?.name === 'AbortError') {
    return { code: 'TIMEOUT', message: 'Request timed out. Please try again.' };
  }
  if (!navigator.onLine) {
    return { code: 'OFFLINE', message: 'No internet connection. Please check your network.' };
  }
  if (error?.status === 401) {
    return { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' };
  }
  if (error?.status === 403) {
    return { code: 'FORBIDDEN', message: 'Access denied. Insufficient permissions.' };
  }
  if (error?.status === 429) {
    return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' };
  }
  return {
    code: 'UNKNOWN',
    message: error?.message || 'An unexpected error occurred.',
  };
}

export default { apiFetch, normalizeApiError };
