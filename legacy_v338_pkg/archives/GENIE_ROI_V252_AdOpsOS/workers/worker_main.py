from __future__ import annotations

import time
from workers.job_queue import InMemoryJobQueue
from workers.executor import execute_job

# Simple local worker loop for ZIP distribution.
# For production SaaS: replace queue with Kafka/Redis and add horizontal scaling.

def run_worker(queue: InMemoryJobQueue, poll_interval: float = 1.0):
    while True:
        job = queue.dequeue()
        if job is None:
            time.sleep(poll_interval)
            continue
        ok, msg, meta = execute_job(job.job_type, job.payload)
        if ok:
            job.status = "SUCCEEDED"
            job.error = ""
        else:
            job.status = "FAILED"
            job.error = msg
        # In production: write audit log & metrics
        print(f"[{job.status}] job_id={job.job_id} type={job.job_type} msg={msg} meta={meta}")
