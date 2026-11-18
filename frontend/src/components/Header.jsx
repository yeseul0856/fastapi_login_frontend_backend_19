import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { displayName } from '../utils'
import { SearchIcon } from './Icons'

const TOP_TABS = ['열린 광장', '아지트', '내 피드']
// 지금은 '토론'만 동작. 나머지는 자리만 표시
const CATEGORIES = ['투데이', '시민질문', '뉴스', '소식', '캠페인', '투표', '토론', '팩트체크', '모임', '공익데이터']

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [keyword, setKeyword] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    const q = keyword.trim()
    navigate(q ? `/discussions?q=${encodeURIComponent(q)}` : '/discussions')
    setSearchOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/discussions')
  }

  return (
    <header className="site-header">
      {/* 파란 상단 바 */}
      <div className="topbar">
        <div className="container topbar-inner">
          <Link to="/discussions" className="brand">토론마당</Link>

          <nav className="top-tabs">
            {TOP_TABS.map((label, i) => (
              <span key={label} className={`top-tab ${i === 0 ? 'active' : ''}`}>{label}</span>
            ))}
          </nav>

          <div className="topbar-actions">
            {searchOpen ? (
              <form className="search-form" onSubmit={handleSearch}>
                <input
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onBlur={() => !keyword && setSearchOpen(false)}
                  placeholder="토론 검색"
                  aria-label="토론 검색"
                />
              </form>
            ) : (
              <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="검색">
                <SearchIcon />
              </button>
            )}

            {user ? (
              <>
                <Link to="/me" className="user-name">{displayName(user)}</Link>
                <button className="pill-btn" onClick={handleLogout}>로그아웃</button>
              </>
            ) : (
              <Link to="/login" state={{ from: location.pathname + location.search }} className="pill-btn">
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 흰 카테고리 바 */}
      <div className="container subnav">
        <nav className="categories">
          {CATEGORIES.map((label) =>
            label === '토론' ? (
              <NavLink key={label} to="/discussions" className="category active">{label}</NavLink>
            ) : (
              <span key={label} className="category">{label}</span>
            )
          )}
        </nav>
        <Link to="/discussions/new" className="write-btn">새 콘텐츠 작성</Link>
      </div>
    </header>
  )
}

export default Header
