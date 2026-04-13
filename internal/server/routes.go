package server

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"net"
	"net/http"
	"os"
	"strings"
)

func parseCSVEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func allowedOrigins() []string {
	if fromEnv := parseCSVEnv("ALLOWED_ORIGINS"); len(fromEnv) > 0 {
		return fromEnv
	}

	return []string{
		"http://localhost:4173",
		"http://localhost:3000",
		"http://localhost:3001",
		"https://admin.pasticceriaginella.com",
		"https://pasticceriaginella.com",
		"https://www.pasticceriaginella.com",
	}
}

func allowedHosts() map[string]struct{} {
	hosts := parseCSVEnv("ALLOWED_HOSTS")
	if len(hosts) == 0 {
		hosts = []string{
			"admin.pasticceriaginella.com",
			"api.pasticceriaginella.com",
			"pasticceriaginella.com",
			"www.pasticceriaginella.com",
			"localhost",
			"127.0.0.1",
		}
	}

	result := make(map[string]struct{}, len(hosts))
	for _, h := range hosts {
		result[strings.ToLower(h)] = struct{}{}
	}
	return result
}

func hostGuardMiddleware(allowed map[string]struct{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		host := strings.ToLower(c.Request.Host)

		// Strip optional port from host header.
		if strings.Contains(host, ":") {
			if parsedHost, _, err := net.SplitHostPort(host); err == nil {
				host = parsedHost
			}
		}

		if ip := net.ParseIP(host); ip != nil {
			if _, ok := allowed[host]; !ok {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "host not allowed"})
				return
			}
		}

		if _, ok := allowed[host]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "host not allowed"})
			return
		}

		c.Next()
	}
}

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()
	r.Use(hostGuardMiddleware(allowedHosts()))

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins(),
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
