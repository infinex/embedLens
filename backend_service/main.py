from fastapi import FastAPI, Request, Header
from typing import Optional

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Backend service is running"}

@app.get("/protected")
async def protected_route(request: Request):
    headers = dict(request.headers)
    return {
        "message": "This is a protected route",
        "all_headers": headers
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8012)