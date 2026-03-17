package server

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

type envelop map[string]interface{}

type UserKeyString string

const UserKey = UserKeyString("userKey")

type Response struct {
	Success bool    `json:"success"`
	Data    envelop `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
	Meta    *Meta   `json:"meta,omitempty"`
}

type Meta struct {
	Page       int `json:"page,omitempty"`
	PerPage    int `json:"per_page,omitempty"`
	Total      int `json:"total,omitempty"`
	TotalPages int `json:"total_pages,omitempty"`
}

func (s *Server) Ok(c *gin.Context, data envelop, meta *Meta) {
	c.IndentedJSON(http.StatusOK, Response{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func (s *Server) Created(c *gin.Context, data envelop) {
	c.IndentedJSON(http.StatusCreated, Response{
		Success: true,
		Data:    data,
	})
}

func (s *Server) Updated(c *gin.Context) {
	c.IndentedJSON(http.StatusNoContent, Response{
		Success: true,
	})
}

func (s *Server) Delete(c *gin.Context) {
	c.IndentedJSON(http.StatusNoContent, Response{
		Success: true,
	})
}

func (s *Server) Fail(c *gin.Context, status int, message string) {
	c.IndentedJSON(status, Response{
		Success: false,
		Error:   message,
	})
}
