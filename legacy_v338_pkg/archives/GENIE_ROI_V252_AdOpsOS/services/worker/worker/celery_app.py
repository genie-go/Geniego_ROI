from celery import Celery
from .config import settings
celery_app = Celery("genie_v236_worker", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_default_queue = "genie"
celery_app.conf.beat_schedule = {"token-rotation-hourly": {"task": "tasks.rotate_tokens", "schedule": 3600.0, "args": ()}}
