from redis import Redis
import json
from typing import Dict, Any, Optional
import os

class ProgressTracker:
    def __init__(self):
        self.redis = Redis(
            host=os.getenv("REDIS_HOST", "redis"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            decode_responses=True
        )
        self.key_prefix = "progress:"
        self.expiry = 86400  # 24 hours

    def set_progress(self, task_id: str, progress: Dict[str, Any]) -> None:
        """Set progress for a task"""
        key = f"{self.key_prefix}{task_id}"
        self.redis.setex(
            key,
            self.expiry,
            json.dumps(progress)
        )

    def get_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get progress for a task"""
        key = f"{self.key_prefix}{task_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None

    def update_progress(self, task_id: str, **kwargs) -> None:
        """Update specific fields in the progress"""
        current = self.get_progress(task_id) or {}
        current.update(kwargs)
        self.set_progress(task_id, current)

progress_tracker = ProgressTracker()