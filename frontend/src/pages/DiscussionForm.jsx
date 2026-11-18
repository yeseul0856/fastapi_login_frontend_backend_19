import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { createDiscussion, getDiscussion, updateDiscussion } from '../api'
import { useAuth } from '../auth'
import { parseTags } from '../utils'
import ImageUpload from '../components/ImageUpload'

const emptyForm = { title: '', content: '', tagsText: '', image_url: '' }

// 작성(/discussions/new)과 수정(/discussions/:id/edit) 겸용
function DiscussionForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user, checking } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 수정이면 기존 글 불러와서 채우기
  useEffect(() => {
    if (!isEdit || !user) return
    getDiscussion(id)
      .then((d) => {
        if (d.author?.id !== user.id) {
          setError('작성자만 수정할 수 있습니다.')
          return
        }
        setForm({
          title: d.title,
          content: d.content,
          tagsText: d.tags.join(', '),
          image_url: d.image_url || '',
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEdit, user])

  // 로그인 안 했으면 로그인 페이지로 (끝나면 다시 이 페이지로)
  if (checking) return <div className="container narrow"><p className="muted center">확인 중...</p></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const tags = parseTags(form.tagsText)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (tags.length > 5) {
      setError('태그는 최대 5개까지 입력할 수 있습니다.')
      return
    }
    setSaving(true)
    const data = {
      title: form.title,
      content: form.content,
      tags,
      image_url: form.image_url.trim() || null,
    }
    try {
      const saved = isEdit ? await updateDiscussion(id, data) : await createDiscussion(data)
      navigate(`/discussions/${saved.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return <div className="container narrow"><p className="muted center">불러오는 중...</p></div>

  return (
    <div className="container narrow">
      <Link to={isEdit ? `/discussions/${id}` : '/discussions'} className="back-link">← 취소</Link>

      <form className="editor" onSubmit={handleSubmit}>
        <h1 className="page-title">{isEdit ? '토론 수정' : '새 토론 작성'}</h1>

        <label>
          제목
          <input name="title" value={form.title} onChange={handleChange}
            maxLength={200} placeholder="토론 주제를 입력하세요" required />
        </label>

        <label>
          내용
          <textarea name="content" value={form.content} onChange={handleChange}
            rows={12} placeholder="함께 이야기하고 싶은 내용을 적어주세요" required />
        </label>

        <label>
          태그 <span className="optional">(쉼표로 구분, 최대 5개)</span>
          <input name="tagsText" value={form.tagsText} onChange={handleChange}
            placeholder="예: AI, 인공지능, 정책" />
        </label>
        {tags.length > 0 && (
          <div className="d-tags preview-tags">
            {tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        )}

        <div className="field">
          <span className="field-label">대표 이미지 <span className="optional">(선택)</span></span>
          <ImageUpload
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={saving}>
          {saving ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
        </button>
      </form>
    </div>
  )
}

export default DiscussionForm
