import { Link } from 'react-router-dom'

// 파란 테두리 태그. 누르면 해당 태그로 목록 필터
function TagChip({ tag }) {
  return (
    <Link
      to={`/discussions?tag=${encodeURIComponent(tag)}`}
      className="tag-chip"
      onClick={(e) => e.stopPropagation()}
    >
      {tag}
    </Link>
  )
}

export default TagChip
