import { Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import LikeButton from './LikeButton'
import TagChip from './TagChip'
import { CommentIcon } from './Icons'
import { displayName, timeAgo } from '../utils'

function DiscussionCard({ discussion, onChange }) {
  const navigate = useNavigate()
  const d = discussion
  const url = `/discussions/${d.id}`

  return (
    <article className="d-card" onClick={() => navigate(url)}>
      <header className="d-author">
        <Avatar author={d.author} />
        <div className="d-author-text">
          <strong>{displayName(d.author)}</strong>
          <span>{timeAgo(d.created_at)}</span>
        </div>
      </header>

      <div className="d-body">
        <div className="d-text">
          <h3 className="d-title">
            <Link to={url} onClick={(e) => e.stopPropagation()}>{d.title}</Link>
          </h3>
          <p className="d-excerpt">{d.content}</p>
        </div>
        {d.image_url && (
          <img className="d-thumb" src={d.image_url} alt="" loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>

      <footer className="d-footer">
        <div className="d-stats">
          {d.comment_count > 0 && (
            <span className="comment-count" aria-label={`댓글 ${d.comment_count}개`}>
              <CommentIcon />
              {d.comment_count}
            </span>
          )}
          <LikeButton discussion={d} onChange={onChange} />
        </div>
        <div className="d-tags">
          {d.tags.map((tag) => <TagChip key={tag} tag={tag} />)}
        </div>
      </footer>
    </article>
  )
}

export default DiscussionCard
