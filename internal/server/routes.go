package server

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.POST("/test", s.HelloWorldHandler)

	return r
}

type Test struct {
	Name string `binding:"Name"`
}

func (s *Server) HelloWorldHandler(c *gin.Context) {
	file, _ := c.FormFile("file")

	log.Println(file.Filename)
	c.SaveUploadedFile(file, "./files/"+file.Filename)
	c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", file.Filename))
}
