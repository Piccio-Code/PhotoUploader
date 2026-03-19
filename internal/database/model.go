package database

import (
	"errors"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	NotFoundError = errors.New("NOT FOUND")
)

type Models struct {
	SectionsModel SectionsModel
}

func NewModels(DB *pgxpool.Pool) Models {
	return Models{
		SectionsModel: SectionsModel{DB: DB},
	}
}
