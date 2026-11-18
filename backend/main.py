from uuid import uuid4
import httpx
from fastapi import FastAPI, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import declarative_base, Session, relationship
from pydantic import Field, field_validator
# pydantic은 리액트에서 데이터를 요청을 받을때 웹브라우저에서 적어서 클릭을 하게 되면 그 데이터가 우리한테 오겠죠 그 
# 데이터 타입이 맞는지 검사하는 라이브러리
from pydantic import BaseModel
from supabase import create_client, ClientOptions
#fastapi안에 있는 security라는 모듈?
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# 주소를 만나면 다른 사이트로 바로 연결해준다 
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError

# 소셜 로그인이 끝나면 토큰을 들고 돌아갈 프론트엔드 주소
FRONTEND_URL = "http://localhost:5173"

DATABASE_URL = "postgresql://postgres.sjcqhzgjpoplxtqoqeyv:kWJUbef9Q0p74Aox@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

# 객체로 만든거
engine = create_engine(DATABASE_URL)

# 객체로 만든거
Base = declarative_base()

SUPABASE_URL = "https://sjcqhzgjpoplxtqoqeyv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3FoemdqcG9wbHh0cW9xZXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NzM3OTcsImV4cCI6MjExMDM0OTc5N30.96gDfKJCWtbUFmOf0y2VDbLbr5nYsP2HYinlJGt_Xes"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY, options=ClientOptions(flow_type="pkce"))

# 테이블 모델(테이블 이름을 users)
class Profile(Base):
    # users가 테이블 이름이다 
    __tablename__ = "profiles"
    id = Column(String(50), primary_key=True, index=True)
    # 닉네임은 선택 입력 (NULL 허용, NULL은 unique 중복 검사에서 제외됨)
    username = Column(String(50), unique=True, index=True, nullable=True)
    # 카카오 로그인은 이메일을 못 받아올 수 있으므로 NULL 허용
    email = Column(String(120), nullable=True)
    # 어디로 로그인했는지 provider: google이면 구글 로그인했다  
    provider = Column(String(50))

# 회원가입할때 받을것
class EmailForm(BaseModel):
    # username이 없어도 되겠금 빈값을 디폴트로 설정함, id를 email로 하겠습니다 
    username: str = ""
    email: str
    password: str

