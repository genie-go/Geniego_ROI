DB migrations are in `db/migrations`.

For production you should use a migration tool (golang-migrate, Flyway, Liquibase).
For local dev you can apply manually:

```bash
docker compose exec -T postgres psql -U genie -d genie < db/migrations/0001_init.sql
```
