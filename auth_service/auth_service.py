from fastapi import FastAPI, Request, HTTPException
import json
import logging
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Dummy user authentication (for testing)
USERS = {"user1": "password123"}

# Example token for header-based auth (replace with your actual logic)
VALID_TOKEN = "Bearer mysecrettoken"

@app.post("/auth")
async def authenticate(request: Request):
    logger.info(f"Received request: {request}")

    # Log raw headers for debugging
    headers = dict(request.headers)
    logger.info(f"Request headers: {headers}")

    # Check for Authorization header (common with ext_authz)
    auth_header = headers.get("authorization")
    if auth_header:
        logger.info(f"Found Authorization header: {auth_header}")
        # Example: Expecting "Bearer <token>"
        if auth_header == VALID_TOKEN:
            return {"authorized": True}
        else:
            logger.warning("Invalid or unrecognized token")
            raise HTTPException(status_code=403, detail="Unauthorized")

    # Fallback: Try to parse body (optional, for testing flexibility)
    try:
        body = await request.body()
        logger.info(f"Raw body: {body}")
        if not body:
            logger.warning("No body provided and no valid Authorization header")
            raise HTTPException(status_code=400, detail="No credentials provided")

        data = await request.json()
        logger.info(f"Parsed JSON: {data}")
    except json.JSONDecodeError:
        logger.error("Invalid JSON payload")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=400, detail="Bad request")

    # Validate body contents
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        logger.warning("Missing username or password in request body")
        raise HTTPException(status_code=400, detail="Username and password required")

    if USERS.get(username) == password:
        logger.info(f"User {username} authenticated successfully")
        return {"authorized": True}

    logger.warning(f"Authentication failed for user {username}")
    raise HTTPException(status_code=403, detail="Unauthorized")

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=50051)