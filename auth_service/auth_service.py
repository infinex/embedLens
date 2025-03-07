from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import jwt
import datetime

# Secret key for signing JWTs
SECRET_KEY = "your_secret_key"

app = FastAPI()

# Dummy user database
USERS = {"user1": "password123"}

class LoginRequest(BaseModel):
    username: str
    password: str

def create_jwt(username: str):
    """Generate a JWT token for the user"""
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

@app.post("/login")
def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    if USERS.get(request.username) == request.password:
        token = create_jwt(request.username)
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/verify")
def verify_token(token: str):
    """Verify JWT token"""
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return {"username": decoded["sub"], "valid": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")