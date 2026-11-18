import { displayName } from '../utils'

const COLORS = ['#9b7be8', '#5b8def', '#2fb3a3', '#f08a5d', '#e86a92', '#7c8db5']

// 프로필 사진이 없으므로 이름 첫 글자 + 사용자별 고정 색상
function Avatar({ author, size = 44 }) {
  const name = displayName(author)
  const seed = [...(author?.id || '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: COLORS[seed % COLORS.length] }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  )
}

export default Avatar
