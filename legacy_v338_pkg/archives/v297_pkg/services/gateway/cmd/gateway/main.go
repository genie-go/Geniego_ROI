package main

import (
  "context"
  "log"
  "net/http"
  "os"
  "time"

  "github.com/gin-gonic/gin"
  "genie_roi/gateway/internal/config"
  "genie_roi/gateway/internal/db"
  "genie_roi/gateway/internal/httpapi"
  "genie_roi/gateway/internal/outbox"
)

func main() {
  cfg := config.Load()
  pg, err := db.New(cfg)
  if err != nil { log.Fatalf("db: %v", err) }
  defer pg.Close()

  if err := pg.Migrate(context.Background(), "db/migrations"); err != nil { log.Fatalf("migrate: %v", err) }

  worker := outbox.NewWorker(cfg, pg)
  go worker.Run(context.Background())

  r := gin.New()
  r.Use(gin.Recovery())
  r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

  httpapi.RegisterRoutes(r, cfg, pg)

  srv := &http.Server{
    Addr: ":" + cfg.GatewayPort,
    Handler: r,
    ReadHeaderTimeout: 5 * time.Second,
  }

  log.Printf("gateway listening :%s (DRY_RUN=%v)", cfg.GatewayPort, cfg.DryRun)
  if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
    log.Printf("listen: %v", err)
    os.Exit(1)
  }
}
