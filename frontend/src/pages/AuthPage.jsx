import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { socialError, useAuth } from '../auth'
import Login from './Login'
import Signup from './Signup'

const TABS = [
  { key: 'login', label: '로그인' },
  { key: 'signup', label: '회원가입' },
]

// 로그인 / 회원가입 탭 페이지
function AuthPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // 로그인 후 돌아갈 곳 (글쓰기 누르다 왔으면 글쓰기로)
  const from = location.state?.from || '/discussions'

  const [tab, setTab] = useState('login')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState(socialError ? '소셜 로그인에 실패했습니다.' : '')

  if (user) return <Navigate to={from} replace />

  const changeTab = (key) => {
    setTab(key)
    setNotice('')
    setError('')
  }

  const handleSignupSuccess = (newUser) => {
    setTab('login')
    setNotice(`${newUser.email} 가입 완료! 로그인해주세요.`)
  }

  const handleLogin = (token, me) => {
    login(token, me)
    navigate(from, { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="card">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => changeTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {notice && <p className="notice">{notice}</p>}
        {error && <p className="error">{error}</p>}

        {tab === 'login' ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Signup onSuccess={handleSignupSuccess} />
        )}
      </div>
    </div>
  )
}

export default AuthPage
