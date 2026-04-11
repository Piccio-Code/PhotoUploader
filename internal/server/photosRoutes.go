package server

import (
	"PhotoUploader/internal/database"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

func (s *Server) registerPhotosRoute(rg *gin.RouterGroup) {
	photos := rg.Group("/photo")

	{
		write := photos.Group("")
		{
			write.Use(s.AuthMiddleware(), s.EditorMiddleware())

			write.POST("", s.CreatePhotoHandler)

			write.PUT("", s.UpdatePhotoHandler)
			write.PUT("/:id/reset", s.ResetDefaultPathHandler)

			write.DELETE("/:id", s.RemovePhotoHandler)
		}

		read := photos.Group("")
		{
			read.GET("/list", s.ListPhotosHandler)
			read.GET("/:id", s.GetPhotoHandler)
		}
	}
}

func (s *Server) CreatePhotoHandler(c *gin.Context) {
	var newPhotoReq database.PhotoRequest

	err := c.ShouldBind(&newPhotoReq)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error binding the Form")
		return
	}

	section, err := s.models.SectionsModel.Get(c.Request.Context(), newPhotoReq.SectionId)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting the section from the db")
		return
	}

	err = SavePhotoAndSetPath(c, &newPhotoReq, section)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error saving the file")
		return
	}

	newPhoto, err := s.models.PhotoModel.Create(c.Request.Context(), newPhotoReq)
	if err != nil {

		if errors.Is(err, database.NotUniquePath) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusBadRequest, "Photo with this name already present in the section")
			return
		}

		if err := os.Remove(newPhotoReq.Path); err != nil {
			s.infoLog.Printf("error: %v", err)
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error creating the db record")
		return
	}

	s.Created(c, envelop{"new_photo": newPhoto})

}

func (s *Server) UpdatePhotoHandler(c *gin.Context) {
	var newPhotoReq database.PhotoRequest

	err := c.ShouldBind(&newPhotoReq)

	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error binding the Form")
		return
	}

	oldPhoto, err := s.models.PhotoModel.Get(c.Request.Context(), newPhotoReq.Id)

	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting the photo form DB")
		return
	}

	section, err := s.models.SectionsModel.Get(c.Request.Context(), newPhotoReq.SectionId)

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

	if newPhotoReq.Photo != nil {
		err := SavePhotoAndSetPath(c, &newPhotoReq, section)

		if err != nil {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusBadRequest, "Error saving the file")
			return
		}

		if oldPhoto.Path != oldPhoto.DefaultPath {
			if err := os.Remove(oldPhoto.Path); err != nil {
				s.infoLog.Printf("error: %v", err)
			}
		}
	}

	if newPhotoReq.Path == "" {
		newPhotoReq.Path = oldPhoto.Path
	}

	if newPhotoReq.AltText == "" {
		newPhotoReq.AltText = oldPhoto.AltText
	}

	reorder := newPhotoReq.Position != 0

	if newPhotoReq.Position == 0 {
		newPhotoReq.Position = oldPhoto.Position
	}

	err = s.models.PhotoModel.Update(c.Request.Context(), newPhotoReq, reorder)
	if err != nil {

		if errors.Is(err, database.NotUniquePath) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusBadRequest, "Photo with this name already present in the section")
			return
		}

		if newPhotoReq.Photo != nil {
			if err := os.Remove(newPhotoReq.Path); err != nil {
				s.infoLog.Printf("error: %v", err)
			}
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error creating the db record")
		return
	}

	s.Updated(c)
}

func (s *Server) ResetDefaultPathHandler(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.Atoi(idParam)
	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	err = s.models.PhotoModel.ResetDefaultPath(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error resetting the path to default")
		return
	}

	s.Updated(c)

}

func (s *Server) RemovePhotoHandler(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.Atoi(idParam)
	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	photo, err := s.models.PhotoModel.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting the photo form DB")
		return
	}

	err = s.models.PhotoModel.Delete(c.Request.Context(), id, photo.Position)
	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error deleting the photo from DB")
		return
	}

	if err := os.Remove(photo.Path); err != nil && !errors.Is(err, os.ErrNotExist) {
		s.infoLog.Printf("error removing file %v", err)
	}

	s.Delete(c)
}

func (s *Server) ListPhotosHandler(c *gin.Context) {
	sectionIdParam := c.Query("section_id")

	sectionId, err := strconv.Atoi(sectionIdParam)
	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the section_id query param")
		return
	}

	photos, err := s.models.PhotoModel.ListBySection(c.Request.Context(), sectionId)
	if err != nil {
		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting photos form db")
		return
	}

	s.Ok(c, envelop{"photos": photos}, nil)
}

func (s *Server) GetPhotoHandler(c *gin.Context) {
	idParam := c.Param("id")

	id, err := strconv.Atoi(idParam)
	if err != nil {
		s.infoLog.Println(err)
		s.Fail(c, http.StatusBadRequest, "error converting the id path param")
		return
	}

	photo, err := s.models.PhotoModel.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, database.NotFoundError) {
			s.infoLog.Printf("error: %v", err)
			s.Fail(c, http.StatusNotFound, "Not Found")
			return
		}

		s.infoLog.Printf("error: %v", err)
		s.Fail(c, http.StatusBadRequest, "Error getting the photo form DB")
		return
	}

	s.Ok(c, envelop{"photo": photo}, nil)
}

func SavePhotoAndSetPath(c *gin.Context, newPhotoReq *database.PhotoRequest, section database.SectionResponse) error {
	if newPhotoReq.PhotoName != "" {
		newPhotoReq.Photo.Filename = newPhotoReq.PhotoName + filepath.Ext(newPhotoReq.Photo.Filename)
	}

	newPhotoReq.Path = filepath.Join("./photos/", section.Name, filepath.Base(newPhotoReq.Photo.Filename))

	err := c.SaveUploadedFile(newPhotoReq.Photo, newPhotoReq.Path)
	if err != nil {
		return err
	}

	return nil
}
