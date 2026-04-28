package db

import (
  "context"
  "fmt"
  "io/fs"
  "os"
  "path/filepath"
  "sort"
  "strings"
)

func (d *DB) Migrate(ctx context.Context, migrationsDir string) error {
  if migrationsDir == "" {
    migrationsDir = "db/migrations"
  }
  if _, err := d.Pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`); err != nil {
    return err
  }

  files := []string{}
  err := filepath.WalkDir(migrationsDir, func(path string, de fs.DirEntry, err error) error {
    if err != nil { return err }
    if de.IsDir() { return nil }
    if strings.HasSuffix(strings.ToLower(de.Name()), ".sql") {
      files = append(files, path)
    }
    return nil
  })
  if err != nil { return err }

  sort.Strings(files)
  for _, f := range files {
    base := filepath.Base(f)
    var exists int
    if err := d.Pool.QueryRow(ctx, `SELECT COUNT(1) FROM schema_migrations WHERE filename=$1`, base).Scan(&exists); err != nil {
      return err
    }
    if exists > 0 { continue }

    b, err := os.ReadFile(f)
    if err != nil { return err }
    sql := string(b)
    if strings.TrimSpace(sql) == "" { continue }

    if _, err := d.Pool.Exec(ctx, sql); err != nil {
      return fmt.Errorf("migration %s failed: %w", base, err)
    }
    if _, err := d.Pool.Exec(ctx, `INSERT INTO schema_migrations(filename) VALUES($1)`, base); err != nil {
      return err
    }
  }
  return nil
}
