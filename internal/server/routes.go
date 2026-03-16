package server

import (
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"log"
	"net/http"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Use(MetricsMiddleware())

	v1 := r.Group("/api/v1")

	{
		v1.GET("/metrics", gin.WrapH(promhttp.Handler()))

		protected := v1.Group("")
		{
			protected.Use(s.AuthMiddleware())

			protected.POST("/test", s.HelloWorldHandler)
		}

	}

	return r
}

func (s *Server) HelloWorldHandler(c *gin.Context) {

	file, err := c.FormFile("file")

	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "Error Retrieving The File From Body")
		return
	}

	log.Println(file.Filename)
	err = c.SaveUploadedFile(file, "./files/"+file.Filename)

	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "Error Uploading The File")
		return
	}
	c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", file.Filename))
}
