import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import { getMe } from './api'
import './App.css'

const TABS = [
  { key: 'login', label: '로그인' },
  { key: 'signup', label: '회원가입' },
]

function App() {
  const [tab, setTab] = useState('login')
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => !!localStorage.getItem('token'))

  // 새로고침해도 로그인 유지: 저장된 토큰으로 /me 확인
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    getMe(token)
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setChecking(false))
  }, [])

  const changeTab = (key) => {
    setTab(key)
    setNotice('')
  }

  const handleSignupSuccess = (newUser) => {
    setTab('login')
    setNotice(`${newUser.email} 가입 완료! 로그인해주세요.`)
  }

  const handleLogin = (token, me) => {
    localStorage.setItem('token', token)
    setUser(me)
    setNotice('')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setTab('login')
  }

  if (checking) {
    return (
      <main className="page">
        <p className="muted">불러오는 중...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="card">
        {user ? (
          <Profile user={user} onLogout={handleLogout} />
        ) : (
          <>
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

            {tab === 'login' ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Signup onSuccess={handleSignupSuccess} />
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default App
