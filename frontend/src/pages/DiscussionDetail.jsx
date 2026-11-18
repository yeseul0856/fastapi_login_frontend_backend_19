import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDiscussion, getDiscussion } from '../api'
import { useAuth } from '../auth'
import Avatar from '../components/Avatar'
import LikeButton from '../components/LikeButton'
import TagChip from '../components/TagChip'
import Comments from '../components/Comments'
import { displayName, timeAgo } from '../utils'

function DiscussionDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let alive = true
    getDiscussion(id)
      .then((data) => alive && setD(data))
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [id, user])

  const handleDelete = async () => {
    if (!confirm('이 토론을 삭제할까요? 삭제하면 되돌릴 수 없습니다.')) return
    setDeleting(true)
    try {
      await deleteDiscussion(id)
      navigate('/discussions', { replace: true })
    } catch (err) {
      alert(err.message)
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="container narrow">
        <p className="error">{error}</p>
        <Link to="/discussions" className="back-link">← 목록으로</Link>
      </div>
    )
  }
  if (!d) return <div className="container narrow"><p className="muted center">불러오는 중...</p></div>

  const isOwner = user && d.author?.id === user.id
  const edited = new Date(d.updated_at) - new Date(d.created_at) > 1000

  return (
    <div className="container narrow">
      <Link to="/discussions" className="back-link">← 토론 목록</Link>

      <article className="detail">
        <header className="d-author">
          <Avatar author={d.author} size={48} />
          <div className="d-author-text">
            <strong>{displayName(d.author)}</strong>
            <span>{timeAgo(d.created_at)}{edited && ' · 수정됨'}</span>
          </div>
        </header>

        <h1 className="detail-title">{d.title}</h1>

        {d.image_url && <img className="detail-image" src={d.image_url} alt="" />}

        <div className="detail-content">{d.content}</div>

        <footer className="d-footer">
          <LikeButton discussion={d} onChange={setD} />
          <div className="d-tags">
            {d.tags.map((tag) => <TagChip key={tag} tag={tag} />)}
          </div>
        </footer>

        {isOwner && (
          <div className="owner-actions">
            <Link to={`/discussions/${d.id}/edit`} className="btn-outline">수정</Link>
            <button className="btn-outline danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        )}
      </article>

      <Comments
        discussionId={d.id}
        onCountChange={(n) => setD((prev) => ({ ...prev, comment_count: n }))}
      />
    </div>
  )
}

export default DiscussionDetail
