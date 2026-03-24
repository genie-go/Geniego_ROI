package db

import (
  "context"
  "fmt"
  "time"

  "github.com/jackc/pgx/v5/pgxpool"
  "genie_roi/gateway/internal/config"
)

type DB struct {
  Pool *pgxpool.Pool
}

func New(cfg config.Config) (*DB, error) {
  dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
    cfg.PostgresUser, cfg.PostgresPass, cfg.PostgresHost, cfg.PostgresPort, cfg.PostgresDB)

  c, err := pgxpool.ParseConfig(dsn)
  if err != nil { return nil, err }
  c.MaxConns = 10

  pool, err := pgxpool.NewWithConfig(context.Background(), c)
  if err != nil { return nil, err }

  ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
  defer cancel()
  if err := pool.Ping(ctx); err != nil { return nil, err }

  return &DB{Pool: pool}, nil
}

func (d *DB) Close() { d.Pool.Close() }
