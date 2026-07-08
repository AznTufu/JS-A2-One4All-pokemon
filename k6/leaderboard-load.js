import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    leaderboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '90s', target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
  cloud: {
    projectID: __ENV.K6_PROJECT_ID,
    name: 'poke-bicrave /api/leaderboard',
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const res = http.get(`${BASE_URL}/api/leaderboard`, {
    headers: { 'Accept-Encoding': 'gzip' },
    tags: { endpoint: 'leaderboard' },
  })
  check(res, {
    'status 200': (r) => r.status === 200,
    'a des records': (r) => {
      try { return JSON.parse(r.body).records.length > 0 } catch { return false }
    },
  })
  sleep(1)
}
