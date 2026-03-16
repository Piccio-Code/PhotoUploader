package database

import "github.com/jackc/pgx/v5/pgxpool"

type Models struct {
	UsersModel UsersModel
}

func NewModels(DB *pgxpool.Pool) Models {
	return Models{
		UsersModel: UsersModel{DB: DB},
	}
}
