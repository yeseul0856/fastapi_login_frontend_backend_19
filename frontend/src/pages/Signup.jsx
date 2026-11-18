import { useState } from 'react'
import { signup } from '../api'
import SocialLogin from '../components/SocialLogin'

const initialForm = { username: '', email: '', password: '', passwordConfirm: '' }

function Signup({ onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 비밀번호 확인칸에 입력이 있을 때만 실시간으로 일치 여부 표시
  const showMatch = form.passwordConfirm.length > 0
  const isMatch = form.password === form.passwordConfirm

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const user = await signup({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      setForm(initialForm)
      onSuccess(user) // 부모(App)에게 알려서 로그인 탭으로 이동
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="muted">이메일로 새 계정을 만드세요.</p>

      <label>
        닉네임 <span className="optional">(선택)</span>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="홍길동"
          autoComplete="nickname"
        />
      </label>

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
          placeholder="6자 이상"
          autoComplete="new-password"
          required
        />
      </label>

      <label>
        비밀번호 확인
        <input
          type="password"
          name="passwordConfirm"
          value={form.passwordConfirm}
          onChange={handleChange}
          autoComplete="new-password"
          className={showMatch ? (isMatch ? 'input-ok' : 'input-bad') : ''}
          aria-describedby="password-match"
          required
        />
        {showMatch && (
          <span
            id="password-match"
            className={`field-msg ${isMatch ? 'ok' : 'bad'}`}
            aria-live="polite"
          >
            {isMatch ? '✓ 비밀번호가 일치합니다.' : '✗ 비밀번호가 일치하지 않습니다.'}
          </span>
        )}
      </label>

      {error && <p className="error">{error}</p>}

      <button className="btn" type="submit" disabled={loading}>
        {loading ? '가입 중...' : '가입하기'}
      </button>

      <SocialLogin />
    </form>
  )
}

export default Signup
