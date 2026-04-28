
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.post('http://localhost:8080/v1/commerce/orders/sync', JSON.stringify({provider:'coupang'}), {
    headers: {'Content-Type': 'application/json'},
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