# 토론 게시글 테이블
class Discussion(Base):
    __tablename__ = "discussions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    # 작성자 (profiles.id), 회원이 지워지면 글도 같이 삭제
    author_id = Column(String(50), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    # 태그 여러 개를 배열로 저장 (예: ["AI", "인공지능"])
    tags = Column(ARRAY(String(30)), nullable=False, server_default="{}")
    # 카드 오른쪽 썸네일 이미지 (선택)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # discussion.author 로 작성자 Profile 을 바로 꺼낼 수 있게
    author = relationship(Profile)

# 좋아요 테이블 (한 사람이 한 글에 한 번만 → 두 컬럼을 합쳐서 기본키)
class DiscussionLike(Base):
    __tablename__ = "discussion_likes"
    discussion_id = Column(Integer, ForeignKey("discussions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(50), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# 댓글 테이블 (글이 지워지면 댓글도 같이 삭제)
class Comment(Base):
    __tablename__ = "discussion_comments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    discussion_id = Column(Integer, ForeignKey("discussions.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(50), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    author = relationship(Profile)

# 댓글 작성/수정 때 받을 데이터
class CommentForm(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("댓글 내용을 입력해주세요.")
        return v.strip()

# 토론 글 작성/수정 때 받을 데이터
class DiscussionForm(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tags: list[str] = []
    image_url: str | None = None

    @field_validator("title", "content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("빈 값은 입력할 수 없습니다.")
        return v.strip()

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: list[str]) -> list[str]:
        # 앞뒤 공백/# 제거, 빈 태그와 중복 제거, 최대 5개
        result = []
        for tag in v:
            tag = tag.strip().lstrip("#").strip()[:30]
            if tag and tag not in result:
                result.append(tag)
        return result[:5]

    @field_validator("image_url")
    @classmethod
    def clean_image_url(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        if not v:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("이미지 주소는 http:// 또는 https:// 로 시작해야 합니다.")
        return v

# 테이블이 없으면 생성, 모델에 정의한 테이블들을 데이터베이스에 생성해줘
Base.metadata.create_all(bind=engine)

# Supabase는 public 테이블을 anon 키로 REST API(PostgREST)에 그대로 노출한다.
# RLS를 켜 두면(정책 없음) 외부에서 anon 키로 직접 읽고/쓰는 것이 막히고,
# FastAPI는 postgres 계정으로 접속하므로 영향을 받지 않는다.
with engine.begin() as conn:
    for table in ("discussions", "discussion_likes", "discussion_comments"):
        conn.execute(text(f"alter table public.{table} enable row level security"))

# ---------------------------------------------------------------------
# Supabase Storage: 토론 대표 이미지 버킷
# ---------------------------------------------------------------------
IMAGE_BUCKET = "discussion-images"
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
# 허용할 이미지 형식 → 저장할 확장자
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}

with engine.begin() as conn:
    # 공개(public) 버킷 생성: 누구나 이미지 주소로 볼 수 있음. 크기/형식 제한은 Storage 서버에서도 한 번 더 검사
    conn.execute(text("""
        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (:id, :id, true, :size, :types)
        on conflict (id) do nothing
    """), {"id": IMAGE_BUCKET, "size": MAX_IMAGE_SIZE, "types": list(IMAGE_TYPES)})

    # 업로드 정책: 로그인한 사용자가 "자기 id 폴더" 안에만 올릴 수 있다 (예: <user_id>/abc.jpg)
    conn.execute(text(f"""
        do $$ begin
            if not exists (select 1 from pg_policies
                           where schemaname = 'storage' and tablename = 'objects'
                             and policyname = 'discussion images: owner upload') then
                create policy "discussion images: owner upload" on storage.objects
                for insert to authenticated
                with check (bucket_id = '{IMAGE_BUCKET}'
                            and (storage.foldername(name))[1] = auth.uid()::text);
            end if;
        end $$;
    """))

# 요청마다 세션을 열고, 끝나면 닫는 함수 finally는 성공해도 닫고 실패해도 닫는다?
def get_db():
    # engine에 연결된 Session 객체를 만들어서 db 변수에 넣어라 engine은 DB 연결 정보,
    db = Session(bind=engine)
    try:
        # FastAPI야! db(Session 객체)를 가져다 써!
        yield db
    finally:
        db.close()

app = FastAPI()

@app.get("/")
def read_home():
    return {
        "hello": "world"
    }

def save_profile(db: Session, user, username, provider):
    # get은 하나만 가져온다 
    profile = db.get(Profile, user.id)
    if profile is None:
        # 빈 문자열("")은 None(NULL)으로 저장
        # - 카카오는 이메일이 없으면 ""나 None으로 온다
        # - username을 ""로 저장하면 unique 제약 때문에 두 번째 사람부터 에러가 난다
        profile = Profile(
            id=user.id,
            email=user.email or None,
            username=username or None,
            provider=provider,
        )
        db.add(profile)
        try:
            db.commit()
        except IntegrityError:
            # 닉네임이 이미 다른 사람이 쓰고 있으면(unique) 닉네임 없이 저장
            db.rollback()
            profile.username = None
            db.add(profile)
            db.commit()
        db.refresh(profile)
    return profile

# 회원가입을 고객한테 받아서 date로 옮겨야 하니까 post
@app.post("/signup")
# db 변수에는 Session 객체가 들어있고 Session은 데이터 베이스 작업도구다,"get_db() 실행해서 나온 값을 db에 넣어주세요!"
def signup(form: EmailForm, db: Session=Depends(get_db)):
    # auth 안에 sign_up이라는 메서드가 있다 이걸 이용하면 내가 너한테 어떠한 값을 주겠다 
    res = supabase.auth.sign_up({
        "email": form.email,
        "password": form.password
    })
    # user는 res에 이메일이랑 패스워드다 
    profile = save_profile(db, res.user, form.username, "email")
    return {
        "id": profile.id,
        "email": profile.email,
        "username": profile.username
    }


# 로그인 post가 메소드이면 실행이 된다 
# supabase에서 이렇게 적는걸로 로그인이 되게 제공한다 
@app.post("/login")
# 클래스 EmailForm
def login(form: EmailForm):
    try:
        #auth안에 sign_in_with_password메서드가 있다 
        res = supabase.auth.sign_in_with_password({
            "email": form.email,
            "password": form.password
        })
    except:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")
    # 맞으면
    return {
        "access_token": res.session.access_token
    }

@app.get("/profiles")
def read_profiles(db: Session = Depends(get_db)):
    profiles = db.query(Profile).all()
    return [
        {"id": profile.id, 
         "email":profile.email, 
         "username": profile.username, 
         "provider": profile.provider
         } for profile in profiles
    ]

#HTTPBearer 객체를 만들었따
bearer = HTTPBearer()
# 로그인 안 해도 되는 API용 (토큰이 없으면 None)
bearer_optional = HTTPBearer(auto_error=False)

def profile_from_token(token: str, db: Session) -> Profile:
    # supabase에 auth속성 안에 get_user라는 메소드
    try:
        user = supabase.auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="토큰이 잘못되었습니다.")
    profile = db.get(Profile, user.id)
    if profile is None:
        raise HTTPException(status_code=401, detail="회원 정보가 없습니다.")
    return profile

# 로그인 필수
def get_current_profile(cred: HTTPAuthorizationCredentials = Depends(bearer),
                        db: Session = Depends(get_db)) -> Profile:
    return profile_from_token(cred.credentials, db)

# 로그인 선택 (좋아요 눌렀는지 표시용)
def get_optional_profile(cred: HTTPAuthorizationCredentials | None = Depends(bearer_optional),
                         db: Session = Depends(get_db)) -> Profile | None:
    if cred is None:
        return None
    try:
        return profile_from_token(cred.credentials, db)
    except HTTPException:
        return None

@app.get("/me")
def me(profile: Profile = Depends(get_current_profile)):
    return {
        "id": profile.id,
        "username": profile.username,
        "email": profile.email,
        "provider": profile.provider
    }

# 카카오 로그인
@app.get("/login/kakao")
def login_kakao():
    res = supabase.auth.sign_in_with_oauth({
        "provider": "kakao",
        "options":{"redirect_to": "http://127.0.0.1:8000/auth/callback"}
    })
    return RedirectResponse(res.url)

# 구글 로그인 (카카오와 같은 방식, provider만 google)
@app.get("/login/google")
def login_google():
    res = supabase.auth.sign_in_with_oauth({
        "provider": "google",
        "options":{"redirect_to": "http://127.0.0.1:8000/auth/callback"}
    })
    return RedirectResponse(res.url)

# 소셜 로그인(카카오/구글) 후 Supabase가 ?code=... 를 붙여서 여기로 보내준다
@app.get("/auth/callback")
def auth_callback(code: str | None = None, error_description: str | None = None,
                  db: Session = Depends(get_db)):
    if code is None:
        # 사용자가 동의를 취소했거나 설정 오류
        return RedirectResponse(f"{FRONTEND_URL}/#error={error_description or 'login_failed'}")

    try:
        # code를 세션(토큰)으로 교환 (PKCE: /login/kakao 때 저장해둔 verifier를 사용)
        res = supabase.auth.exchange_code_for_session({"auth_code": code})
    except Exception:
        return RedirectResponse(f"{FRONTEND_URL}/#error=login_failed")

    user = res.user
    # 어디로 로그인했는지 (kakao / google)
    provider = (user.app_metadata or {}).get("provider", "oauth")
    # 카카오 닉네임 등 (없을 수도 있음)
    meta = user.user_metadata or {}
    username = meta.get("nickname") or meta.get("name") or meta.get("full_name")

    # 카카오는 이메일이 없을 수 있다 → save_profile 안에서 email=None으로 저장됨
    save_profile(db, user, username, provider)

    # 토큰은 #(해시)로 넘긴다 → 서버 로그에 남지 않음
    return RedirectResponse(f"{FRONTEND_URL}/#access_token={res.session.access_token}")

# =====================================================================
# 토론(discussions) CRUD
# =====================================================================

def author_dict(profile: Profile | None):
    if profile is None:
        return None
    return {"id": profile.id, "username": profile.username, "provider": profile.provider}

def discussion_dict(d: Discussion, like_count: int, liked: bool, full: bool = False,
                    comment_count: int = 0):
    return {
        "id": d.id,
        "title": d.title,
        # 목록에서는 앞부분만 보내고, 상세에서는 전체를 보낸다
        "content": d.content if full else d.content[:200],
        "tags": d.tags or [],
        "image_url": d.image_url,
        "author": author_dict(d.author),
        "like_count": like_count,
        "liked": liked,
        "comment_count": comment_count,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }

def like_info(db: Session, ids: list[int], profile: Profile | None):
    # 글별 좋아요 수 {글id: 개수}
    counts = dict(
        db.query(DiscussionLike.discussion_id, func.count())
        .filter(DiscussionLike.discussion_id.in_(ids))
        .group_by(DiscussionLike.discussion_id)
        .all()
    ) if ids else {}
    # 내가 좋아요 누른 글 id 들
    liked = set()
    if profile is not None and ids:
        liked = {
            row[0] for row in db.query(DiscussionLike.discussion_id)
            .filter(DiscussionLike.user_id == profile.id, DiscussionLike.discussion_id.in_(ids))
        }
    return counts, liked

def comment_counts(db: Session, ids: list[int]) -> dict[int, int]:
    # 글별 댓글 수 {글id: 개수}
    if not ids:
        return {}
    return dict(
        db.query(Comment.discussion_id, func.count())
        .filter(Comment.discussion_id.in_(ids))
        .group_by(Comment.discussion_id)
        .all()
    )

# 글 목록을 응답 형태로 (좋아요 수, 내 좋아요 여부, 댓글 수 포함)
def discussions_out(db: Session, items: list[Discussion], profile: Profile | None, full: bool = False):
    ids = [d.id for d in items]
    likes, liked = like_info(db, ids, profile)
    comments = comment_counts(db, ids)
    return [
        discussion_dict(d, likes.get(d.id, 0), d.id in liked, full, comments.get(d.id, 0))
        for d in items
    ]

def get_discussion_or_404(db: Session, discussion_id: int) -> Discussion:
    d = db.get(Discussion, discussion_id)
    if d is None:
        raise HTTPException(status_code=404, detail="토론을 찾을 수 없습니다.")
    return d

def check_owner(d: Discussion, profile: Profile):
    if d.author_id != profile.id:
        raise HTTPException(status_code=403, detail="작성자만 수정/삭제할 수 있습니다.")

# 목록 (Read) - ?tag=AI 로 태그 필터, ?q=검색어 로 제목/내용 검색
@app.get("/discussions")
def list_discussions(tag: str | None = None, q: str | None = None,
                     db: Session = Depends(get_db),
                     profile: Profile | None = Depends(get_optional_profile)):
    query = db.query(Discussion)
    if tag:
        query = query.filter(Discussion.tags.any(tag))
    if q:
        like = f"%{q}%"
        query = query.filter(Discussion.title.ilike(like) | Discussion.content.ilike(like))
    items = query.order_by(Discussion.created_at.desc()).limit(100).all()

    return discussions_out(db, items, profile)

# 상세 (Read)
@app.get("/discussions/{discussion_id}")
def read_discussion(discussion_id: int, db: Session = Depends(get_db),
                    profile: Profile | None = Depends(get_optional_profile)):
    d = get_discussion_or_404(db, discussion_id)
    return discussions_out(db, [d], profile, full=True)[0]

# 작성 (Create) - 로그인 필요
# 이미지 업로드 → Supabase Storage → 공개 주소 반환 (로그인 필요)
# 글 작성/수정 화면에서 먼저 업로드하고, 받은 url 을 image_url 로 저장한다
@app.post("/uploads/image", status_code=201)
async def upload_image(file: UploadFile = File(...),
                       cred: HTTPAuthorizationCredentials = Depends(bearer),
                       db: Session = Depends(get_db)):
    profile = profile_from_token(cred.credentials, db)

    ext = IMAGE_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(status_code=400, detail="JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.")

    data = await file.read(MAX_IMAGE_SIZE + 1)
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="이미지는 5MB 이하만 올릴 수 있습니다.")
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    # 파일 이름은 겹치지 않게 랜덤으로 (원래 이름의 한글/공백 문제도 피함)
    path = f"{profile.id}/{uuid4().hex}{ext}"

    # 사용자 토큰으로 업로드 → Storage 정책(자기 폴더만 업로드)이 적용된다
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{IMAGE_BUCKET}/{path}",
            content=data,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {cred.credentials}",
                "Content-Type": file.content_type,
                "x-upsert": "false",
            },
        )
    if res.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"이미지 업로드에 실패했습니다. ({res.status_code})")

    return {"url": f"{SUPABASE_URL}/storage/v1/object/public/{IMAGE_BUCKET}/{path}", "path": path}

