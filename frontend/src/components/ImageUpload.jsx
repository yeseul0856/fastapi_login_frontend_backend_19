import { useRef, useState } from 'react'
import { uploadImage } from '../api'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB (백엔드와 동일)

// 대표 이미지: 파일 업로드(Supabase Storage) 또는 주소 직접 입력
function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [broken, setBroken] = useState(false) // 미리보기 로드 실패

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    // 서버에 보내기 전에 먼저 검사
    if (!ACCEPT.includes(file.type)) {
      setError('JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('이미지는 5MB 이하만 올릴 수 있습니다.')
      return
    }
    setUploading(true)
    try {
      const { url } = await uploadImage(file)
      setBroken(false)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = '' // 같은 파일 다시 선택 가능하게
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div className="image-upload">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value && !broken ? (
        // 미리보기 + 변경/삭제
        <div className="upload-preview">
          <img src={value} alt="대표 이미지 미리보기" onError={() => setBroken(true)} />
          <div className="upload-preview-actions">
            <button type="button" className="btn-outline" onClick={openPicker} disabled={uploading}>
              {uploading ? '업로드 중...' : '이미지 변경'}
            </button>
            <button type="button" className="btn-outline danger"
              onClick={() => { onChange(''); setError('') }} disabled={uploading}>
              삭제
            </button>
          </div>
        </div>
      ) : (
        // 업로드 영역 (클릭 또는 끌어다 놓기)
        <button
          type="button"
          className={`dropzone ${dragOver ? 'over' : ''}`}
          onClick={openPicker}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={uploading}
        >
          {uploading ? (
            <span>업로드 중...</span>
          ) : (
            <>
              <span className="dropzone-icon" aria-hidden="true">🖼️</span>
              <strong>클릭하거나 이미지를 끌어다 놓으세요</strong>
              <span className="muted">JPG, PNG, WEBP, GIF · 5MB 이하</span>
            </>
          )}
        </button>
      )}

      {value && broken && <p className="field-msg bad">이미지를 불러올 수 없습니다. 주소를 확인해주세요.</p>}
      {error && <p className="field-msg bad">{error}</p>}

      <details className="url-input" open={Boolean(value) && !value.includes('/storage/v1/object/public/')}>
        <summary>또는 이미지 주소 직접 입력</summary>
        <input
          type="url"
          value={value}
          onChange={(e) => { setBroken(false); onChange(e.target.value) }}
          placeholder="https://..."
          aria-label="이미지 주소"
        />
      </details>
    </div>
  )
}

export default ImageUpload
