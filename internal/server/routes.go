package server

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"net/http"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4173", "http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Use(MetricsMiddleware())

	v1 := r.Group("/api/v1")

	{
		protected := v1.Group("")
		{
			protected.Use(s.AuthMiddleware())

			s.registerUserRoute(protected)
			protected.GET("/metrics", gin.WrapH(promhttp.Handler()))

		}

		public := v1.Group("")
		{
			public.Static("/static", "./photos")
			s.registerPhotosRoute(public)
			s.registerSectionsRoute(public)
		}

	}

	return r
}
