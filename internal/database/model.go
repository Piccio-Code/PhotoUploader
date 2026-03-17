package database

import "github.com/jackc/pgx/v5/pgxpool"

type Models struct {
}

func NewModels(DB *pgxpool.Pool) Models {
	return Models{}
}
