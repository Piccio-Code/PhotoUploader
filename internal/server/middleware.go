package server

import (
	"context"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
	"strings"
)

func (s *Server) AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userC, ok := c.Get(UserKey)

		if !ok {
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		user, ok := userC.(*auth.UserRecord)

		if !ok {
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		if roleC, ok := user.CustomClaims["role"]; ok {
			role, ok := roleC.(string)

			if !ok {
				s.infoLog.Println("role conversion problem")
				s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
				c.Abort()
				return
			}

			if role != "admin" {
				s.infoLog.Println("admin auth problem")
				s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

func (s *Server) EditorMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userC, ok := c.Get(UserKey)

		if !ok {
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		user, ok := userC.(*auth.UserRecord)

		if !ok {
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		if roleC, ok := user.CustomClaims["role"]; ok {
			role, ok := roleC.(string)

			if !ok {
				s.infoLog.Println("role conversion problem")
				s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
				c.Abort()
				return
			}

			if role != "admin" && role != "editor" {
				s.infoLog.Println("role auth problem, the role isn't admin or editor")
				s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

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

			c.Set(UserKey, user)
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

		user, err := s.authClient.GetUser(context.Background(), token.UID)

		if err != nil {
			s.infoLog.Println(err)
			s.Fail(c, http.StatusUnauthorized, "Unauthorized User")
			c.Abort()
			return
		}

		c.Set(UserKey, user)
		c.Next()
	}
}
