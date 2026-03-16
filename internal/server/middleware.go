package server

import (
	"context"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
	"strings"
)

func (s *Server) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if gin.Mode() != "release" {
			user, err := s.authClient.GetUser(context.Background(), os.Getenv("UID_TEST_USER"))

			if err != nil {
				s.infoLog.Println(err)
				s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
				c.Abort()
				return
			}

			log.Println(user.UserInfo)

			log.Println(user.CustomClaims)

			c.Next()
			return
		}

		idToken := c.GetHeader("Authorization")
		idToken, ok := strings.CutPrefix(idToken, "Bearer ")

		if !ok || idToken == "" {
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		token, err := s.authClient.VerifyIDToken(context.Background(), idToken)
		if err != nil {
			s.infoLog.Println(err)
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		log.Printf("Verified ID token: %v\n", token)
		c.Next()
	}
}
