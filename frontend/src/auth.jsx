import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from './api'

// 소셜 로그인 후 백엔드가 보내준 #access_token=... 또는 #error=... 를 읽는다
function readHash() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('access_token')
  const error = params.get('error')
  if (token || error) {
    // 주소창에서 토큰 지우기
    window.history.replaceState(null, '', window.location.pathname)
  }
  if (token) localStorage.setItem('token', token)
  return error
}

// 앱이 처음 로드될 때 한 번만 실행
export const socialError = readHash()

const AuthContext = createContext(null)

// 로그인 상태를 앱 전체에서 공유
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 저장된 토큰이 있으면 /me 확인이 끝날 때까지 "확인 중"
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

  const login = (token, me) => {
    localStorage.setItem('token', token)
    setUser(me)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
