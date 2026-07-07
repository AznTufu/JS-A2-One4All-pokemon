// Test de charge k6 sur la route publique /api/leaderboard (fonction énergivore identifiée).
// Local :    k6 run -e BASE_URL=http://localhost:3000 k6/leaderboard-load.js
// k6 Cloud : k6 cloud login --token $K6_CLOUD_TOKEN
//            k6 cloud run -e K6_PROJECT_ID=<id> k6/leaderboard-load.js
// Relancer EXACTEMENT le même script avant/après optimisation pour comparer.
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    leaderboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 }, // montée
        { duration: '90s', target: 50 }, // plateau 50 VUs
        { duration: '10s', target: 0 },  // descente
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // seuils SLO — échouent AVANT optimisation
    http_req_failed: ['rate<0.01'],                // < 1 % d'erreurs
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
  sleep(1) // pacing : ~50 req/s au plateau
}
