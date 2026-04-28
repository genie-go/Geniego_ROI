from celery import Celery
from .config import settings
celery_app = Celery("genie_v236", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.task_default_queue = "genie"
