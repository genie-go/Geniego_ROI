# DB Migrations & Seeding (V378)

Backend uses Alembic + SQLAlchemy.

## Run migrations
Inside backend container (docker-compose):
- migrations are executed automatically by `backend/start.sh`

Manual:
```bash
alembic -c alembic.ini upgrade head
```

## Seed demo data
V378 provides a best-effort seed on start.
You can also call:
- `POST /v378/admin/seed`
