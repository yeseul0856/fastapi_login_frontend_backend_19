from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, Session
# pydantic은 리액트에서 데이터를 요청을 받을때 웹브라우저에서 적어서 클릭을 하게 되면 그 데이터가 우리한테 오겠죠 그 
# 데이터 타입이 맞는지 검사하는 라이브러리
from pydantic import BaseModel
from supabase import create_client, ClientOptions
#fastapi안에 있는 security라는 모듈?
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# 주소를 만나면 다른 사이트로 바로 연결해준다 
from fastapi.responses import RedirectResponse

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
    username = Column(String(50), unique=True, index=True)
    email = Column(String(120))
    # 어디로 로그인했는지 provider: google이면 구글 로그인했다  
    provider = Column(String(50))

# 회원가입할때 받을것
class EmailForm(BaseModel):
    # username이 없어도 되겠금 빈값을 디폴트로 설정함, id를 email로 하겠습니다 
    username: str = ""
    email: str
    password: str

# 테이블이 없으면 생성, 모델에 정의한 테이블들을 데이터베이스에 생성해줘
Base.metadata.create_all(bind=engine)

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
        profile = Profile(id=user.id, email=user.email, username=username, provider=provider)
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

@app.get("/me")
def me(cred: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    # supabase에 auth속성 안에 get_user라는 메소드
    # 맞으면 try
    try:
        user = supabase.auth.get_user(cred.credentials).user
    # 틀리면 except
    except:
        raise HTTPException(status_coe=401, detail="토큰이 잘못되었습니다.")


    profile = db.get(Profile, user.id)

    if profile is None:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")

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