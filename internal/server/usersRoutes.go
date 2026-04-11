package server

import (
	"context"
	"errors"
	"firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
	"net/http"
	"time"
)

type UserResponse struct {
	UID      string `json:"uid,omitempty"`
	Email    string `json:"email,omitempty"`
	PhotoUrl string `json:"photoUrl,omitempty"`
	Role     string `json:"role,omitempty"`
}

func (s *Server) registerUserRoute(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	{
		users.Use(s.AdminMiddleware())
		users.GET("/list", s.ListUsersHandler)

		users.POST(":uid/editor", s.CreateEditorHandler)
		users.DELETE(":uid/editor", s.RemoveEditorHandler)
	}

}

func (s *Server) ListUsersHandler(c *gin.Context) {
	ctx := context.Background()

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)

	defer cancel()

	var users []UserResponse

	iter := s.authClient.Users(ctx, "")
	for {
		userFirebase, err := iter.Next()

		if errors.Is(err, iterator.Done) {
			break
		}

		if err != nil {
			s.infoLog.Println("error listing the user from firebase")
			s.infoLog.Printf("error %v", err)
			s.Fail(c, http.StatusBadRequest, "error listing the user from firebase")
			return
		}

		user, err := s.FromFirebaseUserToResponse(userFirebase.UserRecord)

		if err != nil {
			s.infoLog.Printf("error %v", err)
			s.Fail(c, http.StatusBadRequest, "error extracting user data")
			return
		}

		users = append(users, user)
	}

	s.Ok(c, envelop{"users": users}, nil)
}

func (s *Server) CreateEditorHandler(c *gin.Context) {
	uid := c.Param("uid")
	role := "editor"

	claims := map[string]interface{}{"role": role}
	err := s.authClient.SetCustomUserClaims(context.Background(), uid, claims)
	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error adding the role editor to the user")
		return
	}

	userFirebase, err := s.authClient.GetUser(context.Background(), uid)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error retrieving the user from firebase")
		return
	}

	user, err := s.FromFirebaseUserToResponse(userFirebase)

	if err != nil {
		s.infoLog.Printf("error %v", err)
		s.Fail(c, http.StatusBadRequest, "error extracting user data")
		return
	}

	s.Created(c, envelop{"new_editor": user})
}

func (s *Server) RemoveEditorHandler(c *gin.Context) {
	uid := c.Param("uid")

	claims := map[string]interface{}{}
	err := s.authClient.SetCustomUserClaims(context.Background(), uid, claims)
	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error adding the role editor to the user")
		return
	}

	s.Delete(c)
}

func (s *Server) FromFirebaseUserToResponse(userFirebase *auth.UserRecord) (user UserResponse, err error) {

	roleC, ok := userFirebase.CustomClaims["role"]
	var role string

	if ok {
		role, ok = roleC.(string)

		if !ok {
			return UserResponse{}, errors.New("error converting the role to string")
		}

	}

	user = UserResponse{
		UID:      userFirebase.UID,
		Email:    userFirebase.Email,
		PhotoUrl: userFirebase.PhotoURL,
		Role:     role,
	}

	return user, nil
}
