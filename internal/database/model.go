package database

import (
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	NotFoundError = errors.New("NOT FOUND")
	NotUniquePath = errors.New("NOT FOUND")
)

type Models struct {
	SectionsModel SectionsModel
	PhotoModel    PhotoModel
}

func NewModels(DB *pgxpool.Pool) Models {
	return Models{
		SectionsModel: SectionsModel{DB: DB},
		PhotoModel:    PhotoModel{DB: DB},
	}
}
