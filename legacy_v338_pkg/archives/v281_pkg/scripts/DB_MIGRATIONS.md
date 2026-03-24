Apply migrations (local dev):

```bash
docker compose exec -T postgres psql -U genie -d genie < db/migrations/0001_init.sql
```

For production, use a migration tool (golang-migrate/Flyway/Liquibase).
