/**
 * useSecurityMonitor.js
 * Shared enterprise security hook — XSS/SQLi detection, rate limiting, lockdown.
 * Used by: DataTrustDashboard, ApiKeys (IntegrationHub), PixelTracking
 */
import { useState, useCallback, useRef } from 'react';
import { useNotification } from '../context/NotificationContext.jsx';

const SEC_PATTERNS = [
  /<script/i, /javascript:/i, /on(error|load|click|mouse)=/i,
  /eval\s*\(/i, /document\.(cookie|write)/i, /\\x[0-9a-f]{2}/i,
  /union\s+(all\s+)?select/i, /drop\s+table/i, /;\s*delete\s+from/i,
  /'\s*or\s+'1/i, /--\s*$/m, /\/\*.*\*\//s,
];
const RATE_CFG = { max: 30, windowMs: 10000, lockMs: 30000 };

export default function useSecurityMonitor(module = 'system') {
  const { pushNotification } = useNotification();
  const [threats, setThreats] = useState([]);
  const [locked, setLocked] = useState(false);
  const reqRef = useRef({ count: 0, start: Date.now() });

  const checkInput = useCallback((value, source = 'input') => {
    if (!value || typeof value !== 'string') return false;
    for (const pat of SEC_PATTERNS) {
      if (pat.test(value)) {
        const entry = { id: Date.now(), type: 'injection', module, source, value: value.slice(0, 60), time: new Date().toISOString() };
        setThreats(p => [...p.slice(-49), entry]);
        pushNotification({ type: 'alert', title: '🛡️ Security Alert', body: `[${module}] Blocked: ${source}`, link: `/${module === 'dt' ? 'data-trust' : 'integration-hub'}` });
        return true;
      }
    }
    return false;
  }, [pushNotification, module]);

  const checkRate = useCallback(() => {
    const now = Date.now(), ref = reqRef.current;
    if (now - ref.start > RATE_CFG.windowMs) { ref.count = 1; ref.start = now; return false; }
    ref.count++;
    if (ref.count > RATE_CFG.max) {
      setLocked(true);
      pushNotification({ type: 'alert', title: '🛡️ Rate Limit', body: `[${module}] Too many requests`, link: `/${module === 'dt' ? 'data-trust' : 'integration-hub'}` });
      setTimeout(() => setLocked(false), RATE_CFG.lockMs);
      return true;
    }
    return false;
  }, [pushNotification, module]);

  return { checkInput, checkRate, threats, locked };
}
