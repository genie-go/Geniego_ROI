
package main

import (
  "net/http"
  "github.com/gin-gonic/gin"
)

func roleAllowed(c *gin.Context, required string) bool {
  role := c.GetHeader("X-Role")
  if role == "admin" { return true }
  if required == "viewer" && role == "viewer" { return true }
  if required == "operator" && role == "operator" { return true }
  return false
}

func main(){
  r := gin.Default()

  r.GET("/v259/admin", func(c *gin.Context){
    html := `<html><body><h1>GENIE_ROI V259 Admin</h1>
    <ul>
      <li>/v259/metrics</li>
      <li>/v259/workflows/run</li>
    </ul>
    </body></html>`
    c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
  })

  r.GET("/v259/metrics", func(c *gin.Context){
    c.String(200, "genie_outbox_pending 0
genie_outbox_dead 0
")
  })

  r.POST("/v259/workflows/run", func(c *gin.Context){
    if !roleAllowed(c, "operator"){
      c.JSON(403, gin.H{"error":"forbidden"})
      return
    }
    c.JSON(200, gin.H{"status":"accepted (v259)"})
  })

  r.Run(":8080")
}
