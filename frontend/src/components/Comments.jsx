import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createComment, deleteComment, listComments, updateComment } from '../api'
import { useAuth } from '../auth'
import { displayName, timeAgo } from '../utils'
import Avatar from './Avatar'

// 댓글 하나 (작성자면 수정/삭제 가능)
function CommentItem({ comment, isOwner, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.content)
  const [busy, setBusy] = useState(false)
  const edited = new Date(comment.updated_at) - new Date(comment.created_at) > 1000

  const handleSave = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      onUpdated(await updateComment(comment.id, text))
      setEditing(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제할까요?')) return
    setBusy(true)
    try {
      await deleteComment(comment.id)
      onDeleted(comment.id)
    } catch (err) {
      alert(err.message)
      setBusy(false)
    }
  }

  return (
    <li className="comment">
      <Avatar author={comment.author} size={36} />
      <div className="comment-main">
        <div className="comment-meta">
          <strong>{displayName(comment.author)}</strong>
          <span>{timeAgo(comment.created_at)}{edited && ' · 수정됨'}</span>
        </div>

        {editing ? (
          <div className="comment-edit">
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              rows={3} maxLength={2000} autoFocus aria-label="댓글 수정" />
            <div className="comment-actions">
              <button className="text-btn" onClick={() => { setEditing(false); setText(comment.content) }}
                disabled={busy}>취소</button>
              <button className="text-btn primary" onClick={handleSave}
                disabled={busy || !text.trim()}>저장</button>
            </div>
          </div>
        ) : (
          <p className="comment-content">{comment.content}</p>
        )}

        {isOwner && !editing && (
          <div className="comment-actions">
            <button className="text-btn" onClick={() => setEditing(true)} disabled={busy}>수정</button>
            <button className="text-btn danger" onClick={handleDelete} disabled={busy}>삭제</button>
          </div>
        )}
      </div>
    </li>
  )
}

// 댓글 목록 + 작성 폼. 댓글 수가 바뀌면 onCountChange 로 알림
function Comments({ discussionId, onCountChange }) {
  const { user } = useAuth()
  const location = useLocation()
  const [comments, setComments] = useState(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let alive = true
    listComments(discussionId)
      .then((data) => alive && setComments(data))
      .catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [discussionId])

  const update = (next) => {
    setComments(next)
    onCountChange?.(next.length)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    try {
      const created = await createComment(discussionId, text)
      update([...comments, created])
      setText('')
    } catch (err) {
      alert(err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <section className="comments">
      <h2 className="comments-title">
        댓글 <span>{comments?.length ?? ''}</span>
      </h2>

      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="의견을 남겨주세요"
            rows={3}
            maxLength={2000}
            aria-label="댓글 작성"
          />
          <div className="comment-form-footer">
            <span className="muted">{text.length} / 2000</span>
            <button className="btn" type="submit" disabled={posting || !text.trim()}>
              {posting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login">
          <Link to="/login" state={{ from: location.pathname }}>로그인</Link>하고 의견을 남겨보세요.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {!error && comments === null && <p className="muted">댓글 불러오는 중...</p>}
      {comments?.length === 0 && <p className="muted comment-empty">첫 댓글을 남겨보세요.</p>}

      {comments?.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isOwner={user?.id === c.author?.id}
              onUpdated={(u) => update(comments.map((x) => (x.id === u.id ? u : x)))}
              onDeleted={(cid) => update(comments.filter((x) => x.id !== cid))}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default Comments
