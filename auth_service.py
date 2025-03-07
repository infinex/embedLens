from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

# Dummy user authentication
USERS = {"user1": "password123"}

@app.post("/auth")
async def authenticate(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")

    if USERS.get(username) == password:
        return {"authorized": True}
    
    raise HTTPException(status_code=403, detail="Unauthorized")