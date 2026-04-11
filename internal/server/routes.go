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
		AllowOrigins:     []string{"http://localhost:4173", "http://localhost:3000"},
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

			s.registerUserRoute(protected)
			s.registerSectionsRoute(protected)
		}

		public := v1.Group("")
		{
			public.Static("/static", "./photos")
			s.registerPhotosRoute(public)
		}

	}

	return r
}