@app.post("/discussions", status_code=201)
def create_discussion(form: DiscussionForm, db: Session = Depends(get_db),
                      profile: Profile = Depends(get_current_profile)):
    d = Discussion(author_id=profile.id, **form.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return discussion_dict(d, 0, False, full=True)

# 수정 (Update) - 작성자만
@app.put("/discussions/{discussion_id}")
def update_discussion(discussion_id: int, form: DiscussionForm, db: Session = Depends(get_db),
                      profile: Profile = Depends(get_current_profile)):
    d = get_discussion_or_404(db, discussion_id)
    check_owner(d, profile)
    for key, value in form.model_dump().items():
        setattr(d, key, value)
    db.commit()
    db.refresh(d)
    return discussions_out(db, [d], profile, full=True)[0]

# 삭제 (Delete) - 작성자만
@app.delete("/discussions/{discussion_id}", status_code=204)
def delete_discussion(discussion_id: int, db: Session = Depends(get_db),
                      profile: Profile = Depends(get_current_profile)):
    d = get_discussion_or_404(db, discussion_id)
    check_owner(d, profile)
    db.delete(d)
    db.commit()
    return Response(status_code=204)

# 좋아요 토글 - 누르면 추가, 다시 누르면 취소
@app.post("/discussions/{discussion_id}/like")
def toggle_like(discussion_id: int, db: Session = Depends(get_db),
                profile: Profile = Depends(get_current_profile)):
    get_discussion_or_404(db, discussion_id)
    like = db.get(DiscussionLike, (discussion_id, profile.id))
    if like:
        db.delete(like)
    else:
        db.add(DiscussionLike(discussion_id=discussion_id, user_id=profile.id))
    db.commit()
    counts, liked = like_info(db, [discussion_id], profile)
    return {"like_count": counts.get(discussion_id, 0), "liked": discussion_id in liked}


# =====================================================================
# 댓글(discussion_comments) CRUD
# =====================================================================

def comment_dict(c: Comment):
    return {
        "id": c.id,
        "discussion_id": c.discussion_id,
        "content": c.content,
        "author": author_dict(c.author),
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }

def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    c = db.get(Comment, comment_id)
    if c is None:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    return c

def check_comment_owner(c: Comment, profile: Profile):
    if c.author_id != profile.id:
        raise HTTPException(status_code=403, detail="작성자만 수정/삭제할 수 있습니다.")

# 댓글 목록 (Read) - 오래된 순
@app.get("/discussions/{discussion_id}/comments")
def list_comments(discussion_id: int, db: Session = Depends(get_db)):
    get_discussion_or_404(db, discussion_id)
    comments = (
        db.query(Comment)
        .filter(Comment.discussion_id == discussion_id)
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .all()
    )
    return [comment_dict(c) for c in comments]

# 댓글 작성 (Create) - 로그인 필요
@app.post("/discussions/{discussion_id}/comments", status_code=201)
def create_comment(discussion_id: int, form: CommentForm, db: Session = Depends(get_db),
                   profile: Profile = Depends(get_current_profile)):
    get_discussion_or_404(db, discussion_id)
    c = Comment(discussion_id=discussion_id, author_id=profile.id, content=form.content)
    db.add(c)
    db.commit()
    db.refresh(c)
    return comment_dict(c)

# 댓글 수정 (Update) - 작성자만
@app.put("/comments/{comment_id}")
def update_comment(comment_id: int, form: CommentForm, db: Session = Depends(get_db),
                   profile: Profile = Depends(get_current_profile)):
    c = get_comment_or_404(db, comment_id)
    check_comment_owner(c, profile)
    c.content = form.content
    db.commit()
    db.refresh(c)
    return comment_dict(c)

# 댓글 삭제 (Delete) - 작성자만
@app.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db),
                   profile: Profile = Depends(get_current_profile)):
    c = get_comment_or_404(db, comment_id)
    check_comment_owner(c, profile)
    db.delete(c)
    db.commit()
    return Response(status_code=204)
