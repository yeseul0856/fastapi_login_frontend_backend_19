function Profile({ user, onLogout }) {
  return (
    <div className="form">
      <h2>안녕하세요, {user.username || user.email}님 👋</h2>
      <dl className="result">
        <dt>이메일</dt>
        <dd>{user.email}</dd>
        <dt>닉네임</dt>
        <dd>{user.username || '-'}</dd>
        <dt>가입경로</dt>
        <dd>{user.provider}</dd>
      </dl>
      <button className="btn secondary" onClick={onLogout}>
        로그아웃
      </button>
    </div>
  )
}

export default Profile
