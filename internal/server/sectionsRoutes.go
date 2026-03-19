package server

import (
	"PhotoUploader/internal/database"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

func (s *Server) registerSectionsRoute(rg *gin.RouterGroup) {
	sections := rg.Group("/sections")
	{
		write := sections.Group("")
		{
			write.Use(s.AdminMiddleware())

			write.POST("", s.CreateSectionHandler)
			write.PUT("", s.UpdateSectionHandler)
			write.DELETE(":id", s.RemoveSectionHandler)
		}

		read := sections.Group("")
		{
			read.Use(s.EditorMiddleware())

			read.GET("/list", s.ListSectionsHandler)
			read.GET(":id", s.GetSectionHandler)
		}

	}

}

func (s *Server) ListSectionsHandler(c *gin.Context) {

	sections, err := s.models.SectionsModel.List(c.Request.Context())

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting sections form db")
		return
	}

	s.Ok(c, envelop{"sections": sections}, nil)
}
func (s *Server) CreateSectionHandler(c *gin.Context) {

	var newSection database.SectionRequest

	err := c.ShouldBindJSON(&newSection)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error binding the JSON")
		return
	}

	create, err := s.models.SectionsModel.Create(c.Request.Context(), newSection)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error creating the section")
		return
	}

	s.Created(c, envelop{"new_section": create})
}

func (s *Server) GetSectionHandler(c *gin.Context) {

	idParam := c.Param("id")

	id, err := strconv.Atoi(idParam)

	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	section, err := s.models.SectionsModel.Get(c.Request.Context(), id)

	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting the section form DB")
		return
	}

	s.Created(c, envelop{"section": section})
}

func (s *Server) UpdateSectionHandler(c *gin.Context) {

	var newSection database.SectionRequest

	err := c.ShouldBindJSON(&newSection)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error binding the JSON")
		return
	}

	err = s.models.SectionsModel.Update(c.Request.Context(), newSection)

	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error updating the section form DB")
		return
	}

	s.Updated(c)
}

func (s *Server) RemoveSectionHandler(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.Atoi(idParam)

	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	err = s.models.SectionsModel.Delete(c.Request.Context(), id)

	if err != nil {

		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Println(err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	s.Delete(c)
}
