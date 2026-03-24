from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Any, List
import time
import uuid


@dataclass
class Job:
    job_id: str
    job_type: str
    payload: Dict[str, Any]
    created_at: float = field(default_factory=lambda: time.time())
    status: str = "PENDING"  # PENDING | RUNNING | SUCCEEDED | FAILED
    error: str = ""


class InMemoryJobQueue:
    def __init__(self):
        self._jobs: List[Job] = []

    def enqueue(self, job_type: str, payload: Dict[str, Any]) -> Job:
        job = Job(job_id=str(uuid.uuid4()), job_type=job_type, payload=payload)
        self._jobs.append(job)
        return job

    def dequeue(self) -> Job | None:
        for j in self._jobs:
            if j.status == "PENDING":
                j.status = "RUNNING"
                return j
        return None

    def list_jobs(self) -> List[Job]:
        return list(self._jobs)
