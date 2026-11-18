import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listDiscussions } from '../api'
import { useAuth } from '../auth'
import DiscussionCard from '../components/DiscussionCard'

function DiscussionList() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const tag = params.get('tag')
  const q = params.get('q')

  // 태그/검색어/로그인 사용자가 바뀌면 다시 불러온다 (로그인하면 내 좋아요 표시)
  const key = `${tag}|${q}|${user?.id}`
  // 어떤 조건(key)으로 불러온 결과인지 함께 저장 → key 가 다르면 "불러오는 중"
  const [result, setResult] = useState({ key: null, items: null, error: '' })

  useEffect(() => {
    let alive = true
    listDiscussions({ tag, q })
      .then((data) => alive && setResult({ key, items: data, error: '' }))
      .catch((err) => alive && setResult({ key, items: null, error: err.message }))
    return () => { alive = false }
  }, [key, tag, q])

  const loading = result.key !== key
  const items = loading ? null : result.items
  const error = loading ? '' : result.error

  // 카드에서 좋아요가 바뀌면 목록에도 반영
  const updateItem = (updated) => {
    setResult((r) => ({ ...r, items: r.items.map((d) => (d.id === updated.id ? updated : d)) }))
  }

  return (
    <div className="container list-page">
      <h1 className="page-title">토론</h1>

      {(tag || q) && (
        <div className="filter-bar">
          {tag && <span>태그 <strong>#{tag}</strong></span>}
          {q && <span>검색어 <strong>“{q}”</strong></span>}
          <Link to="/discussions" className="filter-clear">전체 보기 ✕</Link>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {!error && items === null && <p className="muted center">불러오는 중...</p>}

      {items?.length === 0 && (
        <div className="empty">
          <p>{tag || q ? '조건에 맞는 토론이 없습니다.' : '아직 토론이 없습니다.'}</p>
          <Link to="/discussions/new" className="write-btn">첫 토론 시작하기</Link>
        </div>
      )}

      {items?.length > 0 && (
        <div className="d-grid">
          {items.map((d) => (
            <DiscussionCard key={d.id} discussion={d} onChange={updateItem} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DiscussionList
