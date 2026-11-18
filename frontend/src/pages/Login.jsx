import { useState } from 'react'
import { login, getMe } from '../api'
import SocialLogin from '../components/SocialLogin'

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // 1) 로그인해서 토큰 받기  2) 토큰으로 내 정보(/me) 가져오기
      const { access_token } = await login(form)
      const me = await getMe(access_token)
      onLogin(access_token, me)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="muted">이메일과 비밀번호로 로그인하세요.</p>

      <label>
        이메일
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label>
        비밀번호
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button className="btn" type="submit" disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </button>

      <SocialLogin />
    </form>
  )
}

export default Login
