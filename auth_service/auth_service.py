from fastapi import FastAPI, Request, HTTPException, Response
import json
import logging
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Extended test users
USERS = {
    "user1": "password123",
    "alice": "alice123",
    "bob": "bob123"
}

# Example token for header-based auth
VALID_TOKEN = "Bearer mysecrettoken"

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def authenticate(request: Request, path: str):
    logger.info(f"Received request for path: {path}")
    logger.info(f"Received request: {request}")

    headers = dict(request.headers)
    logger.info(f"Request headers: {headers}")

    # Check for Authorization header
    auth_header = headers.get("authorization")
    if auth_header:
        logger.info(f"Found Authorization header: {auth_header}")
        if auth_header == VALID_TOKEN:
            response = Response(content=json.dumps({"authorized": True}))
            response.headers["x-user-id"] = "token-user"
            print(response.headers)
            return response

    # Try to parse body for username/password auth
    try:
        body = await request.body()
        if not body:
            logger.warning("No body provided and no valid Authorization header")
            raise HTTPException(status_code=400, detail="No credentials provided")

        data = await request.json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            logger.warning("Missing username or password in request body")
            raise HTTPException(status_code=400, detail="Username and password required")

        if USERS.get(username) == password:
            logger.info(f"User {username} authenticated successfully")
            response = Response(content=json.dumps({"authorized": True}))
            response.headers["x-user-id"] = username
            return response

        logger.warning(f"Authentication failed for user {username}")
        raise HTTPException(status_code=403, detail="Unauthorized")

    except json.JSONDecodeError:
        logger.error("Invalid JSON payload")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=400, detail="Bad request")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=50051)