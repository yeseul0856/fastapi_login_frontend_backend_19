// FastAPI 호출 모음 (vite.config.js 의 proxy 를 통해 /api → http://127.0.0.1:8000)
const API = '/api'

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // FastAPI 는 에러를 { detail: ... } 형태로 돌려준다
    const detail = data?.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : detail || `요청 실패 (${res.status})`
    throw new Error(message)
  }
  return data
}

// POST /signup  body: EmailForm { username, email, password }
// 응답: { id, email, username }
export function signup({ username, email, password }) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}

// POST /login  body: EmailForm { email, password }
// 응답: { access_token }
export function login({ email, password }) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// GET /me  헤더: Authorization: Bearer <access_token>
// 응답: { id, username, email, provider }
export function getMe(token) {
  return request('/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
