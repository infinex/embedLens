import os
import redis
from rq import Worker, Queue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

listen = ['embeddings']

redis_conn = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379))
)

if __name__ == '__main__':
    logger.info("Starting worker...")
    try:
        worker = Worker([Queue(name, connection=redis_conn) for name in listen])
        worker.work()
    except Exception as e:
        logger.error(f"Worker failed: {str(e)}")