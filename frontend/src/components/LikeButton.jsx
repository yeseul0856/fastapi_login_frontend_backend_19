import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toggleLike } from '../api'
import { useAuth } from '../auth'
import { ThumbIcon } from './Icons'

// 좋아요 토글 버튼. 결과는 onChange 로 부모에게 전달
function LikeButton({ discussion, onChange }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)

  const handleClick = async (e) => {
    e.stopPropagation() // 카드 클릭(상세 이동) 막기
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const result = await toggleLike(discussion.id)
      onChange({ ...discussion, ...result })
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`like-btn ${discussion.liked ? 'liked' : ''}`}
      onClick={handleClick}
      aria-pressed={discussion.liked}
      aria-label={`좋아요 ${discussion.like_count}개`}
    >
      <ThumbIcon />
      {discussion.like_count}
    </button>
  )
}

export default LikeButton
