package database

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

type UsersModel struct {
	DB *pgxpool.Pool
}

type User struct {
	UID    string `json:"uid,omitempty" binding:"required"`
	RoleId int    `json:"role_id,omitempty" binding:"required"`
}

type UserResponse struct {
	UID    string `json:"uid,omitempty"`
	RoleId string `json:"role_id,omitempty"`
}

func (u *UsersModel) List(ctx context.Context) (users []UserResponse, err error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	query := `
		SELECT u.uid, r.role
		FROM users u
		JOIN user_roles r ON u.role_id = r.id
		`

	rows, err := u.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var user UserResponse

		err = rows.Scan(
			&user.UID,
			&user.RoleId,
		)
		if err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	return users, rows.Err()
}

func (u *UsersModel) Get(ctx context.Context, uid string) (user UserResponse, err error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	query := `
		SELECT u.uid, r.role
		FROM users u
		JOIN user_roles r ON u.role_id = r.id
		WHERE u.uid = $1
		`

	args := []interface{}{uid}

	err = u.DB.QueryRow(ctx, query, args...).Scan(
		&user.UID,
		&user.RoleId,
	)

	return user, err
}

func (u *UsersModel) Create(ctx context.Context, user User) error {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	query := `
		INSERT INTO users (uid, role_id)
		VALUES ($1, $2)
		`

	args := []interface{}{
		user.UID,
		user.RoleId,
	}

	_, err := u.DB.Exec(ctx, query, args...)
	return err
}

func (u *UsersModel) Update(ctx context.Context, user User) error {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	query := `
		UPDATE users
		SET role_id = $1
		WHERE uid = $2
		`

	args := []interface{}{
		user.RoleId,
		user.UID,
	}

	_, err := u.DB.Exec(ctx, query, args...)
	return err
}

func (u *UsersModel) Delete(ctx context.Context, uid string) error {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	query := `
		DELETE FROM users
		WHERE uid = $1
		`

	args := []interface{}{uid}

	_, err := u.DB.Exec(ctx, query, args...)
	return err
}
