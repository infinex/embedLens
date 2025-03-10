import os
import redis
from rq import Worker, Queue, Connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

listen = ['embeddings']

redis_conn = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)
)

if __name__ == '__main__':
    logger.info("Starting worker...")
    try:
        with Connection(redis_conn):
            worker = Worker(list(map(Queue, listen)))
            worker.work()
    except Exception as e:
        logger.error(f"Worker failed: {str(e)}")