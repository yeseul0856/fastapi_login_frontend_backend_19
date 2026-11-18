import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Avatar from '../components/Avatar'
import { displayName } from '../utils'

// 내 정보 (/me)
function Profile() {
  const { user, checking, logout } = useAuth()
  const navigate = useNavigate()

  if (checking) return <div className="auth-page"><p className="muted">불러오는 중...</p></div>
  if (!user) return <Navigate to="/login" replace state={{ from: '/me' }} />

  const handleLogout = () => {
    logout()
    navigate('/discussions')
  }

  return (
    <div className="auth-page">
      <div className="card form">
        <div className="d-author">
          <Avatar author={user} size={56} />
          <h2>안녕하세요, {displayName(user)}님 👋</h2>
        </div>
        <dl className="result">
          <dt>이메일</dt>
          <dd>{user.email || '-'}</dd>
          <dt>닉네임</dt>
          <dd>{user.username || '-'}</dd>
          <dt>가입경로</dt>
          <dd>{user.provider}</dd>
        </dl>
        <button className="btn secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

export default Profile
