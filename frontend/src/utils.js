// 작성자 이름 (닉네임이 없으면 가입 경로로 대체)
export function displayName(author) {
  if (!author) return '알 수 없음'
  if (author.username) return author.username
  if (author.provider === 'kakao') return '카카오 사용자'
  if (author.provider === 'google') return '구글 사용자'
  return '익명'
}

// "방금 전", "3분 전", "2시간 전", "5일 전", 그 이상은 날짜
export function timeAgo(value) {
  const date = new Date(value)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return date.toLocaleDateString('ko-KR')
}

// "AI, 인공지능 ,  정책" → ["AI", "인공지능", "정책"]
export function parseTags(text) {
  return text
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
}
