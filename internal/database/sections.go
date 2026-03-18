package database

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

type sections struct {
	DB *pgxpool.Pool
}

type sectionDB struct {
	Id        int
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type sectionRequest struct {
	Id   int    `json:"id,omitempty"`
	Name string `json:"name,omitempty" binding:"required"`
}

type sectionResponse struct {
	Id        int       `json:"id,omitempty"`
	Name      string    `json:"name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *sections) List(ctx context.Context) ([]sectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `SELECT id, name, created_at, updated_at FROM sections`

	rows, err := s.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []sectionResponse
	for rows.Next() {
		var sec sectionResponse
		err := rows.Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
		if err != nil {
			return nil, err
		}
		result = append(result, sec)
	}

	return result, nil
}

func (s *sections) Create(ctx context.Context, newSection sectionRequest) (sectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
        INSERT INTO sections (name, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id, name, created_at, updated_at`

	var sec sectionResponse
	err := s.DB.QueryRow(ctx, query, newSection.Name).
		Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
	if err != nil {
		return sectionResponse{}, err
	}

	return sec, nil
}

func (s *sections) Get(ctx context.Context, id int) (sectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `SELECT id, name, created_at, updated_at FROM sections WHERE id = $1`

	var sec sectionResponse
	err := s.DB.QueryRow(ctx, query, id).
		Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
	if err != nil {
		return sectionResponse{}, err
	}

	return sec, nil
}

func (s *sections) Update(ctx context.Context, newSection sectionRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
        UPDATE sections
        SET name = $1, updated_at = NOW()
        WHERE id = $2`

	_, err := s.DB.Exec(ctx, query, []interface{}{newSection.Name, newSection.Id}...)
	return err
}

func (s *sections) Delete(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `DELETE FROM sections WHERE id = $1`

	_, err := s.DB.Exec(ctx, query, id)
	return err
}
