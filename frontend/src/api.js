// FastAPI 호출 모음 (vite.config.js 의 proxy 를 통해 /api → http://127.0.0.1:8000)
const API = '/api'

// 로그인했다면 저장된 토큰을 Authorization 헤더로 자동 첨부
function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...options.headers },
  })
  if (res.status === 204) return null // 삭제 성공 등 본문 없는 응답

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // FastAPI 는 에러를 { detail: ... } 형태로 돌려준다 (422 는 배열)
    const detail = data?.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => String(d.msg).replace(/^Value error, /, '')).join(', ')
      : detail || `요청 실패 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }
  return data
}

// ---------- 회원 ----------

// POST /signup  body: { username, email, password } → { id, email, username }
export function signup({ username, email, password }) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}

// POST /login  body: { email, password } → { access_token }
export function login({ email, password }) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// GET /me → { id, username, email, provider }
export function getMe(token) {
  return request('/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ---------- 토론 CRUD ----------

// GET /discussions?tag=&q=
export function listDiscussions({ tag, q } = {}) {
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (q) params.set('q', q)
  const qs = params.toString()
  return request(`/discussions${qs ? `?${qs}` : ''}`)
}

// GET /discussions/{id}
export function getDiscussion(id) {
  return request(`/discussions/${id}`)
}

// POST /discussions  body: { title, content, tags, image_url }
export function createDiscussion(data) {
  return request('/discussions', { method: 'POST', body: JSON.stringify(data) })
}

// PUT /discussions/{id}
export function updateDiscussion(id, data) {
  return request(`/discussions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

// DELETE /discussions/{id}
export function deleteDiscussion(id) {
  return request(`/discussions/${id}`, { method: 'DELETE' })
}

// POST /discussions/{id}/like → { like_count, liked }
export function toggleLike(id) {
  return request(`/discussions/${id}/like`, { method: 'POST' })
}

// ---------- 이미지 업로드 (Supabase Storage) ----------

// POST /uploads/image  (multipart/form-data) → { url, path }
export async function uploadImage(file) {
  const body = new FormData()
  body.append('file', file)
  // FormData 는 Content-Type 을 브라우저가 직접 정하게 둬야 해서 request() 대신 fetch 사용
  const res = await fetch(`${API}/uploads/image`, { method: 'POST', headers: authHeader(), body })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail || `업로드 실패 (${res.status})`)
  return data
}

// ---------- 댓글 CRUD ----------

// GET /discussions/{id}/comments
export function listComments(discussionId) {
  return request(`/discussions/${discussionId}/comments`)
}

// POST /discussions/{id}/comments  body: { content }
export function createComment(discussionId, content) {
  return request(`/discussions/${discussionId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// PUT /comments/{id}  body: { content }
export function updateComment(commentId, content) {
  return request(`/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ content }) })
}

// DELETE /comments/{id}
export function deleteComment(commentId) {
  return request(`/comments/${commentId}`, { method: 'DELETE' })
}
